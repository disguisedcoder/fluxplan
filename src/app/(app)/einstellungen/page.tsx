import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SessionCodeInput } from "@/components/study/session-code-input";
import { StudySessionBanner } from "@/components/study/study-session-banner";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { AppearanceCard } from "@/components/settings/appearance-card";

export default function EinstellungenPage() {
  return (
    <div>
      <PageHeader
        title="Einstellungen"
        subtitle="Pseudonym, Eingriffsstufe, Daten-Export und Reset – alles an einem Ort."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <Card className="fp-card">
            <CardContent className="space-y-4 p-5">
              <div>
                <div className="text-sm font-semibold tracking-tight">Pseudonym &amp; Session</div>
                <p className="text-xs text-muted-foreground">
                  FluxPlan speichert keine personenbezogenen Daten. Du arbeitest unter einem frei wählbaren Code.
                </p>
              </div>
              <StudySessionBanner />
              <SessionCodeInput />
            </CardContent>
          </Card>

          <AppearanceCard />

          <Card className="fp-card-soft">
            <CardContent className="space-y-2 p-5">
              <div className="text-sm font-semibold tracking-tight">Datenschutz</div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>· Logging läuft lokal in PostgreSQL. Es wird nichts extern gesendet.</li>
                <li>· Pseudonyme sind frei wählbar und nicht mit echten Identitäten verknüpft.</li>
                <li>· Adaptive Vorschläge greifen erst nach erkennbaren Mustern.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <PreferencesForm />
      </div>
    </div>
  );
}
