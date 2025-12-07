import { NextRequest, NextResponse } from "next/server";
import { Client, type ClientConfig } from "@xdevplatform/xdk";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "Indigo";

    // Get credentials from environment variables
    const bearerToken = process.env.X_BEARER_TOKEN;

    if (!bearerToken) {
      return NextResponse.json(
        { error: "X_BEARER_TOKEN not found in environment variables" },
        { status: 500 },
      );
    }

    const config: ClientConfig = { bearerToken };
    const client = new Client(config);

    // Test 1: Search for posts
    console.log(`Testing X API with query: ${query}`);

    // Try different XDK methods - the API might vary
    let searchResponse: any;
    try {
      // Try searchAll method first
      if (typeof client.posts.searchAll === "function") {
        searchResponse = await client.posts.searchAll(query, {
          maxResults: 10,
          tweetFields: [
            "created_at",
            "author_id",
            "geo",
            "public_metrics",
            "text",
          ],
          expansions: ["author_id"],
          userFields: ["username", "location", "name"],
        });
      } else {
        // Direct REST API call as fallback
        const response = await fetch(
          `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=created_at,author_id,geo,public_metrics,text&user.fields=username,location`,
          {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              "Content-Type": "application/json",
            },
          },
        );
        searchResponse = await response.json();
      }
    } catch (methodError: any) {
      console.error("Method error, trying direct REST API:", methodError);
      // Fallback to direct REST API
      const response = await fetch(
        `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=created_at,author_id,geo,public_metrics,text&user.fields=username,location`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      searchResponse = await response.json();
    }

    return NextResponse.json({
      success: true,
      query,
      count: searchResponse.data?.length || 0,
      posts: searchResponse.data?.slice(0, 5).map((post: any) => ({
        id: post.id,
        text: post.text?.substring(0, 100),
        author_id: post.author_id,
        created_at: post.created_at,
        geo: post.geo,
        public_metrics: post.public_metrics,
      })),
      meta: searchResponse.meta,
    });
  } catch (error: any) {
    console.error("X API Test Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch from X API",
        message: error.message,
        details: error.response?.data || error,
      },
      { status: 500 },
    );
  }
}
