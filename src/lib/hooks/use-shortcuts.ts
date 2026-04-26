"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ShortcutMap = Record<string, () => void>;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const handler = shortcuts[event.key.toLowerCase()];
      if (!handler) return;
      event.preventDefault();
      handler();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts]);
}

export function useGlobalNavigationShortcuts() {
  const router = useRouter();
  useKeyboardShortcuts({
    h: () => router.push("/heute"),
    a: () => router.push("/aufgaben"),
    k: () => router.push("/kalender"),
    n: () => router.push("/erstellen"),
    e: () => router.push("/einstellungen"),
    "?": () => router.push("/heute"),
  });
}
