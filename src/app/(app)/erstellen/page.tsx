import { PageHeader } from "@/components/shell/page-header";
import { ProgressiveTaskForm } from "@/components/tasks/progressive-task-form";

export default function ErstellenPage() {
  return (
    <div>
      <PageHeader
        title="Neue Aufgabe"
        subtitle="Reduziertes Formular. Zusatzfelder erscheinen nur, wenn du sie willst."
      />
      <ProgressiveTaskForm />
    </div>
  );
}
