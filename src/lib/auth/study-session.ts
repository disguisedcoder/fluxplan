import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const FP_USER_ID_COOKIE = "fp_userId";
export const FP_SESSION_ID_COOKIE = "fp_sessionId";

export async function getStudyCookies() {
  const store = await cookies();
  const userId = store.get(FP_USER_ID_COOKIE)?.value ?? null;
  const sessionId = store.get(FP_SESSION_ID_COOKIE)?.value ?? null;
  return { userId, sessionId };
}

const studyCookieBase = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function setStudyCookies(input: { userId: string; sessionId: string }) {
  const store = await cookies();

  store.set(FP_USER_ID_COOKIE, input.userId, {
    ...studyCookieBase,
    maxAge: 60 * 60 * 24 * 30,
  });

  store.set(FP_SESSION_ID_COOKIE, input.sessionId, {
    ...studyCookieBase,
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * Nur `fp_sessionId` entfernen (z. B. veralteter Wert nach DB-Reset oder gelöschter `StudySession`),
 * während `fp_userId` erhalten bleibt — gleiche Attribute wie beim Setzen, sonst löscht der Browser den Cookie nicht zuverlässig.
 */
export async function clearFpSessionIdCookie() {
  const store = await cookies();
  store.set(FP_SESSION_ID_COOKIE, "", {
    ...studyCookieBase,
    maxAge: 0,
  });
}

/** Beendet die Study-Session im Browser (httpOnly-Cookies löschen). */
export async function clearStudyCookies() {
  const store = await cookies();
  store.set(FP_USER_ID_COOKIE, "", { ...studyCookieBase, maxAge: 0 });
  store.set(FP_SESSION_ID_COOKIE, "", { ...studyCookieBase, maxAge: 0 });
}

/**
 * Logout-Set-Cookie auf einer Route-Handler-`NextResponse` setzen.
 * In Next 16 kann `cookies().set` + `NextResponse.json()` die Lösch-Header verlieren — Browser behält dann die Session.
 */
export function applyStudyLogoutCookies(res: NextResponse): NextResponse {
  res.cookies.set(FP_USER_ID_COOKIE, "", { ...studyCookieBase, maxAge: 0 });
  res.cookies.set(FP_SESSION_ID_COOKIE, "", { ...studyCookieBase, maxAge: 0 });
  return res;
}

