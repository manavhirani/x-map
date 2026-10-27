/** A post from X attached to a news story. */
export interface Tweet {
  id?: string;
  author: string;
  name?: string;
  text: string;
  url?: string;
  timestamp?: string;
  likes?: string | number;
  replies?: string | number;
  reposts?: string | number;
  profile_pic?: string | null;
  /** True for the built-in sample posts. They have no real author or URL. */
  isSample?: boolean;
}

/** A geolocated news story shown on the map. */
export interface NewsItem {
  id: string;
  headline: string;
  location: string;
  summary: string;
  category: string;
  timestamp: string;
  /** `[longitude, latitude]` */
  coordinates: [number, number];
  top_tweets?: Tweet[];
}

/** Where the stories come from: live Grok + X APIs, or the built-in sample set. */
export type DataMode = "live" | "demo";

/**
 * One Server-Sent Event from `/api/grok/breaking-news`.
 * The static demo emits the same events in the browser.
 */
export type NewsStreamEvent =
  | { type: "connected"; message: string }
  | { type: "mode"; mode: DataMode; message: string }
  | { type: "status"; message: string }
  | { type: "news"; news: NewsItem }
  | { type: "complete" }
  | { type: "error"; message: string };
