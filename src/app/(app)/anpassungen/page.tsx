import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
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

  if (isBaseline) {
    redirect("/heute");
  }

  return (
    <div>
      <PageHeader
        title="Anpassungen"
        subtitle="Vorschläge, Verlauf und Einstellungen an einem Ort. Du behältst die Kontrolle."
      />
      <SuggestionsScreen />
    </div>
  );
}
