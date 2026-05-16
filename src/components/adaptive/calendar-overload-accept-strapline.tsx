import Link from "next/link";

import { calendarConflictBannerStrapline } from "@/lib/adaptive/suggestion-explanation";

export function CalendarOverloadAcceptStrapline() {
  return (
    <span data-testid="calendar-overload-accept-strapline">
      {calendarConflictBannerStrapline}{" "}
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
