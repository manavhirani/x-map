/** Calls to the xAI chat-completions API (Grok). */

const XAI_CHAT_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-4-fast-non-reasoning";

export type Scope = "global" | "region" | "local";

/** Arguments of one `report_news` tool call. */
export interface NewsReport {
  headline: string;
  location: string;
  summary: string;
  category?: string;
  timestamp?: string;
  search_query?: string;
}

async function chat(apiKey: string, body: Record<string, unknown>) {
  const res = await fetch(XAI_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, stream: false, ...body }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Grok API error ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

/**
 * Map a free-text query to a stable cache key and a scope.
 * "news in paris" → { normalizedKey: "France - Paris", scope: "local" }.
 */
export async function normalizeQuery(
  query: string,
  apiKey: string,
): Promise<{ normalizedKey: string; scope: Scope }> {
  const fallback = { normalizedKey: query || "Global News", scope: "global" as Scope };
  try {
    const data = await chat(apiKey, {
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            'You are a query normalizer. Output JSON only: { "key": "standardized_topic_or_location", "scope": "global"|"region"|"local" }. ' +
            'Example: "news in paris" -> { "key": "France - Paris", "scope": "local" }. "US politics" -> { "key": "USA - Politics", "scope": "region" }. Do NOT output markdown.',
        },
        { role: "user", content: query || "Global News" },
      ],
    });
    const content: string = data.choices[0].message.content.replace(/```(json)?/g, "").trim();
    const json = JSON.parse(content);
    return { normalizedKey: json.key || fallback.normalizedKey, scope: json.scope || "global" };
  } catch (e) {
    console.error("[grok] normalizeQuery failed:", e);
    return fallback;
  }
}

const REPORT_NEWS_TOOL = {
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
        search_query: {
          type: "string",
          description: "Keywords to search for real posts about this event on X, e.g. 'Japan Earthquake'",
        },
      },
      required: ["headline", "location", "summary", "search_query"],
    },
  },
};

/**
 * Ask Grok for up to `count` recent stories about `topic`.
 * Grok answers with one `report_news` tool call per story.
 */
export async function requestNewsReports({
  apiKey,
  topic,
  scope,
  count,
  exclude,
  attempt,
}: {
  apiKey: string;
  topic: string;
  scope: Scope;
  count: number;
  exclude: string[];
  attempt: number;
}): Promise<NewsReport[]> {
  const systemPrompt = `You are an AI journalist assistant powered by X's Grok.
Role: Identify confirmed, high-impact news events from the LAST 7 DAYS.
Current Date: ${new Date().toISOString()}
Context: User is interested in "${topic}". Scope is ${scope}.
Target Quantity: ~${count} distinct stories.

Requirements:
- You MUST call the \`report_news\` function ${count} SEPARATE times.
- ONE tool call per story. Do NOT combine them.
- Categories: Breaking News, Conflict, Politics, Science, Technology, Sports, Research, Uplifting, Business.
- Verified facts only. No duplicates.
- STRICTLY IGNORE events older than 7 days from today.
- PROVIDE SEARCH KEYWORDS: For each story, provide a "search_query" optimized to find top posts about it on X.`;

  let userContent = `Find ${count} distinct breaking news stories for "${topic}". Return headline, location, and a search query for X.`;
  if (exclude.length > 0) {
    userContent += `\n\nIMPORTANT: Do NOT report any of the following stories as they are already known:\n- ${exclude.join("\n- ")}`;
  }

  const data = await chat(apiKey, {
    // A little more variety on each retry.
    temperature: 0.2 + attempt * 0.1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [REPORT_NEWS_TOOL],
    tool_choice: { type: "function", function: { name: "report_news" } },
  });

  const calls: { function?: { arguments?: string } }[] = data.choices?.[0]?.message?.tool_calls ?? [];
  const reports: NewsReport[] = [];
  for (const call of calls) {
    try {
      const args = JSON.parse(call.function?.arguments ?? "{}");
      if (args.headline && args.location) reports.push(args);
    } catch {
      // Skip a malformed tool call.
    }
  }
  return reports;
}
