"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PendingAdaptiveSuggestionBanner } from "@/components/adaptive/pending-suggestion-banner";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CheckSquare,
  Cog,
  Home,
  ListChecks,
  Menu,
  PanelLeft,
  PlusCircle,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { STUDY_ME_CHANGED_EVENT } from "@/lib/study/me-invalidate";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { useGlobalNavigationShortcuts } from "@/lib/hooks/use-shortcuts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/start", label: "Start", icon: Home },
  { href: "/willkommen", label: "Willkommen", icon: BookOpen },
  { href: "/heute", label: "Heute", icon: CalendarCheck2 },
  { href: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/erstellen", label: "Erstellen", icon: PlusCircle },
  { href: "/anpassungen", label: "Anpassungen", icon: Sparkles },
  { href: "/einstellungen", label: "Einstellungen", icon: Cog },
];

const MOBILE_NAV: NavItem[] = [
  { href: "/willkommen", label: "Willkommen", icon: BookOpen },
  { href: "/start", label: "Start", icon: Home },
  { href: "/heute", label: "Heute", icon: CalendarCheck2 },
  { href: "/aufgaben", label: "Aufgaben", icon: ListChecks },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/erstellen", label: "Erstellen", icon: PlusCircle },
  { href: "/anpassungen", label: "Anpassungen", icon: Settings2 },
];

type Me = {
  user: { pseudonym: string } | null;
  session: { sessionCode: string; variant?: string | null } | null;
  isAdmin?: boolean;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [me, setMe] = useState<Me | null>(null);
  const [compactSidebar, setCompactSidebar] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("fp_sidebar_compact") === "1";
    } catch {
      return false;
    }
  });

  useLogViewChange(pathname);
  useGlobalNavigationShortcuts();

  useEffect(() => {
    let cancelled = false;
    function loadMe() {
      fetch("/api/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setMe(data);
        })
        .catch(() => {
          if (!cancelled) setMe({ user: null, session: null });
        });
    }
    loadMe();
    function onMeChanged() {
      loadMe();
    }
    window.addEventListener(STUDY_ME_CHANGED_EVENT, onMeChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(STUDY_ME_CHANGED_EVENT, onMeChanged);
    };
  }, []);

  const isBaseline = me?.session?.variant === "baseline";

  function toggleCompact() {
    setCompactSidebar((v) => {
      const next = !v;
      try {
        localStorage.setItem("fp_sidebar_compact", next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div
        className={cn(
          "mx-auto grid w-full max-w-none grid-cols-1",
          compactSidebar ? "md:grid-cols-[76px_1fr]" : "md:grid-cols-[260px_1fr]",
        )}
      >
        <BrandSidebar
          pathname={pathname}
          me={me}
          compact={compactSidebar}
          onToggleCompact={toggleCompact}
          isBaseline={isBaseline}
        />
        <main className="min-w-0 px-4 pb-24 pt-6 md:px-12 md:pb-10 md:pt-10 2xl:px-16">
          <div className="mx-auto w-full max-w-none">
            <PendingAdaptiveSuggestionBanner pathname={pathname} me={me} />
            {children}
          </div>
        </main>
      </div>
      <MobileAppMenu />
      <MobileBottomNav pathname={pathname} isBaseline={isBaseline} />
    </div>
  );
}

function BrandSidebar({
  pathname,
  me,
  compact,
  onToggleCompact,
  isBaseline,
}: {
  pathname: string;
  me: Me | null;
  compact: boolean;
  onToggleCompact: () => void;
  isBaseline: boolean;
}) {
  const nav = isBaseline ? PRIMARY_NAV.filter((i) => i.href !== "/anpassungen") : PRIMARY_NAV;
  return (
    <aside className="hidden md:flex md:min-h-dvh md:flex-col md:border-r md:border-border/60 md:bg-sidebar/80 md:backdrop-blur">
      <div className={cn("flex items-center gap-2 pb-2 pt-7", compact ? "px-4" : "px-6")}>
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
          <PlusCircle className="h-4 w-4" />
        </div>
        {compact ? null : <div className="text-base font-semibold tracking-tight">FluxPlan</div>}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCompact}
            aria-label={compact ? "Sidebar ausklappen" : "Sidebar einklappen"}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <nav className={cn("mt-6 flex-1", compact ? "px-2" : "px-4")}>
        <ul className="space-y-1">
          {nav.map((item) => (
            <SidebarItem key={item.href} item={item} pathname={pathname} compact={compact} />
          ))}
        </ul>
      </nav>

      <div
        className={cn(
          "mt-auto border-t border-border/50",
          compact ? "px-2 py-3" : "px-4 py-3",
        )}
      >
        <div className={cn("flex items-center", compact ? "justify-center" : "justify-between gap-2")}>
          {compact ? null : (
            <span className="text-xs font-medium text-muted-foreground">Darstellung</span>
          )}
          <ThemeToggle className={compact ? "shrink-0" : undefined} />
        </div>
      </div>

      <UserBadge me={me} compact={compact} isBaseline={isBaseline} />
    </aside>
  );
}

function SidebarItem({
  item,
  pathname,
  compact,
}: {
  item: NavItem;
  pathname: string;
  compact: boolean;
}) {
  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "font-semibold text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        title={compact ? item.label : undefined}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-colors",
            active ? "bg-primary" : "bg-transparent group-hover:bg-border",
          )}
        />
        <Icon className={cn("ml-2 h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
        {compact ? null : <span className="min-w-0 truncate">{item.label}</span>}
      </Link>
    </li>
  );
}

function UserBadge({ me, compact, isBaseline }: { me: Me | null; compact: boolean; isBaseline: boolean }) {
  const initials = me?.user?.pseudonym?.slice(0, 2).toUpperCase() ?? "?";
  return (
    <Link
      href="/einstellungen"
      className={cn(
        "m-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-3 transition-colors hover:bg-accent/30",
        compact && "justify-center px-0",
      )}
      title={compact ? (me?.user?.pseudonym ?? "Pseudonym setzen") : undefined}
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {initials}
      </div>
      {compact ? null : (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-medium">
            {me?.user?.pseudonym ?? "Pseudonym setzen"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {me?.user ? (isBaseline ? "Baseline-Modus" : "Vorschläge aktiv") : "Session starten"}
          </div>
        </div>
      )}
    </Link>
  );
}

function MobileAppMenu() {
  return (
    <div className="fixed left-3 top-3 z-40 md:hidden">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" size="icon-sm" />}>
          <Menu className="h-4 w-4" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Menü</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Link href="/willkommen" className="rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
              Willkommen
            </Link>
            <Link href="/start" className="rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
              Start (Startansicht)
            </Link>
            <Link href="/einstellungen" className="rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
              Einstellungen
            </Link>
          </div>
          <div className="pt-2">
            <ThemeToggle />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MobileBottomNav({ pathname, isBaseline }: { pathname: string; isBaseline: boolean }) {
  const nav = isBaseline ? MOBILE_NAV.filter((i) => i.href !== "/anpassungen") : MOBILE_NAV;
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-7">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] leading-tight transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function useLogViewChange(pathname: string) {
  useEffect(() => {
    if (!pathname) return;
    // TaskInteraction + Engine (view_preference zählt view_changed hier)
    fetch("/api/interactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "view_changed",
        screen: pathname,
        metadata: { to: pathname },
      }),
    }).catch(() => {});
    // EventLog bleibt für Export / Studien-Zähler (viewChangedCount)
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "view_changed",
        screen: pathname,
        metadata: { to: pathname },
      }),
    }).catch(() => {});
  }, [pathname]);
}
