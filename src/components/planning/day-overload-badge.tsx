import {
  dayOverloadBadgeTitle,
  formatDayOverloadBadge,
} from "@/lib/planning/day-estimated-load";
import { cn } from "@/lib/utils";

export function DayOverloadBadge({
  totalMinutes,
  className,
}: {
  totalMinutes: number;
  className?: string;
}) {
  const label = formatDayOverloadBadge(totalMinutes);
  if (!label) return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border border-amber-500/60 bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-950 shadow-sm tabular-nums dark:border-amber-400/50 dark:bg-amber-400/20 dark:text-amber-50",
        className,
      )}
      title={dayOverloadBadgeTitle(totalMinutes)}
      data-testid="day-overload-badge"
    >
      {label}
    </span>
  );
}
