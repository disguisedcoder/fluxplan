import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getStudyCookies } from "@/lib/auth/study-session";
import { prisma } from "@/lib/db/prisma";
import { SuggestionsScreen } from "@/components/adaptive/suggestions-screen";

export default async function AnpassungenPage() {
  const { sessionId } = await getStudyCookies();
  const session = sessionId
    ? await prisma.studySession.findUnique({
        where: { id: sessionId },
        select: { variant: true },
      })
    : null;
  const isBaseline = session?.variant === "baseline";

  return (
    <div>
      <PageHeader
        title="Anpassungen"
        subtitle={
          isBaseline
            ? "In der Baseline sind Vorschläge deaktiviert. Du kannst die App ganz normal nutzen."
            : "Vorschläge, Verlauf und Einstellungen an einem Ort. Du behältst die Kontrolle."
        }
      />
      {isBaseline ? (
        <Card className="fp-card">
          <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
            <p>
              Für die Studie startest du zuerst im{" "}
              <span className="font-medium text-foreground">Baseline-Modus</span>. Hier gibt es keine Vorschläge.
            </p>
            <p>
              Wenn du später bewusst zu <span className="font-medium text-foreground">Adaptive</span> wechselst, bleiben
              deine Aufgaben erhalten – dann können Vorschläge auf Basis deiner Nutzung sichtbar werden.
            </p>
            <div className="pt-1">
              <Link href="/einstellungen" className={buttonVariants({ variant: "outline" })}>
                Zum Studienwechsel in den Einstellungen
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <SuggestionsScreen />
      )}
    </div>
  );
}
