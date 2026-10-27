/** Fallback colour for categories with no match. */
export const DEFAULT_CATEGORY_COLOR = "#8b5cf6";

/**
 * Keyword → colour. A category matches the first keyword it contains,
 * so "Breaking Technology" gets the technology colour.
 */
const CATEGORY_COLORS: ReadonlyArray<[keyword: string, color: string]> = [
  ["disaster", "#ef4444"],
  ["conflict", "#dc2626"],
  ["war", "#dc2626"],
  ["breaking", "#f43f5e"],
  ["accident", "#f97316"],
  ["politics", "#3b82f6"],
  ["business", "#2563eb"],
  ["finance", "#2563eb"],
  ["uplifting", "#10b981"],
  ["happy", "#10b981"],
  ["announcement", "#10b981"],
  ["science", "#f59e0b"],
  ["research", "#d97706"],
  ["tech", "#06b6d4"],
  ["sports", "#ec4899"],
];

export function getCategoryColor(category: string | undefined): string {
  const cat = category?.toLowerCase() ?? "";
  if (!cat) return DEFAULT_CATEGORY_COLOR;
  for (const [keyword, color] of CATEGORY_COLORS) {
    if (cat.includes(keyword)) return color;
  }
  return DEFAULT_CATEGORY_COLOR;
}

/** Normalised key used by the category filter chips. */
export function categoryKey(category: string | undefined): string {
  return (category ?? "general").trim().toLowerCase();
}
