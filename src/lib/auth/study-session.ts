import { cookies } from "next/headers";

export const FP_USER_ID_COOKIE = "fp_userId";
export const FP_SESSION_ID_COOKIE = "fp_sessionId";

export async function getStudyCookies() {
  const store = await cookies();
  const userId = store.get(FP_USER_ID_COOKIE)?.value ?? null;
  const sessionId = store.get(FP_SESSION_ID_COOKIE)?.value ?? null;
  return { userId, sessionId };
}

export async function setStudyCookies(input: { userId: string; sessionId: string }) {
  const store = await cookies();

  store.set(FP_USER_ID_COOKIE, input.userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  store.set(FP_SESSION_ID_COOKIE, input.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

