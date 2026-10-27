/** Resolve a place name to `[longitude, latitude]` with Photon (OpenStreetMap). */
export async function geocodeLocation(location: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(location)}&limit=1`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data.features?.[0]?.geometry?.coordinates;
    return Array.isArray(coords) && coords.length >= 2 ? [coords[0], coords[1]] : null;
  } catch (e) {
    console.error(`[geocode] Failed for "${location}":`, e);
    return null;
  }
}
