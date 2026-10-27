/**
 * Live pipeline: Grok finds stories → Photon geocodes them →
 * X API attaches posts → results stream to the client and go to the cache.
 */
import type { NewsItem } from "@/lib/types";
import { getXBearerToken } from "./env";
import { geocodeLocation } from "./geocode";
import { normalizeQuery, requestNewsReports, type NewsReport, type Scope } from "./grok";
import { loadCachedNews, MAX_STORY_AGE_MS, saveNews } from "./news-cache";
import type { SendEvent } from "./sse";
import { fetchRealTweets } from "./x-api";

const TARGET_BY_SCOPE: Record<Scope, number> = { global: 40, region: 20, local: 5 };
const MAX_ATTEMPTS = 10;
const TIME_BUDGET_MS = 90_000;

export async function streamLiveNews({
  query,
  apiKey,
  send,
  signal,
}: {
  query: string;
  apiKey: string;
  send: SendEvent;
  signal: AbortSignal;
}) {
  const hasX = Boolean(getXBearerToken());
  send({
    type: "mode",
    mode: "live",
    message: hasX ? "Live: Grok + X API" : "Live: Grok only (X_BEARER_TOKEN not set, so no posts)",
  });

  send({ type: "status", message: "Analyzing query scope..." });
  const { normalizedKey, scope } = await normalizeQuery(query, apiKey);

  // 1. Cached stories first, so the map fills quickly.
  const known = new Set<string>();
  const cached = await loadCachedNews(normalizedKey);
  if (cached.length > 0) {
    send({ type: "status", message: `Found ${cached.length} cached stories for ${normalizedKey}` });
    for (const news of cached) {
      known.add(news.headline);
      send({ type: "news", news });
    }
  }

  // 2. Then fresh stories, until the target count or the time budget is reached.
  const target = TARGET_BY_SCOPE[scope];
  const count = Math.min(Math.max(target - cached.length, 5), 20);
  send({ type: "status", message: `Scanning ${scope} news for updates (fetching ${count})...` });

  const started = Date.now();
  let found = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && found < count; attempt++) {
    if (signal.aborted || Date.now() - started > TIME_BUDGET_MS) break;
    if (attempt > 1) send({ type: "status", message: `Scanning for more... (${found}/${count} found)` });

    let reports: NewsReport[];
    try {
      reports = await requestNewsReports({
        apiKey,
        topic: normalizedKey,
        scope,
        count,
        exclude: [...known],
        attempt,
      });
    } catch (e) {
      console.error(`[live-news] Attempt ${attempt} failed:`, e);
      continue;
    }

    const batch: NewsItem[] = [];
    for (const report of reports) {
      if (signal.aborted) break;
      const news = await buildNewsItem(report, known, send);
      if (!news) continue;
      known.add(news.headline);
      batch.push(news);
      send({ type: "news", news });
    }

    found += batch.length;
    await saveNews(batch, normalizedKey, query);
  }

  send({ type: "status", message: `Loaded ${cached.length + found} stories` });
}

async function buildNewsItem(report: NewsReport, known: Set<string>, send: SendEvent): Promise<NewsItem | null> {
  if (known.has(report.headline)) return null;
  if (report.timestamp && Date.now() - new Date(report.timestamp).getTime() > MAX_STORY_AGE_MS) return null;

  send({ type: "status", message: `Found: ${report.headline}` });
  const coordinates = await geocodeLocation(report.location);
  if (!coordinates) return null;

  const top_tweets = report.search_query ? await fetchRealTweets(report.search_query, report.headline) : [];

  return {
    id: crypto.randomUUID(),
    headline: report.headline,
    location: report.location,
    summary: report.summary,
    category: report.category || "General",
    coordinates,
    timestamp: new Date().toISOString(),
    top_tweets,
  };
}
