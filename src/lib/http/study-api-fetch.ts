/**
 * Zentraler Einstieg für Client → `/api/*`.
 *
 * Relative Pfade wie `/api/me` werden im Browser zu **absoluten URLs** (`origin + path`)
 * aufgelöst. In Next 16 / Turbopack + vielen Re-Renders kann `fetch("/api/…")` sonst
 * sporadisch mit **TypeError: Failed to fetch** scheitern, obwohl der Dev-Server läuft.
 *
 * Cookies: gleiche Origin → Browser schickt `fp_userId` / `fp_sessionId` mit (Default
 * `credentials: "same-origin"`). Kein erzwungenes `credentials`-Merge (s. frühere Regression).
 */
function resolveStudyApiInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof window === "undefined") return input;
  if (typeof input === "string" && input.startsWith("/")) {
    return new URL(input, window.location.origin).href;
  }
  return input;
}

export function studyApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(resolveStudyApiInput(input), init);
}
