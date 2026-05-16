"use client";

import { cn } from "@/lib/utils";

export function FieldSuggestionChips({
  items,
  onPick,
  formatItem,
  isDisabled,
  className,
}: {
  items: string[];
  onPick: (value: string) => void;
  formatItem?: (value: string) => string;
  isDisabled?: (value: string) => boolean;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="group">
      <span className="text-[11px] text-muted-foreground">Zuletzt genutzt:</span>
      {items.map((item) => {
        const disabled = isDisabled?.(item) ?? false;
        return (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => onPick(item)}
            className={cn(
              "rounded-full border border-border/70 bg-muted/30 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors",
              "hover:border-primary/30 hover:bg-primary/10 hover:text-foreground",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            {formatItem ? formatItem(item) : item}
          </button>
        );
      })}
    </div>
  );
}
