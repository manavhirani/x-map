import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache for geocoding results (in production, use Redis or similar)
const geocodeCache = new Map<string, { lat: number; lon: number; display_name: string; timestamp: number }>();

// Rate limit tracking
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50; // Conservative limit for Nominatim

// Clean up old cache entries (older than 24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of geocodeCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      geocodeCache.delete(key);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== "undefined") {
  setInterval(cleanupCache, 60 * 60 * 1000);
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = ip || "default";
  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((limit.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  limit.count++;
  return { allowed: true };
}

async function geocodeWithRetry(
  location: string,
  retries = 2
): Promise<{ success: boolean; data?: any; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const encodedLocation = encodeURIComponent(location.trim());

      // Try Nominatim first
      let response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1&addressdetails=1`,
          {
            headers: {
              "User-Agent": "XAI-Hackathon-Map/1.0",
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
      } catch (err) {
        // If Nominatim fails (including ECONNREFUSED), try Photon
        console.warn("Nominatim failed, trying Photon keyless API...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        response = await fetch(
          `https://photon.komoot.io/api/?q=${encodedLocation}&limit=1`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
      }

      // Handle rate limiting (429)
      if (response && response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (attempt + 1) * 2000;

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        return {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        };
      }

      if (!response || !response.ok) {
        if (attempt < retries) {
          // Retry
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
          continue;
        }

        return {
          success: false,
          error: `Geocoding failed: ${response ? response.status : 'Network Error'}`,
        };
      }

      const data = await response.json();

      // Photon format is different (feature collection)
      let result;
      let coordinates: [number, number];
      let display_name: string;

      if (data.features && data.features.length > 0) {
        // Photon
        result = data.features[0];
        coordinates = result.geometry.coordinates;
        display_name = result.properties.name + ", " + (result.properties.city || result.properties.country || "");
      } else if (Array.isArray(data) && data.length > 0) {
        // Nominatim
        result = data[0];
        coordinates = [parseFloat(result.lon), parseFloat(result.lat)];
        display_name = result.display_name;
      } else {
        return {
          success: false,
          error: "Location not found",
        };
      }

      return {
        success: true,
        data: {
          coordinates,
          display_name,
        },
      };
    } catch (error: any) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
          continue;
        }
        return {
          success: false,
          error: "Geocoding request timed out",
        };
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
        continue;
      }

      return {
        success: false,
        error: error.message || "Failed to geocode location",
      };
    }
  }

  return {
    success: false,
    error: "Failed after retries",
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get("location");

    if (!location || !location.trim()) {
      return NextResponse.json(
        { error: "location parameter is required" },
        { status: 400 }
      );
    }

    const locationKey = location.trim().toLowerCase();

    // Check cache first
    if (geocodeCache.has(locationKey)) {
      const cached = geocodeCache.get(locationKey)!;
      const now = Date.now();

      // Check if cache is still valid
      if (now - cached.timestamp < CACHE_TTL) {
        return NextResponse.json({
          success: true,
          location,
          coordinates: [cached.lon, cached.lat], // [lng, lat]
          display_name: cached.display_name,
          cached: true,
        });
      } else {
        // Remove expired cache entry
        geocodeCache.delete(locationKey);
      }
    }

    // Check rate limit
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfter?.toString() || "60",
          },
        }
      );
    }

    // Geocode with retry logic
    const result = await geocodeWithRetry(location);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to geocode location",
          success: false,
        },
        { status: result.error?.includes("not found") ? 404 : 500 }
      );
    }

    // Cache the result
    geocodeCache.set(locationKey, {
      lat: result.data!.coordinates[1],
      lon: result.data!.coordinates[0],
      display_name: result.data!.display_name,
      timestamp: Date.now(),
    });

    // Limit cache size to prevent memory issues
    if (geocodeCache.size > 1000) {
      const firstKey = geocodeCache.keys().next().value;
      if (firstKey) {
        geocodeCache.delete(firstKey);
      }
    }

    return NextResponse.json({
      success: true,
      location,
      coordinates: result.data!.coordinates,
      display_name: result.data!.display_name,
      cached: false,
    });
  } catch (error: any) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      {
        error: "Failed to geocode location",
        message: error.message || "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}
