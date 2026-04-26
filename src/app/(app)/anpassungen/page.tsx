import { PageHeader } from "@/components/shell/page-header";
import { SuggestionsScreen } from "@/components/adaptive/suggestions-screen";

export default function AnpassungenPage() {
  return (
    <div>
      <PageHeader
        title="Anpassungen"
        subtitle="Aktive Regeln, Verlauf und Eingriffsstufe an einem Ort. Jede Änderung bleibt sichtbar und reversibel."
      />
      <SuggestionsScreen />
    </div>
  );
}
