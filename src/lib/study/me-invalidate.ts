/** Client-Event: Cookies/Session-Metadaten haben sich geändert; `/api/me` neu laden. */
export const STUDY_ME_CHANGED_EVENT = "fp:study-me-changed";

export function dispatchStudyMeChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STUDY_ME_CHANGED_EVENT));
}
