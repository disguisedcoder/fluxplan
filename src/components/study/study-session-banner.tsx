"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SessionLogoutButton } from "@/components/study/session-logout-button";
import { STUDY_ME_CHANGED_EVENT } from "@/lib/study/me-invalidate";

type MeResponse = {
  user: { id: string; pseudonym: string; studyModeEnabled: boolean } | null;
  session: { id: string; sessionCode: string; startedAt: string; variant?: string | null } | null;
  isAdmin?: boolean;
};

export function StudySessionBanner() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setMe(data))
        .catch(() => setMe({ user: null, session: null }));
    }
    load();
    window.addEventListener(STUDY_ME_CHANGED_EVENT, load);
    return () => window.removeEventListener(STUDY_ME_CHANGED_EVENT, load);
  }, []);

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-medium">Aktive Session</div>
          <div className="text-muted-foreground">
            {me?.user ? (
              <>
                User: <span className="font-medium text-foreground">{me.user.pseudonym}</span>
                {me.session ? (
                  <>
                    {" "}
                    · Session: <span className="font-medium text-foreground">{me.session.sessionCode}</span>
                  </>
                ) : null}
              </>
            ) : (
              "Noch keine Session gestartet."
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {me?.user ? (
            <SessionLogoutButton
              variant="secondary"
              onDone={() => {
                fetch("/api/me", { cache: "no-store" })
                  .then((r) => r.json())
                  .then((data) => setMe(data))
                  .catch(() => setMe({ user: null, session: null }));
              }}
            />
          ) : null}
          <Badge variant="outline">Logging: lokal in PostgreSQL</Badge>
          <Badge variant="secondary">Keine externen Tracker</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

