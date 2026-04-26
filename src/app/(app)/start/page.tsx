import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { OnboardingHero } from "@/components/onboarding/onboarding-hero";
import { buttonVariants } from "@/components/ui/button";

export default function StartPage() {
  return (
    <div>
      <PageHeader
        title="Willkommen bei FluxPlan"
        subtitle="Planung zuerst. Anpassungen erst, wenn sie sinnvoll sind."
        right={
          <Link href="/heute" className={buttonVariants({ size: "default" })}>
            Tour starten
          </Link>
        }
      />
      <OnboardingHero />
    </div>
  );
}
