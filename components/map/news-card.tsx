"use client";

import { memo } from "react";
import { MapPin, X } from "lucide-react";
import { getCategoryColor } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/format";
import type { NewsItem } from "@/lib/types";
import { XLogo } from "@/components/icons";
import { TweetCard } from "./tweet-card";

interface NewsCardProps {
  item: NewsItem;
  /** Shows a close button when set. */
  onClose?: () => void;
}

/** Story details and its posts, shown in the map popup. */
export const NewsCard = memo(function NewsCard({ item, onClose }: NewsCardProps) {
  const color = getCategoryColor(item.category);
  const tweets = item.top_tweets ?? [];
  const time = formatRelativeTime(item.timestamp);

  return (
    <article className="w-[min(340px,85vw)] overflow-hidden rounded-xl border bg-card/95 text-card-foreground shadow-2xl backdrop-blur-md">
      <header className="border-b p-3" style={{ background: `linear-gradient(135deg, ${color}22, transparent 60%)` }}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${color}26`, color }}
          >
            {item.category}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close story"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <h3 className="text-sm font-bold leading-snug">{item.headline}</h3>
        <p className="mt-1.5 text-xs leading-normal text-foreground/80">{item.summary}</p>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="size-3" />
          {item.location}
          {time && ` · ${time} ago`}
        </p>
      </header>

      <div className="p-3">
        {tweets.length > 0 ? (
          <>
            <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
              <XLogo className="size-3" />
              <h4 className="text-[10px] font-bold uppercase tracking-wider">Top posts</h4>
            </div>
            <div className="custom-scrollbar max-h-[240px] space-y-2 overflow-y-auto pr-1">
              {tweets.map((tweet, i) => (
                <TweetCard key={tweet.id ?? i} tweet={tweet} fallbackQuery={item.headline} />
              ))}
            </div>
          </>
        ) : (
          <p className="py-2 text-center text-xs italic text-muted-foreground">No posts available.</p>
        )}
      </div>
    </article>
  );
});
