import { NextResponse } from "next/server";

import { clearStudyCookies } from "@/lib/auth/study-session";

export async function POST() {
  await clearStudyCookies();
  return NextResponse.json({ ok: true });
}
