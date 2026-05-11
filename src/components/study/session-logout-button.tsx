"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { cn } from "@/lib/utils";
import { dispatchStudyMeChanged } from "@/lib/study/me-invalidate";

export function SessionLogoutButton({
  variant = "outline",
  size = "sm",
  className,
  onDone,
}: {
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "default";
  className?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      const res = await studyApiFetch("/api/study/logout", { method: "POST", cache: "no-store" });
      if (!res.ok) {
        toast.error("Abmelden fehlgeschlagen.");
        return;
      }
      toast.success("Session beendet. Du kannst mit einem neuen User-Code oder als Gast neu starten.");
      dispatchStudyMeChanged();
      onDone?.();
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-1.5", className)}
      disabled={busy}
      onClick={logout}
    >
      <LogOut className="h-3.5 w-3.5" />
      Session beenden
    </Button>
  );
}
