/**
 * SQLite cache (via Prisma) for stories and the queries that found them.
 * Every function here is best-effort: if the database is not set up,
 * it logs a warning and the app keeps working without a cache.
 */
import type { NewsItem } from "@/lib/types";
import { prisma } from "./prisma";

const QUERY_TTL_MS = 6 * 60 * 60 * 1000;
export const MAX_STORY_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function toISO(value: Date | string | null | undefined): string {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/** Stories from a recent search with the same normalised key. */
export async function loadCachedNews(normalizedKey: string): Promise<NewsItem[]> {
  try {
    const cached = await prisma.searchQuery.findFirst({
      where: { normalizedKey, timestamp: { gt: new Date(Date.now() - QUERY_TTL_MS) } },
      include: {
        items: {
          where: { timestamp: { gt: new Date(Date.now() - MAX_STORY_AGE_MS) } },
          include: { tweets: true },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    return (cached?.items ?? []).map((item) => ({
      id: item.id,
      headline: item.headline,
      location: item.location,
      summary: item.summary,
      category: item.category,
      coordinates: JSON.parse(item.coordinates),
      timestamp: toISO(item.timestamp),
      top_tweets: item.tweets.map((t) => ({
        id: t.id,
        author: t.author,
        name: t.name ?? t.author,
        text: t.text,
        url: t.url ?? undefined,
        timestamp: toISO(t.timestamp),
        likes: t.likes ?? undefined,
        replies: t.replies ?? undefined,
        reposts: t.reposts ?? undefined,
        profile_pic: t.profilePic,
      })),
    }));
  } catch (e) {
    console.warn("[cache] Read skipped (database not available?):", (e as Error).message);
    return [];
  }
}

/** Save new stories and link them to the search query that found them. */
export async function saveNews(items: NewsItem[], normalizedKey: string, originalQuery: string) {
  if (items.length === 0) return;
  try {
    const ids: string[] = [];
    for (const item of items) {
      const existing = await prisma.newsItem.findFirst({
        where: { headline: item.headline, location: item.location },
        select: { id: true },
      });
      if (existing) {
        ids.push(existing.id);
        continue;
      }
      await prisma.newsItem.create({
        data: {
          id: item.id,
          headline: item.headline,
          location: item.location,
          summary: item.summary,
          category: item.category,
          coordinates: JSON.stringify(item.coordinates),
          timestamp: new Date(item.timestamp),
          tweets: {
            // Post IDs are global, so skip posts another story already saved.
            connectOrCreate: (item.top_tweets ?? []).map((t) => ({
              where: { id: String(t.id) },
              create: {
                id: String(t.id),
                author: t.author,
                name: t.name ?? t.author,
                text: t.text,
                url: t.url,
                timestamp: toISO(t.timestamp),
                likes: String(t.likes ?? 0),
                replies: String(t.replies ?? 0),
                reposts: String(t.reposts ?? 0),
                profilePic: t.profile_pic ?? null,
              },
            })),
          },
        },
      });
      ids.push(item.id);
    }

    const connect = ids.map((id) => ({ id }));
    const query = await prisma.searchQuery.findFirst({ where: { normalizedKey } });
    if (query) {
      await prisma.searchQuery.update({
        where: { id: query.id },
        data: { timestamp: new Date(), items: { connect } },
      });
    } else {
      await prisma.searchQuery.create({
        data: { originalQuery: originalQuery || "Global News", normalizedKey, items: { connect } },
      });
    }
  } catch (e) {
    console.warn("[cache] Write skipped (database not available?):", (e as Error).message);
  }
}
