"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

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
};

export function MiniMonthCalendar({
  reference = new Date(),
  highlightedDates = [],
}: MiniMonthCalendarProps) {
  const { weeks, today, monthLabel, year } = useMemo(() => {
    const ref = new Date(reference);
    const today = new Date();
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

    return { weeks, today, monthLabel, year };
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
          const isToday =
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate();
          const stamp = (() => {
            const x = new Date(d);
            x.setHours(0, 0, 0, 0);
            return x.getTime();
          })();
          const isHighlighted = highlightSet.has(stamp);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          return (
            <div
              key={i}
              className={cn(
                "mx-auto grid h-7 w-7 place-items-center rounded-full text-[12px]",
                !isCurrentMonth && "text-muted-foreground/40",
                isCurrentMonth && isWeekend && !isToday && "text-rose-500/80",
                isHighlighted && !isToday && "bg-primary/10 text-primary",
                isToday &&
                  "bg-primary text-primary-foreground font-semibold shadow-sm",
              )}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
