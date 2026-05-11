import { NextResponse } from "next/server";

import { applyStudyLogoutCookies } from "@/lib/auth/study-session";

export async function POST() {
  return applyStudyLogoutCookies(NextResponse.json({ ok: true }));
}
