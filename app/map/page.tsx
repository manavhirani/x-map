"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { NewsMap } from "@/components/map/news-map";
import { buildCategoryOptions, NewsSidebar } from "@/components/map/news-sidebar";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { categoryKey } from "@/lib/categories";
import { IS_STATIC_DEMO } from "@/lib/config";
import { streamNews } from "@/lib/news-stream";
import type { DataMode, NewsItem, NewsStreamEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Same story from two sources (cache and fresh) should appear once. */
const storyKey = (item: NewsItem) => `${item.headline}|${item.location}`;

const isPhone = () => window.matchMedia("(max-width: 767px)").matches;

export default function MapPage() {

  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(IS_STATIC_DEMO);
  const [status, setStatus] = useState(IS_STATIC_DEMO ? "Loading sample stories..." : "");
  const [mode, setMode] = useState<DataMode | null>(null);
  const [modeMessage, setModeMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGlobe, setIsGlobe] = useState(true);
  // null = default: open on desktop, closed on phones (decided in CSS, so no hydration mismatch).
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const stopStream = useRef<(() => void) | null>(null);

  const handleEvent = useCallback((event: NewsStreamEvent) => {
    switch (event.type) {
      case "connected":
      case "status":
        setStatus(event.message);
        break;
      case "mode":
        setMode(event.mode);
        setModeMessage(event.message);
        break;
      case "news":
        setItems((prev) => {
          const key = storyKey(event.news);
          return prev.some((i) => i.id === event.news.id || storyKey(i) === key) ? prev : [...prev, event.news];
        });
        break;
      case "complete":
        setLoading(false);
        break;
      case "error":
        setStatus(`Error: ${event.message}`);
        setLoading(false);
        break;
    }
  }, []);

  const load = useCallback(
    (q: string) => {
      stopStream.current?.();
      setItems([]);
      setSelectedId(null);
      setFilter("all");
      setLoading(true);
      setStatus("Fetching breaking news...");
      stopStream.current = streamNews(q, handleEvent);
    },
    [handleEvent],
  );

  // The static demo has no API cost, so load the sample stories straight away.
  useEffect(() => {
    if (IS_STATIC_DEMO) stopStream.current = streamNews("", handleEvent);
    return () => stopStream.current?.();
  }, [handleEvent]);

  const categories = useMemo(() => buildCategoryOptions(items), [items]);
  const visibleItems = useMemo(
    () => (filter === "all" ? items : items.filter((i) => categoryKey(i.category) === filter)),
    [items, filter],
  );

  const loadTopNews = useCallback(() => {
    setQuery("");
    load("");
  }, [load]);

  const selectFromList = useCallback((id: string) => {
    setSelectedId(id);
    // On phones the sidebar covers the map, so get it out of the way.
    if (isPhone()) setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <Navbar
        search={{ value: query, onChange: setQuery, onSubmit: load }}
        loading={loading}
        onTopNews={loadTopNews}
        globe={{ enabled: isGlobe, onToggle: () => setIsGlobe((g) => !g) }}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <NewsSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          loading={loading}
          status={status}
          mode={mode}
          modeMessage={modeMessage}
          totalCount={items.length}
          items={visibleItems}
          categories={categories}
          filter={filter}
          onFilterChange={setFilter}
          selectedId={selectedId}
          onSelect={selectFromList}
          onLoadTopNews={loadTopNews}
        />

        <main className="relative flex-1">
          {sidebarOpen !== true && (
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "absolute left-3 top-3 z-10 bg-background/90 shadow-lg backdrop-blur",
                sidebarOpen === null && "md:hidden",
              )}
              onClick={() => setSidebarOpen(true)}
              aria-label="Show sidebar"
            >
              <ChevronRight />
            </Button>
          )}

          <NewsMap
            items={visibleItems}
            isGlobe={isGlobe}
            selectedId={selectedId}
            onSelect={setSelectedId}
            fitKey={filter}
          />
        </main>
      </div>
    </div>
  );
}
