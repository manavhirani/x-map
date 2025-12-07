import { NextRequest } from "next/server";

const X_API_BASE = "https://api.x.com/2";

// Helper to check if controller is still open
function isControllerOpen(controller: ReadableStreamDefaultController): boolean {
  try {
    // Try to check the controller's state
    // If it's closed, accessing certain properties will throw
    return controller.desiredSize !== null;
  } catch {
    return false;
  }
}

// Helper to safely enqueue data
function safeEnqueue(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: string
): boolean {
  try {
    if (!isControllerOpen(controller)) {
      return false;
    }
    controller.enqueue(encoder.encode(data));
    return true;
  } catch (error: any) {
    if (error.name === "InvalidStateError" || error.message?.includes("closed")) {
      return false;
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || "";

  const bearerToken = process.env.X_BEARER_TOKEN || process.env.BEARER_TOKEN;

  if (!bearerToken) {
    return new Response(
      JSON.stringify({ error: "X_BEARER_TOKEN or BEARER_TOKEN not found" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!query) {
    return new Response(
      JSON.stringify({ error: "query parameter is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;
      let pollInterval: NodeJS.Timeout | null = null;

      // Cleanup function
      const cleanup = () => {
        isActive = false;
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        try {
          if (isControllerOpen(controller)) {
            controller.close();
          }
        } catch (error) {
          // Controller already closed, ignore
        }
      };

      // Handle client disconnect
      request.signal.addEventListener("abort", cleanup);

      // Send initial connection message
      if (!safeEnqueue(controller, encoder, `data: ${JSON.stringify({ type: "connected", message: "Stream started" })}\n\n`)) {
        cleanup();
        return;
      }

      // Poll for new geo-tagged posts every 5 seconds
      pollInterval = setInterval(async () => {
        if (!isActive || !isControllerOpen(controller)) {
          cleanup();
          return;
        }

        try {
          const params = new URLSearchParams({
            query: query,
            max_results: "30", // Get more to filter by location
            "tweet.fields": "created_at,author_id",
            expansions: "author_id",
            "user.fields": "location,name,username",
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
            const errorText = await response.text().catch(() => "Unknown error");
            console.error("Stream poll error:", response.status, errorText);

            // Only send error if controller is still open
            if (isControllerOpen(controller)) {
              safeEnqueue(
                controller,
                encoder,
                `data: ${JSON.stringify({
                  type: "error",
                  error: `API error: ${response.status}`,
                  message: errorText.substring(0, 200) // Limit error message length
                })}\n\n`
              );
            }
            return;
          }

          const data = await response.json().catch((error) => {
            console.error("Failed to parse response:", error);
            return { data: [], includes: { users: [] } };
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

          // Geocode user locations (limit to 5 for streaming to avoid rate limits)
          const geoDataPromises = usersWithLocation.slice(0, 5).map(async (user: any) => {
            try {
              const geocodeResponse = await fetch(
                `${request.nextUrl.origin}/api/geocode?location=${encodeURIComponent(user.location)}`,
                { signal: AbortSignal.timeout(5000) } // 5 second timeout
              );

              if (!geocodeResponse.ok) {
                return null;
              }

              const geocodeData = await geocodeResponse.json();

              if (!geocodeData.success || !geocodeData.coordinates) {
                return null;
              }

              return {
                id: `user-${user.id}`,
                coordinates: geocodeData.coordinates as [number, number],
                location: user.location,
                display_name: geocodeData.display_name,
                username: user.username,
                name: user.name,
                created_at: new Date().toISOString(),
              };
            } catch (error: any) {
              // Silently fail individual geocoding errors
              if (error.name !== "AbortError") {
                console.error(`Geocoding error for ${user.location}:`, error.message);
              }
              return null;
            }
          });

          const geoDataResults = await Promise.all(geoDataPromises);
          const geoData = geoDataResults.filter((item: any) => item !== null);

          // Send new geo data to client (only if controller is still open)
          if (geoData.length > 0 && isControllerOpen(controller)) {
            if (!safeEnqueue(
              controller,
              encoder,
              `data: ${JSON.stringify({ type: "geo", data: geoData })}\n\n`
            )) {
              cleanup();
              return;
            }
          }
        } catch (error: any) {
          console.error("Stream poll error:", error);

          // Only send error if controller is still open
          if (isControllerOpen(controller)) {
            if (!safeEnqueue(
              controller,
              encoder,
              `data: ${JSON.stringify({
                type: "error",
                error: error.message || "Unknown error",
                name: error.name
              })}\n\n`
            )) {
              cleanup();
              return;
            }
          }
        }
      }, 5000); // Poll every 5 seconds

      // Set a maximum stream duration (30 minutes)
      setTimeout(() => {
        if (isActive) {
          safeEnqueue(
            controller,
            encoder,
            `data: ${JSON.stringify({ type: "info", message: "Stream timeout reached" })}\n\n`
          );
          cleanup();
        }
      }, 30 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
