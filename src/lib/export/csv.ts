export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((s, r) => {
      Object.keys(r).forEach((k) => s.add(k));
      return s;
    }, new Set<string>()),
  );

  const escape = (v: unknown) => {
    const str =
      v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
    const needs = /[",\n\r]/.test(str);
    const inner = str.replaceAll('"', '""');
    return needs ? `"${inner}"` : inner;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

