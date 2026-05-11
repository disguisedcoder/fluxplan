import { NextRequest, NextResponse } from "next/server";

import { FP_USER_ID_COOKIE } from "@/lib/auth/study-session";
import { getPublicOriginFromRequest } from "@/lib/http/public-origin";
import { getStartRedirectHref } from "@/lib/nav/resolve-start-redirect";

/**
 * `/start` als Route Handler (GET) statt `page.tsx` mit `redirect()`:
 * Next 16 + Turbopack instrumentiert Server-Component-Seiten mit `performance.measure`;
 * sofortiges `redirect()` kann dort „negative time stamp“ werfen (siehe vercel/next.js#86060).
 */
export async function GET(request: NextRequest) {
  const userId = request.cookies.get(FP_USER_ID_COOKIE)?.value ?? null;
  const href = await getStartRedirectHref(userId);
  const origin = getPublicOriginFromRequest(request);
  return NextResponse.redirect(new URL(href, origin));
}
