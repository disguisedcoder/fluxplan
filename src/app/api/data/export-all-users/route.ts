import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { isAdminPseudonym } from "@/lib/admin/is-admin";
import {
  adminExportCsvRows,
  buildAdminAllUsersExport,
  type AdminCsvSheet,
} from "@/lib/export/build-user-export";
import { toCsv } from "@/lib/export/csv";
import { isHttpError } from "@/lib/http/errors";

const FormatSchema = z.enum(["json", "csv"]);
const SheetSchema = z.enum([
  "teilnehmer",
  "vorschlaege",
  "vorschlag_reaktionen",
  "interaktionen",
  "sessions",
]);

function exportFilename(ext: string, sheet?: string) {
  const day = new Date().toISOString().slice(0, 10);
  const suffix = sheet ? `-${sheet}` : "";
  return `fluxplan-studie${suffix}-${day}.${ext}`;
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pseudonym: true },
    });
    if (!user || !isAdminPseudonym(user.pseudonym)) {
      return NextResponse.json(
        { error: "forbidden", message: "Nur Admin-Pseudonyme dürfen alle Teilnehmer exportieren." },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const parsedFormat = FormatSchema.safeParse(url.searchParams.get("format"));
    const format: z.infer<typeof FormatSchema> = parsedFormat.success ? parsedFormat.data : "json";
    const parsedSheet = SheetSchema.safeParse(url.searchParams.get("sheet"));
    const sheet: AdminCsvSheet = parsedSheet.success ? parsedSheet.data : "vorschlaege";
    const includeAdmin = url.searchParams.get("includeAdmin") === "true";

    const bundle = await buildAdminAllUsersExport({
      excludeAdminPseudonyms: !includeAdmin,
    });

    if (format === "csv") {
      const csv = toCsv(adminExportCsvRows(bundle, sheet));
      return new NextResponse(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${exportFilename("csv", sheet)}"`,
        },
      });
    }

    return NextResponse.json(bundle, {
      headers: {
        "content-disposition": `attachment; filename="${exportFilename("json")}"`,
      },
    });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
