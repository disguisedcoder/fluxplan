"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, Sliders, ShieldOff } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AdaptiveRule, AdaptiveSuggestion } from "./types";
import { AdaptationsTab } from "./adaptations-tab";
import { PersonalizationTab } from "./personalization-tab";
import { CooldownTab } from "./cooldown-tab";
import { TransparencyPanel } from "./transparency-panel";

export type Preferences = Record<string, unknown>;

const TABS = [
  { id: "adaptations", label: "Anpassungen", icon: Sparkles },
  { id: "personalization", label: "Personalisierung", icon: Sliders },
  { id: "cooldown", label: "Cooldown", icon: ShieldOff },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SuggestionsScreen() {
  const [tab, setTab] = useState<TabId>("adaptations");

  const [suggestions, setSuggestions] = useState<AdaptiveSuggestion[]>([]);
  const [rules, setRules] = useState<AdaptiveRule[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r, p] = await Promise.all([
        fetch("/api/suggestions", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/rules", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/preferences", { cache: "no-store" }).then((x) => x.json()),
      ]);
      setSuggestions(s.suggestions ?? []);
      setRules(r.rules ?? []);
      setPreferences(p.preferences ?? {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const stats = useMemo(() => deriveStats(suggestions), [suggestions]);

  return (
    <div className="space-y-6">
      <TransparencyPanel />

      <nav
        className="inline-flex rounded-full border border-border/70 bg-card p-1 text-sm"
        role="tablist"
        aria-label="Adaptions-Tabs"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "adaptations" ? (
        <AdaptationsTab
          suggestions={suggestions}
          loading={loading}
          onChanged={load}
          stats={stats}
        />
      ) : null}
      {tab === "personalization" ? (
        <PersonalizationTab
          rules={rules}
          preferences={preferences}
          stats={stats}
          onChanged={load}
        />
      ) : null}
      {tab === "cooldown" ? (
        <CooldownTab rules={rules} preferences={preferences} suggestions={suggestions} />
      ) : null}
    </div>
  );
}

function deriveStats(suggestions: AdaptiveSuggestion[]) {
  const total = suggestions.length;
  const accepted = suggestions.filter((s) => s.status === "accepted").length;
  const rejected = suggestions.filter((s) => s.status === "rejected").length;
  const snoozed = suggestions.filter((s) => s.status === "snoozed").length;
  const pending = suggestions.filter((s) => s.status === "pending").length;
  return { total, accepted, rejected, snoozed, pending };
}
