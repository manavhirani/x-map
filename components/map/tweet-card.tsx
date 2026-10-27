"use client";

import { memo, useState } from "react";
import { Heart, MessageCircle, Repeat } from "lucide-react";
import { formatMetric, formatRelativeTime } from "@/lib/format";
import type { Tweet } from "@/lib/types";
import { XLogo } from "@/components/icons";

/** Stable hue from a string, for initials avatars. */
function hueFor(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

function Avatar({ handle, src }: { handle: string; src?: string }) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote avatar, size is fixed and tiny
      <img
        src={src}
        alt=""
        loading="lazy"
        className="size-8 shrink-0 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: `hsl(${hueFor(handle)} 65% 45%)` }}
    >
      {handle[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

interface TweetCardProps {
  tweet: Tweet;
  /** Used for an X search link when the post has no URL. */
  fallbackQuery: string;
}

export const TweetCard = memo(function TweetCard({ tweet, fallbackQuery }: TweetCardProps) {
  const handle = tweet.author.replace(/^@/, "");
  // Sample posts have no real author, so they get no avatar lookup and no link.
  const avatarSrc = tweet.isSample
    ? undefined
    : tweet.profile_pic || `https://unavatar.io/x/${handle}?fallback=false`;
  const href = tweet.isSample
    ? undefined
    : tweet.url || `https://x.com/search?q=${encodeURIComponent(tweet.text || fallbackQuery)}&src=typed_query`;
  const time = formatRelativeTime(tweet.timestamp);

  const body = (
    <div className="rounded-xl border bg-card p-3 transition-colors group-hover:bg-muted/40">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar handle={handle} src={avatarSrc} />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{tweet.name || tweet.author}</span>
            <span className="truncate text-xs text-muted-foreground">
              @{handle}
              {time && ` · ${time}`}
            </span>
          </div>
        </div>
        {tweet.isSample ? (
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            Sample
          </span>
        ) : (
          <XLogo className="size-3.5 shrink-0 text-muted-foreground/60" />
        )}
      </div>

      <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{tweet.text}</p>

      <div className="flex items-center gap-6 text-xs tabular-nums text-muted-foreground">
        <span className="flex items-center gap-1" title="Replies">
          <MessageCircle className="size-3.5" /> {formatMetric(tweet.replies)}
        </span>
        <span className="flex items-center gap-1" title="Reposts">
          <Repeat className="size-3.5" /> {formatMetric(tweet.reposts)}
        </span>
        <span className="flex items-center gap-1" title="Likes">
          <Heart className="size-3.5" /> {formatMetric(tweet.likes)}
        </span>
      </div>
    </div>
  );

  if (!href) return <div className="group">{body}</div>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="group block no-underline">
      {body}
    </a>
  );
});
