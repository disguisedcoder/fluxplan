import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicOriginFromRequest } from "@/lib/http/public-origin";

const PUBLIC_PATH_PREFIXES = ["/api", "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes / assets
  if (pathname === "/") return NextResponse.next();
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Protect everything else (study runs require a session/user context)
  const userId = req.cookies.get("fp_userId")?.value;
  if (userId) return NextResponse.next();

  const origin = getPublicOriginFromRequest(req);
  const url = new URL("/", origin);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!.*\\.).*)"], // ignore static files with extensions
};

