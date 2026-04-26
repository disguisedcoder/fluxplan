"use client";

import { useMemo } from "react";
import { ShieldOff, Eye, History } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { AdaptiveRule, AdaptiveSuggestion } from "./types";
import type { Preferences } from "./suggestions-screen";

export function CooldownTab({
  rules,
  preferences,
  suggestions,
}: {
  rules: AdaptiveRule[];
  preferences: Preferences;
  suggestions: AdaptiveSuggestion[];
}) {
  const cooldowns = useMemo(() => extractCooldowns(preferences, rules), [preferences, rules]);
  const recentRejected = useMemo(
    () => suggestions.filter((s) => s.status === "rejected").slice(0, 8),
    [suggestions],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="fp-card">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <ShieldOff className="h-4 w-4 text-muted-foreground" />
            Pausierte Regeln
          </div>
          {cooldowns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aktuell keine Regel pausiert. Wenn du dasselbe zweimal kurz hintereinander
              ablehnst, pausiert FluxPlan die zugehörige Regel automatisch für 14 Tage.
            </p>
          ) : (
            <ul className="space-y-2">
              {cooldowns.map((c) => (
                <li
                  key={c.key}
                  className="rounded-xl border border-border/60 bg-card px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{c.name}</div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                      pausiert
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Aktiv bis {formatDate(c.until)} · Regelschlüssel:{" "}
                    <span className="font-mono">{c.key}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="fp-card">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <History className="h-4 w-4 text-muted-foreground" />
            Was zur Pause geführt hat
          </div>
          {recentRejected.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine abgelehnten Vorschläge. FluxPlan bleibt zurückhaltend.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentRejected.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-border/60 bg-card px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate">{s.title}</div>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(s.respondedAt ?? s.createdAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Regel: <span className="font-mono">{s.ruleKey}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="fp-card-soft lg:col-span-2">
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Was sichtbar bleibt
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>· Pausierte Regeln werden weiterhin gelistet, nur eben ohne Aktion.</li>
            <li>· Du kannst Pausen jederzeit beenden – Regel manuell wieder aktivieren reicht.</li>
            <li>· Verlauf bleibt unverändert. Cooldown verändert keine bestehenden Aufgaben.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function extractCooldowns(prefs: Preferences, rules: AdaptiveRule[]) {
  const out: { key: string; name: string; until: string }[] = [];
  for (const [key, raw] of Object.entries(prefs)) {
    if (!key.startsWith("rule.cooldown.")) continue;
    const ruleKey = key.replace("rule.cooldown.", "");
    const until = readUntil(raw);
    if (!until) continue;
    if (new Date(until).getTime() < Date.now()) continue;
    const rule = rules.find((r) => r.key === ruleKey);
    out.push({ key: ruleKey, name: rule?.name ?? ruleKey, until });
  }
  return out.sort((a, b) => a.until.localeCompare(b.until));
}

function readUntil(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "until" in value) {
    const u = (value as { until?: unknown }).until;
    if (typeof u === "string") return u;
  }
  return null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
