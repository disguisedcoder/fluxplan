export function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(d.getDate() + days);
  return x;
}

export function formatShortDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "2-digit" });
}

