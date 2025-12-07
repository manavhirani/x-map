import { NextRequest, NextResponse } from "next/server";

const X_API_BASE = "https://api.x.com/2";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "Indigo";
    const maxResults = parseInt(searchParams.get("maxResults") || "100");

    const bearerToken = process.env.X_BEARER_TOKEN || process.env.BEARER_TOKEN;

    if (!bearerToken) {
      return NextResponse.json(
        { error: "X_BEARER_TOKEN or BEARER_TOKEN not found in environment variables" },
        { status: 500 }
      );
    }

    // Use REST API directly for reliability
    const params = new URLSearchParams({
      query,
      max_results: Math.min(maxResults, 100).toString(),
      "tweet.fields": "created_at,author_id,geo,public_metrics,text,context_annotations",
      "user.fields": "username,location,description,name",
      expansions: "author_id,geo.place_id",
    });

    const response = await fetch(
      `${X_API_BASE}/tweets/search/recent?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `X API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const searchResponse = await response.json();

    // Extract posts with location information
    const postsWithLocation = searchResponse.data
      ?.filter((post: any) => {
        // Check if post has geo data or user location
        const user = searchResponse.includes?.users?.find(
          (u: any) => u.id === post.author_id
        );
        return post.geo || (user && user.location);
      })
      .map((post: any) => {
        const user = searchResponse.includes?.users?.find(
          (u: any) => u.id === post.author_id
        );

        return {
          id: post.id,
          text: post.text,
          author_id: post.author_id,
          username: user?.username,
          user_location: user?.location,
          created_at: post.created_at,
          geo: post.geo,
          public_metrics: post.public_metrics,
        };
      }) || [];

    const rateLimitRemaining = response.headers.get("x-rate-limit-remaining");
    const rateLimitReset = response.headers.get("x-rate-limit-reset");

    return NextResponse.json({
      success: true,
      query,
      total: searchResponse.data?.length || 0,
      withLocation: postsWithLocation.length,
      posts: postsWithLocation.slice(0, 50), // Return first 50
      meta: searchResponse.meta,
      rateLimit: {
        remaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
        reset: rateLimitReset ? parseInt(rateLimitReset) : null,
      },
    });
  } catch (error: any) {
    console.error("X API Search Error:", error);
    return NextResponse.json(
      {
        error: "Failed to search X API",
        message: error.message,
        details: error.response?.data || error,
      },
      { status: 500 }
    );
  }
}
