import { NextRequest } from "next/server";
import { Client, type ClientConfig } from "@xdevplatform/xdk";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || "Indigo";
  const hashtag = searchParams.get("hashtag");
  const account = searchParams.get("account");

  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    return new Response(
      JSON.stringify({ error: "X_BEARER_TOKEN not found" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const config: ClientConfig = { bearerToken };
  const client = new Client(config);

  // Build filter query
  let filterQuery = "";
  if (hashtag) {
    filterQuery = `#${hashtag.replace("#", "")}`;
  } else if (account) {
    filterQuery = `from:${account.replace("@", "")}`;
  } else {
    filterQuery = query;
  }

  // Create a readable stream for Server-Sent Events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Set up filtered stream rules using stream API
        const ruleValue = filterQuery;
        const ruleTag = `filter_${Date.now()}`;

        try {
          // Update stream rules
          await client.stream.updateRules([
            {
              value: ruleValue,
              tag: ruleTag,
            },
          ]);
        } catch (ruleError: any) {
          console.error("Rule creation error:", ruleError);
          // Continue anyway - rule might already exist
        }

        // Start streaming using stream.posts()
        const stream = await client.stream.posts({
          tweetFields: ["created_at", "author_id", "geo", "public_metrics", "text"],
          userFields: ["username", "location", "description"],
        });

        // Handle stream events
        stream.on("data", (post: any) => {
          if (post.data) {
            const data = {
              id: post.data.id,
              text: post.data.text,
              author_id: post.data.author_id,
              created_at: post.data.created_at,
              geo: post.data.geo,
              public_metrics: post.data.public_metrics,
              user: post.includes?.users?.[0],
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        });

        stream.on("error", (error: any) => {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
          );
        });
      } catch (error: any) {
        console.error("Stream error:", error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
