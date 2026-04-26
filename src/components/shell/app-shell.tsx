"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  Cog,
  Home,
  ListChecks,
  PlusCircle,
  Settings2,
  Sparkles,
  Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { useGlobalNavigationShortcuts } from "@/lib/hooks/use-shortcuts";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/start", label: "Start", icon: Home },
  { href: "/heute", label: "Heute", icon: Sun },
  { href: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/erstellen", label: "Erstellen", icon: PlusCircle, primary: true },
  { href: "/anpassungen", label: "Anpassungen", icon: Sparkles },
  { href: "/einstellungen", label: "Einstellungen", icon: Cog },
];

const MOBILE_NAV: NavItem[] = [
  { href: "/heute", label: "Heute", icon: Sun },
  { href: "/aufgaben", label: "Aufgaben", icon: ListChecks },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/erstellen", label: "Erstellen", icon: PlusCircle, primary: true },
  { href: "/anpassungen", label: "Anpassungen", icon: Settings2 },
];

type Me = {
  user: { pseudonym: string } | null;
  session: { sessionCode: string } | null;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useLogViewChange(pathname);
  useGlobalNavigationShortcuts();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe({ user: null, session: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 md:grid-cols-[260px_1fr]">
        <BrandSidebar pathname={pathname} me={me} />
        <main className="min-w-0 px-4 pb-24 pt-6 md:px-10 md:pb-10 md:pt-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileBottomNav pathname={pathname} />
    </div>
  );
}

function BrandSidebar({ pathname, me }: { pathname: string; me: Me | null }) {
  return (
    <aside className="hidden md:flex md:min-h-dvh md:flex-col md:border-r md:border-border/60 md:bg-sidebar/80 md:backdrop-blur">
      <div className="flex items-center gap-2 px-6 pb-2 pt-7">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
          <PlusCircle className="h-4 w-4" />
        </div>
        <div className="text-base font-semibold tracking-tight">FluxPlan</div>
        <ThemeToggle className="ml-auto" />
      </div>

      <nav className="mt-6 flex-1 px-4">
        <ul className="space-y-1">
          {PRIMARY_NAV.map((item) => (
            <SidebarItem key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
      </nav>

      <UserBadge me={me} />
    </aside>
  );
}

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
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
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-colors",
            active ? "bg-primary" : "bg-transparent group-hover:bg-border",
          )}
        />
        <span className="ml-2">{item.label}</span>
      </Link>
    </li>
  );
}

function UserBadge({ me }: { me: Me | null }) {
  const initials = me?.user?.pseudonym?.slice(0, 2).toUpperCase() ?? "?";
  return (
    <Link
      href="/einstellungen"
      className="m-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-3 transition-colors hover:bg-accent/30"
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {initials}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-medium">
          {me?.user?.pseudonym ?? "Pseudonym setzen"}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {me?.user ? "Adaptive Planung aktiv" : "Session starten"}
        </div>
      </div>
    </Link>
  );
}

function MobileBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {MOBILE_NAV.map((item) => {
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
                <Icon className={cn("h-5 w-5", item.primary && active && "text-primary")} />
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
    fetch("/api/interactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "view_changed",
        screen: pathname,
        metadata: { to: pathname },
      }),
    }).catch(() => {});
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
