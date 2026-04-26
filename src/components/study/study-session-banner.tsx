"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type MeResponse = {
  user: { id: string; pseudonym: string; studyModeEnabled: boolean } | null;
  session: { id: string; sessionCode: string; startedAt: string; variant?: string | null } | null;
};

export function StudySessionBanner() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setMe(data))
      .catch(() => setMe({ user: null, session: null }));
  }, []);

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-medium">Aktive Session</div>
          <div className="text-muted-foreground">
            {me?.user ? (
              <>
                Pseudonym: <span className="font-medium text-foreground">{me.user.pseudonym}</span>
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
        <div className="flex gap-2">
          <Badge variant="outline">Logging: lokal in PostgreSQL</Badge>
          <Badge variant="secondary">Keine externen Tracker</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

