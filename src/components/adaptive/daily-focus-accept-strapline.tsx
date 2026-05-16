import Link from "next/link";

export function DailyFocusAcceptStrapline() {
  return (
    <span data-testid="daily-focus-accept-strapline">
      Beim Annehmen werden die überfälligen und heutigen Aufgaben in der To-Do-Liste der Ansicht „Heute“
      rot hervorgehoben.{" "}
      <span className="text-muted-foreground">
        Für weitere Informationen gehe zu{" "}
        <Link
          href="/anpassungen"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Anpassungen
        </Link>
        .
      </span>
    </span>
  );
}
