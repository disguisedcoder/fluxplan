"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "light", label: "Hell", icon: Sun },
  { id: "dark", label: "Dunkel", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const active = mounted ? theme ?? "light" : "light";

  return (
    <Card className="fp-card">
      <CardContent className="space-y-3 p-5">
        <div>
          <div className="text-sm font-semibold tracking-tight">Darstellung</div>
          <p className="text-xs text-muted-foreground">
            Wähle ein Erscheinungsbild. Die Wahl bleibt im Browser gespeichert und beeinflusst keine Studiendaten.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Farbschema">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = active === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setTheme(opt.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-xs transition-colors",
                  isActive
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
