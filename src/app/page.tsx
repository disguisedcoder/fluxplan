import { SessionCodeInput } from "@/components/study/session-code-input";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">FluxPlan</h1>
        <p className="text-sm text-muted-foreground">
          Starte eine Session, damit deine Daten sauber getrennt sind (wichtig für mehrere parallele Testpersonen).
        </p>
      </div>

      <SessionCodeInput allowGuest />
    </main>
  );
}
