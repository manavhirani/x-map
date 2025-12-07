import { NextRequest, NextResponse } from "next/server";

const X_API_BASE = "https://api.x.com/2";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "";
    const maxResults = 10;

    const bearerToken = process.env.X_BEARER_TOKEN || process.env.BEARER_TOKEN;

    if (!bearerToken) {
      return NextResponse.json(
        { error: "X_BEARER_TOKEN or BEARER_TOKEN not found" },
        { status: 500 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: "query parameter is required" },
        { status: 400 }
      );
    }

    // Fetch posts with user location data (no has:geo filter - we'll use user locations)
    const params = new URLSearchParams({
      query: query,
      max_results: Math.min(maxResults * 5, 100).toString(), // Get more to filter by location
      "tweet.fields": "created_at,author_id",
      expansions: "author_id",
      "user.fields": "location,name,username", // Get user location
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

    const data = await response.json();

    console.log("X API Response:", {
      total: data.data?.length || 0,
      users: data.includes?.users?.length || 0,
      usersWithLocation: data.includes?.users?.filter((u: any) => u.location)?.length || 0,
    });

    // Extract users with location data
    const usersWithLocation = (data.includes?.users || [])
      .filter((user: any) => user.location && user.location.trim())
      .map((user: any) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        location: user.location.trim(),
      }));

    console.log(`Found ${usersWithLocation.length} users with location data`);

    // Geocode user locations (with batching to respect rate limits)
    // Process in smaller batches to avoid overwhelming the geocoding service
    const batchSize = 5;
    const geoData: any[] = [];

    for (let i = 0; i < Math.min(usersWithLocation.length, maxResults * 2); i += batchSize) {
      const batch = usersWithLocation.slice(i, i + batchSize);

      const batchPromises = batch.map(async (user: any, index: number) => {
        try {
          // Stagger requests to respect Nominatim rate limit (1 req/sec)
          await new Promise(resolve => setTimeout(resolve, index * 1200)); // 1.2 seconds between requests

          const geocodeResponse = await fetch(
            `${request.nextUrl.origin}/api/geocode?location=${encodeURIComponent(user.location)}`,
            { signal: AbortSignal.timeout(10000) } // 10 second timeout
          );

          if (!geocodeResponse.ok) {
            // Handle rate limiting gracefully
            if (geocodeResponse.status === 429) {
              console.warn(`Rate limited for ${user.location}, skipping`);
            }
            return null;
          }

          const geocodeData = await geocodeResponse.json().catch(() => null);

          if (!geocodeData || !geocodeData.success || !geocodeData.coordinates) {
            return null;
          }

          return {
            id: `user-${user.id}`,
            coordinates: geocodeData.coordinates as [number, number],
            location: user.location,
            display_name: geocodeData.display_name,
            username: user.username,
            name: user.name,
            created_at: new Date().toISOString(), // Approximate
          };
        } catch (error: any) {
          // Silently handle individual geocoding failures
          if (error.name !== "AbortError") {
            console.error(`Geocoding error for ${user.location}:`, error.message || error);
          }
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter((item: any) => item !== null);
      geoData.push(...validResults);

      // Stop if we have enough results
      if (geoData.length >= maxResults) {
        break;
      }
    }

    const finalGeoData = geoData.slice(0, maxResults);

    console.log("Processed geo data:", finalGeoData.length, "locations from", usersWithLocation.length, "users");

    return NextResponse.json({
      success: true,
      query,
      count: finalGeoData.length,
      geoData: finalGeoData,
      usersProcessed: usersWithLocation.length,
      rateLimit: {
        remaining: response.headers.get("x-rate-limit-remaining"),
        reset: response.headers.get("x-rate-limit-reset"),
      },
    });
  } catch (error: any) {
    console.error("X API Geo Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch geo data",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
