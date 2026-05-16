import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import {
  buildUserExportPayload,
  userExportToFlatRows,
} from "@/lib/export/build-user-export";
import { toCsv } from "@/lib/export/csv";
import { isHttpError } from "@/lib/http/errors";

const FormatSchema = z.enum(["json", "csv"]);

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const url = new URL(req.url);
    const parsedFormat = FormatSchema.safeParse(url.searchParams.get("format"));
    const format: z.infer<typeof FormatSchema> = parsedFormat.success ? parsedFormat.data : "json";

    const payload = await buildUserExportPayload({
      userId,
      scope: "active_session",
      activeSessionId: sessionId,
    });

    if (format === "csv") {
      const csv = toCsv(userExportToFlatRows(payload));
      return new NextResponse(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": "attachment; filename=\"fluxplan-export.csv\"",
        },
      });
    }

    return NextResponse.json(payload);
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
