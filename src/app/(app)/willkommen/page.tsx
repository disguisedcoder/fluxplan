import Link from "next/link";

import { OnboardingHero } from "@/components/onboarding/onboarding-hero";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getStudyCookies } from "@/lib/auth/study-session";

export default async function WillkommenPage() {
  const { userId } = await getStudyCookies();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Willkommen bei FluxPlan"
        subtitle="Prinzipien und Demo findest du unten. „Start“ in der Sidebar führt immer zu deiner gewählten Standardansicht (Heute, Kalender, Aufgaben, Erstellen)."
        right={
          userId ? (
            <Link href="/start" className={buttonVariants({ size: "default" })}>
              Zur Standardansicht
            </Link>
          ) : (
            <Link href="/einstellungen" className={buttonVariants({ size: "default", variant: "outline" })}>
              Session starten
            </Link>
          )
        }
      />
      <OnboardingHero />
    </div>
  );
}
