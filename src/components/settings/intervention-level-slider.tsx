"use client";

import { cn } from "@/lib/utils";

type Level = { value: number; label: string; desc: string };

export function InterventionLevelSlider({
  value,
  levels,
  onChange,
  disabled,
}: {
  value: number;
  levels: Level[];
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const current = levels.find((l) => l.value === value) ?? levels[0];
  const min = levels[0]?.value ?? 0;
  const max = levels[levels.length - 1]?.value ?? 0;

  return (
    <div className="space-y-3">
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="fp-range w-full"
        aria-label="Eingriffsstufe"
      />

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-4">
        {levels.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => onChange(l.value)}
            disabled={disabled}
            className={cn(
              "rounded-md px-1 py-0.5 text-left transition-colors",
              l.value === value
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted",
            )}
            aria-pressed={l.value === value}
          >
            {l.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{current.label}.</span> {current.desc}
      </p>
    </div>
  );
}
