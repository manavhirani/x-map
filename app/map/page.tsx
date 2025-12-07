"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import MapGL, {
  MapRef,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  Marker,
  Source,
  Layer,
  Popup,
  MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Navbar } from "@/components/navbar";
import {
  Loader2,
  Radio,
  AlertCircle,
  Globe,
  Map,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Repeat,
  Heart,
  Share,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface Tweet {
  author: string;
  name?: string;
  text: string;
  url?: string;
  id?: string;
  timestamp?: string;
  likes?: string;
  replies?: string;
  reposts?: string;
  profile_pic?: string;
}

interface NewsItem {
  id: string;
  headline: string;
  location: string;
  summary: string;
  category: string;
  timestamp: string;
  coordinates: [number, number];
  display_name?: string;
  top_tweets?: Tweet[];
}

export default function MapPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<string>("");
  const [isGlobe, setIsGlobe] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"breaking-news" | "search">(
    "search",
  );
  const [hoverInfo, setHoverInfo] = useState<{
    longitude: number;
    latitude: number;
    features: NewsItem[];
  } | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 0, // Perfectly centered on equator
    zoom: 0.8, // Slightly zoomed out to show full globe
    pitch: 0, // Start flat, user can rotate
    bearing: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update viewState when projection changes
  useEffect(() => {
    if (isGlobe) {
      setViewState((prev) => ({
        ...prev,
        pitch: prev.pitch || 0, // Allow user to control pitch
        latitude: 0, // Keep centered
      }));
    } else {
      setViewState((prev) => ({
        ...prev,
        pitch: 0,
        bearing: 0,
        latitude: 0, // Keep centered
      }));
    }
  }, [isGlobe]);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");
  const mapStyle = isDark
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

  useEffect(() => {
    if (mapRef && mounted) {
      mapRef.getMap().setStyle(mapStyle);
    }
  }, [mapRef, mapStyle, mounted]);

  const fetchBreakingNews = async (query: string = "") => {
    setLoading(true);
    setStatus("Fetching breaking news...");
    setNewsItems([]);

    let eventSource: EventSource | null = null;
    let hasReceivedData = false;

    try {
      eventSource = new EventSource(`/api/grok/breaking-news${query ? `?query=${encodeURIComponent(query)}` : ""}`);

      eventSource.onmessage = (event) => {
        hasReceivedData = true;
        const message = JSON.parse(event.data);

        if (message.type === "connected") {
          setStatus(message.message || "Connecting...");
        } else if (message.type === "status") {
          setStatus(message.message || "Processing...");
        } else if (message.type === "news") {
          console.log("Received news item:", message.news);
          // News item found (before geocoding)
          if (message.news && message.news.coordinates) {
            setNewsItems((prev) => {
              // Avoid duplicates by ID or Headline+Location
              const exists = prev.find(
                (item) =>
                  (item.id && message.news.id && item.id === message.news.id) ||
                  (item.headline === message.news.headline && item.location === message.news.location)
              );
              if (!exists) {
                return [...prev, message.news];
              }
              return prev;
            });
            setStatus(`Found: ${message.news.headline}`);
          } else {
            setStatus(`Found: ${message.news.headline}`);
          }
        } else if (message.type === "news_geocoded") {
          // Support legacy event type just in case
          if (message.news && message.news.coordinates) {
            setNewsItems((prev) => {
              const exists = prev.find((item) => (item.id && message.news.id && item.id === message.news.id) || (item.headline === message.news.headline));
              return exists ? prev : [...prev, message.news];
            });
          }
        } else if (message.type === "complete") {
          setStatus(`Loaded breaking news stories`);
          setLoading(false);
          if (eventSource) eventSource.close();
        } else if (message.type === "error") {
          setStatus(`Error: ${message.message || "Unknown error"}`);
          if (eventSource) eventSource.close();
          setLoading(false);
        }
      };  // Close onmessage

      eventSource.onerror = (error) => {
        // Only log if it's a real error, not a normal closure
        if (eventSource?.readyState === EventSource.CLOSED) {
          // Connection closed - might be normal completion
          if (hasReceivedData) {
            // We got some data, likely normal completion - don't log as error
            setLoading(false);
            return;
          } else {
            // Connection closed without data - likely an error
            console.warn("EventSource closed without receiving data");
            setStatus("Connection closed unexpectedly. Please try again.");
            setLoading(false);
            return;
          }
        } else if (eventSource?.readyState === EventSource.CONNECTING) {
          // Still connecting - might be a network issue, but don't log as error yet
          setStatus("Connecting... Please wait.");
          return;
        } else {
          // Other error states - only log if it's a real error
          if (eventSource?.readyState !== EventSource.OPEN) {
            console.error("EventSource error:", error);
            setStatus(
              "Connection error. Please check your network and try again.",
            );
            if (eventSource) {
              eventSource.close();
            }
            setLoading(false);
          }
        }
      };
    } catch (error) {
      setStatus(`Error: ${(error as Error).message || "Failed to start connection"}`);
      setLoading(false);
      if (eventSource) {
        eventSource.close();
      }
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchMode("search");
      fetchBreakingNews("");
      return;
    }

    setSearchMode("search");
    fetchBreakingNews(query);
  };

  const getCategoryColor = (category: string): string => {
    const defaultColor = "#8b5cf6"; // purple (default)
    if (!category) return defaultColor;

    const cat = category.toLowerCase();

    // Normalized mappings based on Grok prompts
    const colors: Record<string, string> = {
      // Red/Hot
      disaster: "#ef4444",
      conflict: "#dc2626",
      war: "#dc2626",

      // Blue/Formal
      politics: "#3b82f6",
      business: "#1d4ed8",
      finance: "#1d4ed8",

      // Green/Positive
      uplifting: "#10b981",
      happy: "#10b981",
      announcement: "#10b981",

      // Amber/Science
      science: "#f59e0b",
      technology: "#f59e0b",
      tech: "#f59e0b",
      research: "#d97706",

      // Other
      sports: "#ec4899", // pink
      accident: "#f97316", // orange
    };

    // Partial match check
    for (const key in colors) {
      if (cat.includes(key)) return colors[key];
    }

    return defaultColor;
  };

  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredItems = newsItems.filter(item => {
    // Simplified dynamic filter
    if (filterCategory === "all") return true;
    const cat = (item.category || "").toLowerCase();

    // Filter maps (Dynamic)
    // If exact match
    if (filterCategory === cat) return true;

    // Legacy/fallback mappings if user uses generic buckets
    if (filterCategory === "politics") return cat.includes("politics") || cat.includes("business");
    if (filterCategory === "conflict") return cat.includes("conflict") || cat.includes("war") || cat.includes("disaster");
    if (filterCategory === "science") return cat.includes("science") || cat.includes("tech") || cat.includes("research");
    if (filterCategory === "sports") return cat.includes("sports");
    if (filterCategory === "uplifting") return cat.includes("uplifting") || cat.includes("happy");

    return false;
  });

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navbar
        globeMode={isGlobe}
        onGlobeModeChange={setIsGlobe}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        loading={loading}
        onTopNews={() => fetchBreakingNews()}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex-1 flex relative overflow-hidden" style={{ height: "calc(100vh - 60px)" }}>
        {/* Persistent Sidebar */}
        <div
          className={`
            border-r bg-background/95 backdrop-blur-sm shadow-lg z-20 transition-all duration-300 ease-in-out flex flex-col
            ${!sidebarCollapsed ? "w-[300px] sm:w-[350px] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-full overflow-hidden"}
          `}
        >
          <div className="p-4 border-b bg-background/95 backdrop-blur-sm min-w-[300px] sm:min-w-[350px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Radio className="h-4 w-4 text-primary" />
                )}
                <h2 className="font-semibold text-sm sm:text-base">Breaking News</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarCollapsed(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Dynamic Color Filters */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", color: "#64748b", label: "All" },
                ...Array.from(new Set(newsItems.map(i => i.category))).sort().map(cat => ({
                  id: cat.toLowerCase(),
                  color: getCategoryColor(cat),
                  label: cat
                }))
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterCategory(f.id)}
                  className={`
                    px-2 py-1 rounded-full text-[10px] font-medium border transition-all flex items-center gap-1.5
                    ${filterCategory === f.id
                      ? "bg-muted text-foreground border-foreground/20 ring-1 ring-foreground/20"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/50"}
                  `}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-[300px] sm:min-w-[350px]">
            {/* Status Section */}
            {status && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs sm:text-sm">
                <p className="break-words font-medium">{status}</p>
                {newsItems.length > 0 && (
                  <p className="text-muted-foreground mt-1">
                    {newsItems.length} stories loaded
                  </p>
                )}
              </div>
            )}

            {/* News List */}
            {filteredItems.length > 0 ? (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors shadow-sm"
                    style={{ borderLeft: `4px solid ${getCategoryColor(item.category)}` }}
                    onClick={() => {
                      setViewState((prev) => ({
                        ...prev,
                        longitude: item.coordinates[0],
                        latitude: item.coordinates[1],
                        zoom: 12,
                        transitionDuration: 2000, // Add smooth transition
                        transitionInterpolator: undefined, // Let maplibre handle default ease
                      }));
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <h4 className="font-semibold text-sm break-words leading-tight">
                        {item.headline}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
                          {item.location}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 whitespace-nowrap capitalize">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !status && (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  <p>No breaking news loaded.</p>
                  <p className="mt-1 text-xs">
                    Click "Breaking News" in the top bar to start.
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Main Content (Map) */}
        <main className="flex-1 relative w-full h-full">
          {/* Floating Toggle Button (Visible when sidebar is collapsed) */}
          {sidebarCollapsed && (
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-[60]">
              <Button
                variant="outline"
                size="icon"
                className="bg-background/95 backdrop-blur-sm border shadow-lg h-10 w-10 flex items-center justify-center p-0"
                onClick={() => setSidebarCollapsed(false)}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Expand Sidebar</span>
              </Button>
            </div>
          )}

          <MapGL
            ref={setMapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            style={{
              width: "100%",
              height: "100%",
            }}
            projection={isGlobe ? "globe" : "mercator"}
            minZoom={0.5}
            maxZoom={22}
            doubleClickZoom={true}
            dragRotate={isGlobe}
            touchZoomRotate={isGlobe}
            keyboard={true}
            scrollZoom={true}
            initialViewState={{
              longitude: 0,
              latitude: 20,
              zoom: 2,
            }}
            mapStyle={isGlobe ? "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"}
            interactiveLayerIds={["breaking-news-interaction"]}
            onMouseMove={(event: MapLayerMouseEvent) => {
              const { features, lngLat } = event;

              const relevantFeatures = features?.filter(f => f.layer.id === "breaking-news-interaction" && f.properties?.id) || [];

              if (relevantFeatures.length > 0) {
                // Get all unique news items at this location
                const uniqueIds = Array.from(new Set(relevantFeatures.map(f => f.properties?.id)));
                const items = uniqueIds.map(id => filteredItems.find(n => n.id === id)).filter(Boolean) as NewsItem[];

                if (items.length > 0) {
                  setHoverInfo({
                    longitude: lngLat.lng,
                    latitude: lngLat.lat,
                    features: items
                  });
                  if (mapRef) {
                    mapRef.getMap().getCanvas().style.cursor = 'pointer';
                  }
                  return;
                }
              }

              setHoverInfo(null);
              if (mapRef) {
                mapRef.getMap().getCanvas().style.cursor = '';
              }
            }}
            onMouseLeave={() => {
              setHoverInfo(null);
              if (mapRef) {
                mapRef.getMap().getCanvas().style.cursor = '';
              }
            }}
          >
            {!isGlobe && <NavigationControl position="bottom-right" />}
            <ScaleControl />
            <FullscreenControl position="top-right" />

            <Source
              id="breaking-news"
              type="geojson"
              data={{
                type: "FeatureCollection",
                features: filteredItems.map((item) => ({
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: item.coordinates,
                  },
                  properties: {
                    id: item.id, // Important for collecting multiple
                    headline: item.headline,
                    category: item.category,
                    title: item.headline,
                    mag: 1, // intensity for heatmap
                  },
                })),
              }}
            >
              <Layer
                id="breaking-news-heatmap-layer"
                type="heatmap"
                paint={{
                  "heatmap-weight": ["get", "mag"],
                  "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
                  "heatmap-color": [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0,
                    "rgba(33,102,172,0)",
                    0.2,
                    "rgb(103,169,207)",
                    0.4,
                    "rgb(209,229,240)",
                    0.6,
                    "rgb(253,219,199)",
                    0.8,
                    "rgb(239,138,98)",
                    1,
                    "rgb(178,24,43)",
                  ],
                  "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 15, 9, 40], // Increased radius slightly to ensure overlap is catchable
                  "heatmap-opacity": 0.6,
                }}
              />

              <Layer
                id="breaking-news-interaction"
                type="circle"
                paint={{
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 15, 9, 40], // Match heatmap radius
                  "circle-color": "transparent",
                  "circle-stroke-width": 0,
                }}
              />
            </Source>

            {/* Hover Popup */}
            {hoverInfo && hoverInfo.features.length > 0 && (
              <Popup
                longitude={hoverInfo.features[0].coordinates[0]}
                latitude={hoverInfo.features[0].coordinates[1]}
                offset={[0, -10]}
                closeButton={false}
                closeOnClick={false}
                maxWidth="350px"
                className="z-50 [&_.maplibregl-popup-content]:!bg-transparent [&_.maplibregl-popup-content]:!shadow-none [&_.maplibregl-popup-content]:!p-0 [&_.maplibregl-popup-tip]:hidden"
              >
                <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2 pr-1">
                  {hoverInfo.features.slice(0, 5).map((feature, featureIndex) => (
                    <Card key={feature.id || featureIndex} className="border shadow-lg bg-card text-card-foreground w-full min-w-[320px]">
                      <CardHeader className="p-3 pb-2 border-b bg-muted/20">
                        <div className="flex justify-between items-start gap-3">
                          <CardTitle className="text-sm font-bold leading-tight">{feature.headline}</CardTitle>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary uppercase tracking-wide whitespace-nowrap shrink-0">
                            {feature.category}
                          </span>
                        </div>
                        <CardDescription className="text-xs line-clamp-3 mt-1.5 text-foreground/80 leading-normal">
                          {feature.summary}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-3 pt-3 space-y-3">
                        {feature.top_tweets && feature.top_tweets.length > 0 ? (
                          <>
                            <div className="flex items-center gap-1.5 opacity-80 pb-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-foreground">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Top Posts</h4>
                            </div>
                            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                              {feature.top_tweets.map((tweet, i) => {
                                const cleanHandle = tweet.author.replace(/^@/, '');
                                // Fallback to search since IDs from LLM can be hallucinated/invalid
                                // This guarantees the user lands on a valid page (Search Results) instead of a 404
                                const tweetQuery = encodeURIComponent(tweet.text || feature.headline);
                                const tweetUrl = `https://x.com/search?q=${tweetQuery}&src=typed_query`;

                                const formatMetric = (val: string | number | undefined) => {
                                  if (!val) return "0";
                                  const num = typeof val === 'string' ? parseInt(val.replace(/,/g, ''), 10) : val;
                                  if (isNaN(num)) return val;
                                  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                                  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                                  return num.toString();
                                };

                                const formatRelativeTime = (dateStr: string | undefined) => {
                                  if (!dateStr) return '2h';
                                  try {
                                    const date = new Date(dateStr);
                                    const now = new Date();
                                    const diffMs = now.getTime() - date.getTime();
                                    const diffSec = Math.floor(diffMs / 1000);
                                    const diffMin = Math.floor(diffSec / 60);
                                    const diffHr = Math.floor(diffMin / 60);
                                    const diffDay = Math.floor(diffHr / 24);

                                    if (diffMin < 1) return 'now';
                                    if (diffMin < 60) return `${diffMin}m`;
                                    if (diffHr < 24) return `${diffHr}h`;
                                    if (diffDay < 7) return `${diffDay}d`;
                                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
                                  } catch (e) {
                                    return '2h';
                                  }
                                };

                                return (
                                  <a
                                    key={i}
                                    href={tweetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      console.log("Clicked Tweet Link:", tweetUrl);
                                      e.stopPropagation(); // Stop map drag/click
                                    }}
                                    className="block group no-underline"
                                  >
                                    <div className="p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors shadow-sm">
                                      {/* Header */}
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                            {/* Use unavatar.io for reliable profile pics */}
                                            <img
                                              src={`https://unavatar.io/twitter/${cleanHandle}`}
                                              alt={tweet.author}
                                              className="h-full w-full object-cover"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                              }}
                                            />
                                            <span className="text-xs font-bold text-primary hidden">{cleanHandle[0]?.toUpperCase() || "U"}</span>
                                          </div>
                                          <div className="flex flex-col leading-none truncate">
                                            <div className="flex items-center gap-1">
                                              <span className="font-bold text-sm text-foreground truncate">{tweet.name || tweet.author}</span>
                                              {/* Blue Check */}
                                              <svg viewBox="0 0 24 24" aria-label="Verified Account" className="h-3.5 w-3.5 text-blue-500 fill-current">
                                                <g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.497.782 2.798 1.942 3.483-.02.17-.03.34-.03.517 0 2.21 1.71 3.998 3.818 3.998.47 0 .92-.084 1.336-.25.62 1.333 1.926 2.25 3.437 2.25 1.512 0 2.818-.917 3.437-2.25.415.165.865.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.176-.01-.347-.03-.517 1.16-.685 1.942-1.986 1.942-3.483zM9 16.033l-4.157-4.157 1.414-1.414L9 13.205l8.157-8.157 1.414 1.414L9 16.033z"></path></g>
                                              </svg>
                                            </div>
                                            <span className="text-xs text-muted-foreground truncate">@{cleanHandle} · {formatRelativeTime(tweet.timestamp)}</span>
                                          </div>
                                        </div>
                                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-muted-foreground/40 fill-current">
                                          <g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g>
                                        </svg>
                                      </div>

                                      {/* Body */}
                                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed mb-3">
                                        {tweet.text}
                                      </p>

                                      {/* Metric Footer */}
                                      <div className="flex items-center justify-between text-muted-foreground/70 max-w-[90%]">
                                        <div className="flex items-center gap-1 hover:text-blue-500 transition-colors group/metric">
                                          <MessageCircle className="h-4 w-4" />
                                          <span className="text-xs tabular-nums group-hover/metric:text-blue-500">{formatMetric(tweet.replies)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 hover:text-green-500 transition-colors group/metric">
                                          <Repeat className="h-4 w-4" />
                                          <span className="text-xs tabular-nums group-hover/metric:text-green-500">{formatMetric(tweet.reposts)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 hover:text-pink-500 transition-colors group/metric">
                                          <Heart className="h-4 w-4" />
                                          <span className="text-xs tabular-nums group-hover/metric:text-pink-500">{formatMetric(tweet.likes)}</span>
                                        </div>
                                        <div className="hover:text-primary transition-colors">
                                          <Share className="h-4 w-4" />
                                        </div>
                                      </div>
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-2 opacity-50">No tweets available.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Popup>
            )}
          </MapGL>
        </main>
      </div>
    </div>
  );
}
