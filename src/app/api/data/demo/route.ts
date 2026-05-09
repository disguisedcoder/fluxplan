import { NextResponse } from "next/server";
import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { isHttpError } from "@/lib/http/errors";
import { runAdaptiveEngine } from "@/lib/adaptive/adaptiveEngine";
import { getDemoRole, roleFromPseudonym } from "@/lib/demo";
import type { DemoRoleKey } from "@/lib/demo/types";

const DemoSchema = z.object({
  role: z.enum(["familienplanner", "taskplanner", "evalrunner"]).optional(),
  resetFirst: z.boolean().optional(),
});

async function ensureRules() {
  await prisma.adaptiveRule.createMany({
    data: [
      {
        key: "view_preference",
        name: "Ansichtspräferenz",
        description: "Schlägt vor, eine häufig genutzte Ansicht als Startansicht zu setzen.",
        enabled: true,
      },
      {
        key: "reminder_preference",
        name: "Erinnerungs-Präferenz",
        description: "Schlägt bei ähnlichen Aufgaben eine Erinnerung vor, wenn du das oft tust.",
        enabled: true,
      },
      {
        key: "daily_focus",
        name: "Fokusvorschlag",
        description: "Schlägt beim Öffnen der Heute-Ansicht Fokus-Aufgaben vor (ohne automatisch zu priorisieren).",
        enabled: true,
      },
      {
        key: "calendar_conflict",
        name: "Kalender-Konflikthinweis",
        description: "Weist auf mögliche Konflikte mit geplanten Zeitfenstern hin (keine automatische Verschiebung).",
        enabled: true,
      },
      {
        key: "adaptive_task_creation",
        name: "Adaptives Aufgabenformular",
        description: "Hält das Formular zuerst einfach und schlägt Zusatzfelder als Chips vor.",
        enabled: true,
      },
      {
        key: "adaptive_optional_fold",
        name: "Formular: Zusatzfelder einklappen",
        description:
          "Klappt selten genutzte Zusatzfelder beim Anlegen zunächst ein (jederzeit ausklappbar).",
        enabled: true,
      },
      {
        key: "adaptive_optional_unfold",
        name: "Formular: Zusatzfelder wieder ausklappen",
        description:
          "Schlägt vor, eingeklappte Zusatzfelder wieder sichtbar zu machen, wenn sie wieder häufig genutzt werden.",
        enabled: true,
      },
    ],
    skipDuplicates: true,
  });
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const body = await req.json().catch(() => ({}));
    const parsed = DemoSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    await ensureRules();

    const session = sessionId
      ? await prisma.studySession.findUnique({ where: { id: sessionId }, select: { variant: true } })
      : null;
    const isBaseline = session?.variant === "baseline";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pseudonym: true },
    });
    const pseudonym = user?.pseudonym ?? "P??";

    const roleKey: DemoRoleKey = parsed.data.role ?? roleFromPseudonym(pseudonym);
    const resetFirst = parsed.data.resetFirst ?? true;

    const def = getDemoRole(roleKey, new Date());

    if (resetFirst) {
      await prisma.$transaction(async (tx) => {
        await tx.task.deleteMany({ where: { userId } });
        await tx.taskInteraction.deleteMany({ where: { userId } });
        await tx.adaptiveSuggestion.deleteMany({ where: { userId } });
        await tx.userPreference.deleteMany({ where: { userId } });
      });
    }

    // Seed tasks + interactions + preferences (idempotent-ish by title + key).
    await prisma.$transaction(async (tx) => {
      // Baseline must stay baseline: demo should not re-enable suggestions.
      if (isBaseline) {
        await tx.userPreference.upsert({
          where: { userId_key: { userId, key: "adaptive.enabled" } },
          update: { value: { value: false } as unknown as Prisma.InputJsonValue },
          create: { userId, key: "adaptive.enabled", value: { value: false } as unknown as Prisma.InputJsonValue },
        });
      }

      if (def.preferences?.length) {
        for (const p of def.preferences) {
          if (isBaseline && (p.key === "adaptive.enabled" || p.key === "adaptive.interventionLevel")) {
            continue;
          }
          const value =
            p.value === null || p.value === undefined
              ? null
              : typeof p.value === "object"
                ? p.value
                : { value: p.value };
          await tx.userPreference.upsert({
            where: { userId_key: { userId, key: p.key } },
            update: { value: value as Prisma.InputJsonValue },
            create: { userId, key: p.key, value: value as Prisma.InputJsonValue },
          });
        }
      }

      await tx.task.createMany({
        data: def.tasks.map((t) => ({
          userId,
          title: t.title,
          description: t.description ?? null,
          status: TaskStatus.open,
          priority: (t.priority ?? "medium") as TaskPriority,
          dueDate: t.dueDate ?? null,
          reminderAt: t.reminderAt ?? null,
          listName: t.listName ?? null,
          tags: [...(t.tags ?? [])],
          estimatedMinutes: t.estimatedMinutes ?? null,
        })),
        skipDuplicates: true,
      });

      if (def.viewEvents?.length) {
        await tx.taskInteraction.createMany({
          data: def.viewEvents.map((e, idx) => ({
            userId,
            type: "view_changed",
            metadata: { from: e.from ?? null, to: e.to, source: "demo", order: idx } as unknown as Prisma.InputJsonValue,
          })),
        });
      }

      await tx.eventLog.create({
        data: {
          userId,
          sessionId: sessionId ?? null,
          eventType: "demo_seeded",
          screen: "/einstellungen",
          metadata: {
            role: def.key,
            label: def.label,
            taskCount: def.tasks.length,
            resetFirst,
            ...(def.eventLogMetadata ?? {}),
          } as unknown as Prisma.InputJsonValue,
        },
      });
    });

    const tasks = await prisma.task.findMany({
      where: { userId, title: { in: def.tasks.map((t) => t.title) } },
      select: { id: true, title: true },
    });
    const idByTitle = new Map(tasks.map((t) => [t.title, t.id]));

    const evaluations = isBaseline ? [] : (def.evaluations ?? []);
    const results = [];
    for (const ev of evaluations) {
      const taskId = ev.screen === "task_created" ? idByTitle.get(ev.taskTitle) : undefined;
      const r = await runAdaptiveEngine({
        userId,
        screen: ev.screen,
        taskId,
        metadata: ev.metadata,
      });
      results.push({ screen: ev.screen, taskTitle: ev.taskTitle, ...r });
    }

    const final = isBaseline
      ? { createdCount: 0 }
      : await runAdaptiveEngine({
          userId,
          screen: "/heute",
          metadata: { trigger: "demo_seeded" },
        });

    return NextResponse.json({
      ok: true,
      role: def.key,
      createdTasks: def.tasks.length,
      evaluations: results,
      final,
      baseline: isBaseline,
    });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { error: "db_unavailable", hint: "PostgreSQL/DATABASE_URL nicht erreichbar. Starte z. B. `docker compose up -d`." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function isDbUnavailableError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const any = e as { name?: unknown; message?: unknown };
  const name = typeof any.name === "string" ? any.name : "";
  const msg = typeof any.message === "string" ? any.message : "";
  return (
    name.includes("PrismaClientInitializationError") ||
    msg.includes("Can't reach database server") ||
    msg.includes("ECONNREFUSED")
  );
}
