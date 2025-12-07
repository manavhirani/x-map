// ... imports ...
// REMOVE DropdownMenu imports if not used elsewhere, or keep if standard. 
// For cleanliness, I'll revert to before the dropdown was added.

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Switch } from "@/components/ui/switch";
import {
  Globe,
  Map,
  Search,
  ChevronUp,
  ChevronDown,
  Radio,
  Sparkles,
  Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  globeMode?: boolean;
  onGlobeModeChange?: (enabled: boolean) => void;
  mapMode?: "normal" | "heatmap";
  onMapModeChange?: (mode: "normal" | "heatmap") => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  geoCount?: number;
  streaming?: boolean;
  onStreamingToggle?: () => void;
  searchMode?: "x" | "grok";
  onSearchModeChange?: (mode: "x" | "grok") => void;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
  onTopNews?: () => void;
}

export function Navbar({
  globeMode,
  onGlobeModeChange,
  mapMode = "normal",
  onMapModeChange,
  searchQuery = "",
  onSearchQueryChange,
  onSearch,
  loading = false,
  geoCount = 0,
  streaming = false,
  onStreamingToggle,
  searchMode = "x",
  onSearchModeChange,
  sidebarOpen = true,
  onSidebarToggle,
  onTopNews,
}: NavbarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <nav className="relative z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 h-full">
        <div className="flex items-center justify-between gap-3">
          {/* Search Input */}
          {onSearch && onSearchQueryChange && (
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Search for topics, locations..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            </form>
          )}

          <div className="flex items-center gap-2">
            {onTopNews && (
              <button
                onClick={onTopNews}
                className="px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-sm"
                aria-label="Load top news"
                title="Load top news (30-40 articles)"
              >
                <Newspaper className="h-4 w-4" />
                Top News
              </button>
            )}

            {globeMode !== undefined && onGlobeModeChange && (
              <button
                onClick={() => onGlobeModeChange(!globeMode)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label={
                  globeMode ? "Switch to 2D map" : "Switch to 3D globe"
                }
                title={globeMode ? "Switch to 2D map" : "Switch to 3D globe"}
              >
                {globeMode ? (
                  <Map className="h-4 w-4" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
