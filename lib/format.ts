/** 1234 → "1.2K", 2500000 → "2.5M". Accepts numbers or numeric strings such as "1,234". */
export function formatMetric(value: string | number | undefined): string {
  if (value === undefined || value === "") return "0";
  const num = typeof value === "string" ? parseInt(value.replace(/,/g, ""), 10) : value;
  if (Number.isNaN(num)) return String(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

/** ISO date → "now", "5m", "3h", "2d", or a short date for older posts. */
export function formatRelativeTime(dateStr: string | undefined, now = new Date()): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
