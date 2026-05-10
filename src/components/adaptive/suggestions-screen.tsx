"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  { id: "cooldown", label: "Pausen", icon: ShieldOff },
] as const;

type TabId = (typeof TABS)[number]["id"];

function tabHref(pathname: string, searchParams: Pick<URLSearchParams, "toString">, id: TabId): string {
  const p = new URLSearchParams(searchParams.toString());
  if (id === "adaptations") p.delete("tab");
  else p.set("tab", id);
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function SuggestionsScreen() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Lade Anpassungen…</div>}>
      <SuggestionsScreenInner />
    </Suspense>
  );
}

function SuggestionsScreenInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = useMemo((): TabId => {
    const raw = searchParams.get("tab");
    if (raw === "personalization" || raw === "cooldown" || raw === "adaptations") return raw;
    return "adaptations";
  }, [searchParams]);

  const [suggestions, setSuggestions] = useState<AdaptiveSuggestion[]>([]);
  const [rules, setRules] = useState<AdaptiveRule[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const jsonOrEmpty = async (url: string, timeoutMs: number) => {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const res = await fetch(url, { cache: "no-store", signal: ac.signal });
        if (!res.ok) return {} as Record<string, unknown>;
        return ((await res.json()) as Record<string, unknown>) ?? {};
      } catch {
        return {} as Record<string, unknown>;
      } finally {
        clearTimeout(t);
      }
    };

    try {
      const [s, r, p] = await Promise.all([
        jsonOrEmpty("/api/suggestions", 12_000),
        jsonOrEmpty("/api/rules", 12_000),
        jsonOrEmpty("/api/preferences", 12_000),
      ]);
      setSuggestions((s.suggestions as AdaptiveSuggestion[] | undefined) ?? []);
      setRules((r.rules as AdaptiveRule[] | undefined) ?? []);
      setPreferences((p.preferences as Preferences | undefined) ?? {});
    } catch {
      setSuggestions([]);
      setRules([]);
      setPreferences({});
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
        className="w-full overflow-x-auto"
        role="tablist"
        aria-label="Adaptions-Tabs"
      >
        <div className="inline-flex min-w-max rounded-full border border-border/70 bg-card p-1 text-sm">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <Link
                key={t.id}
                href={tabHref(pathname, searchParams, t.id)}
                prefetch={false}
                replace
                scroll={false}
                role="tab"
                aria-selected={active}
                data-testid={`fp-adapt-tab-${t.id}`}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </div>
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
