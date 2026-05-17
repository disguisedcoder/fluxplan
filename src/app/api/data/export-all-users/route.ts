import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { isAdminPseudonym } from "@/lib/admin/is-admin";
import { adminExportToXlsxBuffer } from "@/lib/export/admin-export-xlsx";
import {
  adminExportCsvRows,
  buildAdminAllUsersExport,
  toAdminAuswertungExport,
  type AdminCsvSheet,
} from "@/lib/export/build-user-export";
import { toCsv } from "@/lib/export/csv";
import { isHttpError } from "@/lib/http/errors";

const FormatSchema = z.enum(["json", "csv", "xlsx"]);
const SheetSchema = z.enum([
  "teilnehmer",
  "vorschlaege",
  "vorschlag_reaktionen",
  "interaktionen",
  "sessions",
]);
const ProfileSchema = z.enum(["full", "auswertung"]);

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
    const parsedProfile = ProfileSchema.safeParse(url.searchParams.get("profile"));
    const profile: z.infer<typeof ProfileSchema> = parsedProfile.success ? parsedProfile.data : "full";
    const pretty = url.searchParams.get("pretty") === "true";
    const includeAdmin = url.searchParams.get("includeAdmin") === "true";

    const bundle = await buildAdminAllUsersExport({
      excludeAdminPseudonyms: !includeAdmin,
    });

    if (format === "xlsx") {
      const buffer = adminExportToXlsxBuffer(bundle);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename="${exportFilename("xlsx")}"`,
        },
      });
    }

    if (format === "csv") {
      const csv = toCsv(adminExportCsvRows(bundle, sheet));
      return new NextResponse(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${exportFilename("csv", sheet)}"`,
        },
      });
    }

    const jsonBody = profile === "auswertung" ? toAdminAuswertungExport(bundle) : bundle;
    const body = pretty ? JSON.stringify(jsonBody, null, 2) : JSON.stringify(jsonBody);

    return new NextResponse(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${exportFilename(profile === "auswertung" ? "auswertung" : "json")}"`,
      },
    });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
