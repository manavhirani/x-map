import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to safely convert timestamp to ISO string
function toISOStringSafe(timestamp: any): string {
  if (!timestamp) {
    return new Date().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === 'string') {
    // If it's already an ISO string, return it
    if (timestamp.includes('T') && timestamp.includes('Z')) {
      return timestamp;
    }
    // Try to parse and convert
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  // Fallback
  return new Date().toISOString();
}

// Geocoding helper using Photon (OpenStreetMap)
async function geocodeLocation(location: string): Promise<number[] | null> {
  try {
    const encoded = encodeURIComponent(location);
    const res = await fetch(`https://photon.komoot.io/api/?q=${encoded}&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].geometry.coordinates; // [lon, lat]
      }
    }
  } catch (e) {
    console.error(`Geocoding error for ${location}:`, e);
  }
  return null;
}

// X API Helper to fetch REAL tweets with improved search
async function fetchRealTweets(query: string, headline?: string): Promise<any[]> {
  const bearerToken = process.env.X_BEARER_TOKEN || process.env.BEARER_TOKEN;
  if (!bearerToken) {
    console.warn("[X API] No bearer token found");
    return [];
  }

  // Try multiple query variations for better results
  const queryVariations = [
    query, // Original query
    headline ? `${headline} ${query}` : query, // Combine headline + query
    query.split(' ').slice(0, 3).join(' '), // First 3 words
  ].filter((q, i, arr) => arr.indexOf(q) === i); // Remove duplicates

  for (const searchQuery of queryVariations) {
    try {
      // Clean and optimize the query
      const cleanQuery = searchQuery.trim().replace(/\s+/g, ' ');

      const params = new URLSearchParams({
        query: `${cleanQuery} -is:retweet -is:reply lang:en has:links`, // Require links for better quality
        max_results: "10",
        "tweet.fields": "created_at,author_id,public_metrics,text,lang",
        "expansions": "author_id",
        "user.fields": "name,username,profile_image_url,verified"
      });

      const res = await fetch(`https://api.x.com/2/tweets/search/recent?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        console.warn(`[X API] Request failed: ${res.status} - ${errorText.substring(0, 100)}`);

        // If rate limited, wait a bit before trying next variation
        if (res.status === 429) {
          const retryAfter = res.headers.get('x-rate-limit-reset');
          if (retryAfter) {
            console.warn(`[X API] Rate limited. Reset at: ${retryAfter}`);
          }
          // Don't try other variations if rate limited
          break;
        }
        continue; // Try next variation
      }

      const data = await res.json();

      if (!data.data || data.data.length === 0) {
        console.log(`[X API] No results for query: "${cleanQuery}"`);
        continue; // Try next variation
      }

      const users = new Map(data.includes?.users?.map((u: any) => [u.id, u]) || []);

      const tweets = data.data
        .filter((tweet: any) => tweet.lang === 'en') // Ensure English
        .map((tweet: any) => {
          const user: any = users.get(tweet.author_id) || {};
          return {
            id: tweet.id, // REAL ID
            text: tweet.text,
            author: `@${user.username || 'unknown'}`,
            name: user.name || 'Unknown',
            profile_pic: user.profile_image_url || null,
            verified: user.verified || false,
            timestamp: tweet.created_at,
            likes: tweet.public_metrics?.like_count || 0,
            replies: tweet.public_metrics?.reply_count || 0,
            reposts: tweet.public_metrics?.retweet_count || 0,
            url: `https://x.com/${user.username}/status/${tweet.id}` // REAL VALID URL
          };
        })
        .filter((t: any) => t.text && t.text.length > 10); // Filter out very short tweets

      if (tweets.length > 0) {
        console.log(`[X API] Found ${tweets.length} real tweets for query: "${cleanQuery}"`);
        return tweets;
      }
    } catch (e: any) {
      console.error(`[X API] Error for query "${searchQuery}":`, e.message || e);
      continue; // Try next variation
    }
  }

  console.log(`[X API] No tweets found after trying ${queryVariations.length} query variations`);
  return [];
}

