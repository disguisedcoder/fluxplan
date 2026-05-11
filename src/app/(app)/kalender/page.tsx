import { PageHeader } from "@/components/shell/page-header";
import { WeekPlanner } from "@/components/planning/week-planner";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function KalenderPage() {
  return (
    <div>
      <PageHeader
        title="Kalender"
        subtitle="Monats- oder Wochenansicht per Umschalter. Klick auf eine Aufgabe öffnet die Bearbeitung. Konflikte werden markiert, nicht autonom aufgelöst."
        right={
          <Link href="/erstellen" className={buttonVariants()}>
            Neue Aufgabe (mit Zeit)
          </Link>
        }
      />
      <WeekPlanner />
    </div>
  );
}
