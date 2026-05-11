import type { NextRequest } from "next/server";

function withoutTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function forwardedSegment(raw: string | null) {
  return raw?.split(",")[0]?.trim() ?? "";
}

function hostnameFromHostHeader(host: string) {
  if (!host) return null;
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end > 0 ? host.slice(1, end).toLowerCase() : null;
  }
  const beforePort = host.split(":")[0];
  return beforePort ? beforePort.toLowerCase() : null;
}

function isBadRedirectHostname(hostname: string | null) {
  return hostname === "0.0.0.0";
}

/**
 * Öffentliche Origin für absolute Redirects (Route Handler, Middleware).
 * Hinter Proxies (z. B. Railway) ist `request.url` oft die interne Bindung (`0.0.0.0:PORT`).
 */
export function getPublicOriginFromRequest(request: NextRequest): string {
  const explicit = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return withoutTrailingSlash(explicit);

  const xfProto = forwardedSegment(request.headers.get("x-forwarded-proto"));
  const xfHost = forwardedSegment(request.headers.get("x-forwarded-host"));
  if (xfProto && xfHost && !isBadRedirectHostname(hostnameFromHostHeader(xfHost))) {
    return `${xfProto}://${xfHost}`;
  }

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) {
    return `https://${railway}`;
  }

  return new URL(request.url).origin;
}