// 1. Grok-Powered Semantic Normalization
async function normalizeQuery(query: string, apiKey: string): Promise<{ normalizedKey: string; scope: "global" | "region" | "local" }> {
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a query normalizer. Output JSON only: { \"key\": \"standardized_topic_or_location\", \"scope\": \"global\"|\"region\"|\"local\" }. Example: \"news in paris\" -> { \"key\": \"France - Paris\", \"scope\": \"local\" }. \"US politics\" -> { \"key\": \"USA - Politics\", \"scope\": \"region\" }. Do NOT output markdown." },
          { role: "user", content: query || "Global News" }
        ],
        model: "grok-4-fast-non-reasoning",
        stream: false,
        temperature: 0
      })
    });
    const data = await res.json();
    let content = data.choices[0].message.content;
    // Sanitize markdown
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const json = JSON.parse(content);
    return { normalizedKey: json.key || query, scope: json.scope || "global" };
  } catch (e) {
    console.error("Normalize Error", e);
    return { normalizedKey: query || "Global News", scope: "global" };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get("query") || "";
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "XAI_API_KEY Config Missing" }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;
      let existingHeadlines: string[] = [];
      const safeEnqueue = (msg: string) => { if (isActive) try { controller.enqueue(encoder.encode(msg)); } catch (e) { } };
      const cleanup = () => { isActive = false; try { controller.close(); } catch (e) { } };
      request.signal.addEventListener("abort", cleanup);

      safeEnqueue(`data: ${JSON.stringify({ type: "connected", message: "Connecting..." })}\n\n`);

      try {
        // 1. Normalize Query
        safeEnqueue(`data: ${JSON.stringify({ type: "status", message: "Analyzing query scope..." })}\n\n`);
        const { normalizedKey, scope } = await normalizeQuery(rawQuery, apiKey);
        console.log("Normalized:", normalizedKey, scope);

        // 2. Check Cache (Last 6 hours for query, but items must be within 7 days)
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const cachedQuery = await prisma.searchQuery.findFirst({
          where: {
            normalizedKey,
            timestamp: { gt: sixHoursAgo }
          },
          include: {
            items: {
              // Enforce 7-day limit on cached items
              where: { timestamp: { gt: sevenDaysAgo } },
              include: { tweets: true }
            }
          },
          orderBy: { timestamp: "desc" }
        });

        if (cachedQuery && cachedQuery.items.length > 0) {
          safeEnqueue(`data: ${JSON.stringify({ type: "status", message: `Found cached results for ${normalizedKey}` })}\n\n`);
          for (const item of cachedQuery.items) {
            existingHeadlines.push(item.headline);
            const newsItem = {
              id: item.id,
              headline: item.headline,
              location: item.location,
              summary: item.summary,
              category: item.category,
              coordinates: JSON.parse(item.coordinates),
              timestamp: toISOStringSafe(item.timestamp),
              top_tweets: item.tweets.map(t => ({
                author: t.author,
                name: t.name || t.author,
                text: t.text,
                url: t.url,
                id: t.id,
                timestamp: toISOStringSafe(t.timestamp), // Ensure ISO
                likes: t.likes,
                replies: t.replies,
                reposts: t.reposts,
                profile_pic: t.profilePic
              }))
            };
            safeEnqueue(`data: ${JSON.stringify({ type: "news", news: newsItem })}\n\n`);
          }
          // Do NOT return here. Continue to fetch fresh data.
        }

        // 3. Fetch Fresh Data (Variable Quantity)
        const targetCount = scope === "global" ? 40 : (scope === "region" ? 20 : 5);

        // Calculate how many more we need to reach the target, but always fetch at least 5 fresh ones
        const cachedCount = existingHeadlines.length;
        const neededCount = Math.max(0, targetCount - cachedCount);
        const fetchCount = Math.min(Math.max(neededCount, 5), 20); // Cap to 20 per request

        safeEnqueue(`data: ${JSON.stringify({ type: "status", message: `Scanning ${scope} scope for updates (Quality target: ${targetCount}, Fetching: ${fetchCount})...` })}\n\n`);

        const systemPrompt = `You are an AI journalist assistant powered by X's Grok.
Role: Identify confirmed, high-impact news events from the LAST 7 DAYS.
Current Date: ${new Date().toISOString()}
Context: User is interested in "${normalizedKey}". Scope is ${scope}.
Target Quantity: ~${fetchCount} distinct stories.

Requirements:
- You MUST call the \`report_news\` function ${fetchCount} SEPARATE times.
- ONE tool call per story. Do NOT combine them.
- Categories: Breaking News, Conflict, Politics, Science, Technology, Sports, Research, Uplifting, Business.
- Verified facts only. No duplicates.
- STRICTLY IGNORE events older than 7 days from today.
- PROVIDE SEARCH KEYWORDS: For each story, provide a "search_query" optimized to find top tweets about it on X.
`;

        let userContent = `Find ${fetchCount} distinct breaking news stories for "${normalizedKey}". Return headline, location, and a search query for X.`;
        if (existingHeadlines.length > 0) {
          userContent += `\n\nIMPORTANT: Do NOT report any of the following stories as they are already known:\n- ${existingHeadlines.join('\n- ')}`;
        }

        console.log(`[Grok] Starting fetch for ${normalizedKey} (Scope: ${scope}, Fetching: ${fetchCount}, Cached: ${cachedCount})`);

        let fetchedCount = 0;
        let attempts = 0;
        const processStartTime = Date.now();

        // Loop until we have enough items or hit limits
        while (fetchedCount < fetchCount && attempts < 10 && (Date.now() - processStartTime) < 90000) {
          attempts++;
          if (attempts > 1) {
            safeEnqueue(`data: ${JSON.stringify({ type: "status", message: `Scanning for more... (${fetchedCount}/${fetchCount} found)` })}\n\n`);
          }

          try {
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userContent }
                ],
                model: "grok-4-fast-non-reasoning",
                stream: true,
                temperature: 0.2 + (attempts * 0.1), // Increase temp slightly on retries
                tools: [{
                  type: "function",
                  function: {
                    name: "report_news",
                    description: "Report a news event",
                    parameters: {
                      type: "object",
                      properties: {
                        headline: { type: "string" },
                        location: { type: "string" },
                        summary: { type: "string" },
                        category: { type: "string" },
                        timestamp: { type: "string" },
                        search_query: { type: "string", description: "Keywords to search for real tweets about this event on X. e.g. 'Japan Earthquake'" },
                        // Optional fallback if we can't fetch real ones, but we prioritize search_query
                        top_tweets: {
                          type: "array",
                          items: { type: "object", properties: { author: { type: "string" }, text: { type: "string" } } }
                        }
                      },
                      required: ["headline", "location", "summary", "search_query"]
                    }
                  }
                }],
                tool_choice: { type: "function", function: { name: "report_news" } }
              })
            });

            if (!response.ok) throw new Error("Grok API Error");

            const createdItemsIds: string[] = [];
            const reader = response.body?.getReader();
            if (!reader) break;
            const decoder = new TextDecoder();
            const toolCallsMap = new Map<number, string>();
            let buffer = "";

            function processLine(line: string) {
              if (!line.trim() || line.startsWith("data: [DONE]")) return;
              try {
                const json = JSON.parse(line.replace("data: ", ""));
                const delta = json.choices?.[0]?.delta;
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index;
                    toolCallsMap.set(idx, (toolCallsMap.get(idx) || "") + (tc.function?.arguments || ""));
                  }
                }
              } catch (e) { }
            }

            while (isActive) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) processLine(line);
            }
            if (buffer.trim()) processLine(buffer);

            console.log(`[Grok] Attempt ${attempts}: Found ${toolCallsMap.size} tool calls.`);

            // Process accumulated tools
            for (const [idx, jsonArgs] of toolCallsMap.entries()) {
              try {
                console.log(`[Grok] Processing Call ${idx}`);
                const args = JSON.parse(jsonArgs);
                if (!args.headline || !args.location) continue;

                // Duplicate Check in Current Run
                if (existingHeadlines.includes(args.headline)) continue;

                if (args.timestamp) {
                  const itemDate = new Date(args.timestamp);
                  if (itemDate < sevenDaysAgo) {
                    console.log(`[Grok] Skipping old item: ${args.headline}`);
                    continue;
                  }
                }

                safeEnqueue(`data: ${JSON.stringify({ type: "status", message: `Found: ${args.headline}` })}\n\n`);
                const coords = await geocodeLocation(args.location);
                if (!coords) continue;

                // --- FETCH REAL TWEETS FROM X API ---
                let realTweets: any[] = [];
                if (args.search_query) {
                  safeEnqueue(`data: ${JSON.stringify({ type: "status", message: `Fetching real tweets from X API: "${args.search_query}"...` })}\n\n`);
                  realTweets = await fetchRealTweets(args.search_query, args.headline);

                  if (realTweets.length > 0) {
                    safeEnqueue(`data: ${JSON.stringify({ type: "status", message: `Found ${realTweets.length} real tweets from X API` })}\n\n`);
                  } else {
                    safeEnqueue(`data: ${JSON.stringify({ type: "status", message: `No tweets found on X API for: ${args.headline}` })}\n\n`);
                  }
                }

                // Show news item even without tweets - but prefer items with real tweets
                if (realTweets.length === 0) {
                  console.log(`[Grok] No real X API tweets found for ${args.headline} ("${args.search_query}"). Showing item without tweets.`);
                }

                const newsItem = {
                  id: crypto.randomUUID(),
                  headline: args.headline,
                  location: args.location,
                  summary: args.summary,
                  category: args.category || "General",
                  coordinates: coords,
                  timestamp: new Date().toISOString(),
                  top_tweets: realTweets
                };

                safeEnqueue(`data: ${JSON.stringify({ type: "news", news: newsItem })}\n\n`);

                // DB Save & Link
                try {
                  await prisma.newsItem.create({
                    data: {
                      id: newsItem.id,
                      headline: newsItem.headline,
                      location: newsItem.location,
                      summary: newsItem.summary,
                      category: newsItem.category,
                      coordinates: JSON.stringify(newsItem.coordinates),
                      timestamp: new Date(newsItem.timestamp),
                      tweets: {
                        create: newsItem.top_tweets.map((t: any) => ({
                          id: String(t.id), // Real ID
                          author: t.author,
                          name: t.name || t.author,
                          text: t.text,
                          url: t.url, // Real URL
                          timestamp: t.timestamp ? new Date(t.timestamp).toISOString() : new Date().toISOString(),
                          likes: String(t.likes || 0),
                          replies: String(t.replies || 0),
                          reposts: String(t.reposts || 0),
                          profilePic: t.profile_pic
                        }))
                      }
                    }
                  });
                  createdItemsIds.push(newsItem.id);
                  existingHeadlines.push(newsItem.headline); // Add to exclusion list for next loop
                  fetchedCount++;
                } catch (createError) {
                  console.error(`[Grok] Failed to save item ${newsItem.headline}:`, createError);
                  // Attempt to recover linking
                  try {
                    const existingItem = await prisma.newsItem.findFirst({
                      where: { headline: newsItem.headline, location: newsItem.location }
                    });
                    if (existingItem) {
                      createdItemsIds.push(existingItem.id);
                      fetchedCount++; // Count as success since we linked it
                    }
                  } catch (findError) { }
                }
              } catch (e) { console.error(e); }
            } // End loop items

            // Link items to SearchQuery immediately after each batch
            if (cachedQuery) {
              if (createdItemsIds.length > 0) {
                await prisma.searchQuery.update({
                  where: { id: cachedQuery.id },
                  data: {
                    timestamp: new Date(),
                    items: { connect: createdItemsIds.map(id => ({ id })) }
                  }
                });
              }
            } else {
              if (createdItemsIds.length > 0) {
                const existingQ = await prisma.searchQuery.findFirst({ where: { normalizedKey } });
                if (existingQ) {
                  await prisma.searchQuery.update({
                    where: { id: existingQ.id },
                    data: { items: { connect: createdItemsIds.map(id => ({ id })) } }
                  });
                } else {
                  await prisma.searchQuery.create({
                    data: {
                      id: crypto.randomUUID(),
                      originalQuery: rawQuery || "Global News",
                      normalizedKey: normalizedKey,
                      items: { connect: createdItemsIds.map(id => ({ id })) }
                    }
                  });
                }
              }
            }

            // Update prompt for next loop to exclude new finds
            if (fetchedCount < fetchCount) {
              userContent += `\n\nIMPORTANT: Do NOT report any of the following stories as they are already known:\n- ${existingHeadlines.join('\n- ')}`;
            }

          } catch (e) {
            console.error("Grok Attempt Error", e);
          }

        } // End while loop

        safeEnqueue(`data: ${JSON.stringify({ success: true, type: "complete" })}\n\n`);

      } catch (e) {
        safeEnqueue(`data: ${JSON.stringify({ type: "error", message: String(e) })}\n\n`);
        console.error("Stream Error", e);
      }
      cleanup();
    }
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}
