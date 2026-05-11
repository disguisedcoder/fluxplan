"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const WEEK_LABELS = ["M", "D", "M", "D", "F", "S", "S"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

export type MiniMonthCalendarProps = {
  reference?: Date;
  highlightedDates?: Date[];
  /** Map: local-midnight stamp (ms) -> number of tasks due that day. */
  dayCountsByStamp?: Record<string, number>;
  /** Map: local-midnight stamp (ms) -> tasks due that day (for drill-down). */
  dayTasksByStamp?: Record<string, { id: string; title: string }[]>;
};

export function MiniMonthCalendar({
  reference = new Date(),
  highlightedDates = [],
  dayCountsByStamp = {},
  dayTasksByStamp = {},
}: MiniMonthCalendarProps) {
  /** Nur nach Mount setzen — sonst weicht „heute“ zwischen SSR- und Client-Zeitzone ab (Hydration). */
  const [todayStamp, setTodayStamp] = useState<number | null>(null);
  useEffect(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    queueMicrotask(() => setTodayStamp(t.getTime()));
  }, []);

  const { weeks, monthLabel, year } = useMemo(() => {
    const ref = new Date(reference);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const monthLabel = MONTH_LABELS[month];

    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);

    const cells: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }

    const weeks: Date[][] = [];
    for (let i = 0; i < 6; i += 1) {
      weeks.push(cells.slice(i * 7, i * 7 + 7));
    }

    return { weeks, monthLabel, year };
  }, [reference]);

  const highlightSet = useMemo(() => {
    return new Set(
      highlightedDates.map((d) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x.getTime();
      }),
    );
  }, [highlightedDates]);

  const month = reference.getMonth();

  /** Ab 6 Aufgaben: eine kompakte Zahl-Marke statt Punkte+„+N“ — bleibt im gleichen „Punkt-/Pill“-Muster. */
  const MAX_DOTS = 5;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Kalender</span>
        <span className="text-muted-foreground">
          {monthLabel} {year}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-[11px] text-muted-foreground">
        {WEEK_LABELS.map((label, i) => (
          <span key={`${label}-${i}`} className="text-center">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-sm">
        {weeks.flat().map((d, i) => {
          const isCurrentMonth = d.getMonth() === month;
          const stamp = (() => {
            const x = new Date(d);
            x.setHours(0, 0, 0, 0);
            return x.getTime();
          })();
          const isToday = todayStamp !== null && stamp === todayStamp;
          const isHighlighted = highlightSet.has(stamp);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const count = dayCountsByStamp[String(stamp)] ?? 0;
          const dayTasks = dayTasksByStamp[String(stamp)] ?? [];
          const useCountChip = count > MAX_DOTS;
          const dotCount = useCountChip ? 0 : Math.min(count, MAX_DOTS);
          const chipLabel = count > 99 ? "99+" : String(count);
          const dateLabel = d.toLocaleDateString(undefined, {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          });

          const cell = (
            <div
              className={cn(
                "mx-auto flex h-10 w-9 max-w-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden text-[12px]",
                !isCurrentMonth && "text-muted-foreground/40",
                isCurrentMonth && isWeekend && !isToday && "text-rose-500/80",
                isHighlighted && !isToday && "text-primary",
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full leading-none tabular-nums",
                  isHighlighted && !isToday && "bg-primary/10",
                  isToday && "bg-primary font-semibold text-primary-foreground shadow-sm",
                )}
              >
                {d.getDate()}
              </div>
              <div
                className="flex h-3 w-full min-w-0 shrink-0 items-center justify-center gap-px px-0.5"
                aria-hidden={count === 0}
              >
                {useCountChip ? (
                  <span
                    className={cn(
                      "inline-flex h-3 min-w-[0.75rem] max-w-full shrink-0 items-center justify-center rounded-full px-0.5 text-[7px] font-semibold leading-none tabular-nums",
                      isToday
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : isHighlighted
                          ? "bg-primary/25 text-primary"
                          : "bg-muted-foreground/30 text-muted-foreground",
                    )}
                    aria-label={`${count} Aufgaben`}
                    title={`${count} Aufgaben`}
                  >
                    {chipLabel}
                  </span>
                ) : dotCount > 0 ? (
                  Array.from({ length: dotCount }, (_, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "h-1 w-1 shrink-0 rounded-full",
                        isToday
                          ? "bg-primary-foreground/80"
                          : isHighlighted
                            ? "bg-primary/70"
                            : "bg-muted-foreground/40",
                      )}
                    />
                  ))
                ) : null}
              </div>
            </div>
          );

          return (
            <div key={i} className="flex justify-center">
              {count > 0 ? (
                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="flex justify-center p-0"
                        aria-label={`${dateLabel}: ${count} Aufgaben`}
                        title={`${dateLabel}: ${count} Aufgaben`}
                      />
                    }
                  >
                    {cell}
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(20rem,calc(100vw-2rem))]">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {dateLabel} · {count} Aufgaben
                      </div>
                      <div className="max-h-44 overflow-auto rounded-md border border-border/60 bg-card">
                        <ul className="divide-y divide-border/50">
                          {(dayTasks.length ? dayTasks : Array.from({ length: count }, () => null))
                            .slice(0, 50)
                            .map((t, idx) => (
                              <li key={t ? t.id : idx} className="px-3 py-2 text-xs text-muted-foreground">
                                {t ? t.title : "Aufgabe"}
                              </li>
                            ))}
                        </ul>
                      </div>
                      {dayTasks.length > 50 ? (
                        <div className="text-xs text-muted-foreground">
                          … und weitere {dayTasks.length - 50}
                        </div>
                      ) : null}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                cell
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
