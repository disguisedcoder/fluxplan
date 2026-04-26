import { PageHeader } from "@/components/shell/page-header";
import { WeekPlanner } from "@/components/planning/week-planner";

export default function KalenderPage() {
  return (
    <div>
      <PageHeader
        title="Aufgaben & Kalender"
        subtitle="Liste und Zeitbezug greifen sichtbar ineinander. Konflikte werden markiert, nicht autonom aufgelöst."
      />
      <WeekPlanner />
    </div>
  );
}
