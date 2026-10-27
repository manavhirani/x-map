import type { Tweet } from "@/lib/types";
import { getXBearerToken } from "./env";

const X_API_BASE = "https://api.x.com/2";

interface XUser {
  id: string;
  name?: string;
  username?: string;
  profile_image_url?: string;
}

interface XPost {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  lang?: string;
  public_metrics?: { like_count?: number; reply_count?: number; retweet_count?: number };
}

/**
 * Find recent English posts about a story with the X API v2 recent-search endpoint.
 * Tries a few query variants and returns the first non-empty result.
 * Returns `[]` when no bearer token is set or nothing matches.
 */
export async function fetchRealTweets(query: string, headline?: string): Promise<Tweet[]> {
  const bearerToken = getXBearerToken();
  if (!bearerToken) return [];

  const variants = [
    query,
    headline ? `${headline} ${query}` : query,
    query.split(" ").slice(0, 3).join(" "),
  ]
    .map((q) => q.trim().replace(/\s+/g, " "))
    .filter((q, i, arr) => q && arr.indexOf(q) === i);

  for (const variant of variants) {
    const params = new URLSearchParams({
      query: `${variant} -is:retweet -is:reply lang:en has:links`,
      max_results: "10",
      "tweet.fields": "created_at,author_id,public_metrics,text,lang",
      expansions: "author_id",
      "user.fields": "name,username,profile_image_url,verified",
    });

    try {
      const res = await fetch(`${X_API_BASE}/tweets/search/recent?${params}`, {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        console.warn(`[x-api] ${res.status} for "${variant}"`);
        // Other variants hit the same limit, so stop here.
        if (res.status === 429) break;
        continue;
      }

      const data: { data?: XPost[]; includes?: { users?: XUser[] } } = await res.json();
      const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u]));

      const tweets = (data.data ?? [])
        .filter((p) => p.lang === "en" && p.text.length > 10)
        .map((p): Tweet => {
          const user = users.get(p.author_id);
          const username = user?.username ?? "unknown";
          return {
            id: p.id,
            text: p.text,
            author: `@${username}`,
            name: user?.name ?? "Unknown",
            profile_pic: user?.profile_image_url ?? null,
            timestamp: p.created_at,
            likes: p.public_metrics?.like_count ?? 0,
            replies: p.public_metrics?.reply_count ?? 0,
            reposts: p.public_metrics?.retweet_count ?? 0,
            url: `https://x.com/${username}/status/${p.id}`,
          };
        });

      if (tweets.length > 0) return tweets;
    } catch (e) {
      console.error(`[x-api] Request failed for "${variant}":`, e);
    }
  }

  return [];
}
