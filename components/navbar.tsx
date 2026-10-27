"use client";

import Link from "next/link";
import { Globe, Loader2, Map as MapIcon, Newspaper, Search } from "lucide-react";
import { GitHubLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { REPO_URL } from "@/lib/config";

interface NavbarProps {
  /** Search box. Hidden when not set. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
  };
  loading?: boolean;
  onTopNews?: () => void;
  /** Globe / flat map toggle. Hidden when not set. */
  globe?: { enabled: boolean; onToggle: () => void };
}

export function Navbar({ search, loading = false, onTopNews, globe }: NavbarProps) {
  return (
    <nav className="relative z-30 h-14 shrink-0 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-full items-center gap-3 px-3 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight" aria-label="X-Map home">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-violet-500 to-rose-500 text-white shadow-sm">
            <Globe className="size-4" />
          </span>
          <span className="hidden sm:inline">X-Map</span>
        </Link>

        {search && (
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              search.onSubmit(search.value.trim());
            }}
            className="max-w-md flex-1"
          >
            <label className="relative block">
              <span className="sr-only">Search news</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder="Search topics or places..."
                className="h-9 w-full rounded-lg border bg-background/70 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
            </label>
          </form>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {onTopNews && (
            <Button variant="ghost" size="sm" onClick={onTopNews} disabled={loading} title="Load top news">
              {loading ? <Loader2 className="animate-spin" /> : <Newspaper />}
              <span className="hidden md:inline">Top News</span>
            </Button>
          )}
          {globe && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={globe.onToggle}
              aria-label={globe.enabled ? "Switch to flat map" : "Switch to 3D globe"}
              title={globe.enabled ? "Switch to flat map" : "Switch to 3D globe"}
            >
              {globe.enabled ? <MapIcon /> : <Globe />}
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" asChild>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="Source code on GitHub">
              <GitHubLogo />
            </a>
          </Button>
        </div>
      </div>
    </nav>
  );
}
