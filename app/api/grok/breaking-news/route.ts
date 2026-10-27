import type { NextRequest } from "next/server";
import { demoNewsEvents } from "@/lib/demo-data";
import { getXaiApiKey } from "@/lib/server/env";
import { streamLiveNews } from "@/lib/server/live-news";
import { sseResponse } from "@/lib/server/sse";

export const dynamic = "force-dynamic";

/**
 * GET /api/grok/breaking-news?query=<optional topic>
 *
 * Streams `NewsStreamEvent`s (see lib/types.ts) as Server-Sent Events.
 * Without `XAI_API_KEY`, it streams the built-in sample stories instead.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const apiKey = getXaiApiKey();

  return sseResponse(request.signal, async (send, signal) => {
    if (!apiKey) {
      const reason = "XAI_API_KEY is not set: showing sample data. Add your keys to .env.local for live news.";
      for await (const event of demoNewsEvents(query, { reason, signal })) {
        // sseResponse sends its own `complete`.
        if (event.type !== "complete") send(event);
      }
      return;
    }
    await streamLiveNews({ query, apiKey, send, signal });
  });
}
