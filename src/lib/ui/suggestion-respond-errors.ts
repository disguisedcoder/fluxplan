import { toast } from "sonner";

/** @returns true wenn die Response ein Fehler war (Toast wurde gezeigt). */
export async function reportSuggestionRespondFailure(res: Response): Promise<boolean> {
  if (res.ok) return false;
  let err = "";
  try {
    const j = (await res.json()) as { error?: string };
    err = typeof j.error === "string" ? j.error : "";
  } catch {
    /* ignore */
  }
  const title = "Aktion fehlgeschlagen.";
  if (res.status === 404) {
    toast.error(title, {
      description:
        "Der Vorschlag ist nicht mehr gültig — oft nach „Daten zurücksetzen“ oder wenn die Seite noch einen alten Stand zeigt. Bitte neu laden (F5) und ggf. erneut öffnen.",
    });
    return true;
  }
  if (res.status === 401) {
    toast.error(title, {
      description:
        "Session ungültig oder abgelaufen. Bitte unter Einstellungen eine neue Studien-Session starten.",
    });
    return true;
  }
  toast.error(title, {
    description:
      err === "invalid_request"
        ? "Ungültige Anfrage."
        : "Ein Serverfehler ist aufgetreten. Bitte Seite neu laden und erneut versuchen.",
  });
  return true;
}
