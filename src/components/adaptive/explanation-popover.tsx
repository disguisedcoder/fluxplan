"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ExplanationPopover({
  explanation,
  onOpen,
}: {
  explanation: string;
  onOpen?: () => void;
}) {
  const [hasOpened, setHasOpened] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next && !hasOpened) {
      setHasOpened(true);
      onOpen?.();
    }
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" />
        }
      >
        <HelpCircle className="h-4 w-4" />
        Warum sehe ich das?
      </PopoverTrigger>
      <PopoverContent className="max-w-sm text-sm text-muted-foreground">
        {explanation}
      </PopoverContent>
    </Popover>
  );
}

