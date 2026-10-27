"use client";

import { memo } from "react";
import { ChevronLeft, FlaskConical, Loader2, Newspaper, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryKey, getCategoryColor } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";
import type { DataMode, NewsItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  key: string;
  label: string;
  color: string;
  count: number;
}

interface NewsSidebarProps {
  /** `null` = default: open on desktop, closed on phones. */
  open: boolean | null;
  onClose: () => void;
  loading: boolean;
  status: string;
  mode: DataMode | null;
  modeMessage: string;
  totalCount: number;
  items: NewsItem[];
  categories: CategoryOption[];
  filter: string;
  onFilterChange: (key: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLoadTopNews: () => void;
}

export function NewsSidebar({
  open,
  onClose,
  loading,
  status,
  mode,
  modeMessage,
  totalCount,
  items,
  categories,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  onLoadTopNews,
}: NewsSidebarProps) {
  return (
    <aside
      aria-label="News stories"
      className={cn(
        "absolute inset-y-0 left-0 z-20 flex w-[min(360px,100vw)] flex-col border-r bg-background/90 shadow-xl backdrop-blur-md transition-transform duration-300 ease-out",
        open === true && "translate-x-0 md:relative",
        open === false && "-translate-x-full",
        open === null && "-translate-x-full md:relative md:translate-x-0",
      )}
    >
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Radio className="size-4 text-rose-500" />
            )}
            <h2 className="font-semibold">Breaking News</h2>
            {totalCount > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                {totalCount}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Hide sidebar">
            <ChevronLeft />
          </Button>
        </div>

        {mode === "demo" && (
          <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
            <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
            <p>{modeMessage}</p>
          </div>
        )}

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
            {[{ key: "all", label: "All", color: "#64748b", count: totalCount }, ...categories].map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onFilterChange(c.key)}
                aria-pressed={filter === c.key}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  filter === c.key
                    ? "border-foreground/20 bg-muted text-foreground ring-1 ring-foreground/15"
                    : "border-border text-muted-foreground hover:bg-muted/60",
                )}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: c.color, boxShadow: `0 0 6px ${c.color}` }} />
                {c.label}
                <span className="tabular-nums opacity-60">{c.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
        {status && (
          <p className="rounded-lg bg-muted/50 p-3 text-xs font-medium break-words" aria-live="polite">
            {status}
          </p>
        )}

        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <NewsListItem key={item.id} item={item} selected={item.id === selectedId} onSelect={onSelect} />
            ))}
          </ul>
        ) : (
          !loading && (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              <Newspaper className="size-8 opacity-40" />
              <p>No stories loaded yet.</p>
              <Button size="sm" onClick={onLoadTopNews}>
                Load top news
              </Button>
            </div>
          )
        )}
      </div>
    </aside>
  );
}

const NewsListItem = memo(function NewsListItem({
  item,
  selected,
  onSelect,
}: {
  item: NewsItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const color = getCategoryColor(item.category);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className={cn(
          "w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-px hover:shadow-md",
          selected && "ring-2 ring-offset-1 ring-offset-background",
        )}
        style={{ borderColor: `${color}66`, ...(selected ? { ["--tw-ring-color" as string]: color } : {}) }}
      >
        <h3 className="text-sm font-semibold leading-tight">{item.headline}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="max-w-[140px] truncate rounded bg-muted px-1.5 py-0.5">{item.location}</span>
          <span className="rounded px-1.5 py-0.5 font-medium" style={{ backgroundColor: `${color}1f`, color }}>
            {item.category}
          </span>
          <span className="ml-auto tabular-nums">{formatRelativeTime(item.timestamp)}</span>
        </div>
      </button>
    </li>
  );
});

/** Build filter options from the loaded stories, most common first. */
export function buildCategoryOptions(items: NewsItem[]): CategoryOption[] {
  const byKey = new Map<string, CategoryOption>();
  for (const item of items) {
    const key = categoryKey(item.category);
    const existing = byKey.get(key);
    if (existing) existing.count++;
    else byKey.set(key, { key, label: item.category || "General", color: getCategoryColor(item.category), count: 1 });
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
