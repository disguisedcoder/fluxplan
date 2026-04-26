import { PageHeader } from "@/components/shell/page-header";
import { TasksScreen } from "@/components/tasks/tasks-screen";

export default function AufgabenPage() {
  return (
    <div>
      <PageHeader
        title="Aufgaben"
        subtitle="Alle Aufgaben mit Suche, Filter und Sortierung. Nichts wird automatisch verändert."
      />
      <TasksScreen />
    </div>
  );
}
