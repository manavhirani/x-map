/**
 * Built-in sample stories. The app uses them when no API keys are set
 * and in the static GitHub Pages demo.
 *
 * Every story, account and post here is fictional. The places are real
 * so the map has something to show.
 */
import type { NewsItem, NewsStreamEvent, Tweet } from "./types";

interface SamplePost {
  handle: string;
  name: string;
  text: string;
  likes: number;
  replies: number;
  reposts: number;
}

interface SampleStory {
  id: string;
  headline: string;
  location: string;
  coordinates: [number, number];
  category: string;
  summary: string;
  hoursAgo: number;
  posts: SamplePost[];
}

const post = (
  handle: string,
  name: string,
  text: string,
  [likes, replies, reposts]: [number, number, number],
): SamplePost => ({ handle, name, text, likes, replies, reposts });

const SAMPLE_STORIES: SampleStory[] = [
  {
    id: "demo-tokyo-robots",
    headline: "Delivery robots begin night-time trial in Shibuya",
    location: "Tokyo, Japan",
    coordinates: [139.7016, 35.658],
    category: "Technology",
    summary:
      "A fleet of 30 sidewalk robots starts a three-month pilot that delivers groceries between 22:00 and 06:00.",
    hoursAgo: 1,
    posts: [
      post("tokyo_desk_demo", "Tokyo Desk (Sample)", "Spotted three of the new delivery robots waiting at a crossing in Shibuya. They stop for every pedestrian.", [4210, 182, 960]),
      post("urbanmobility_demo", "Urban Mobility Lab (Sample)", "Night-time delivery trials are a good test: less foot traffic, more sensor noise from neon signs.", [1380, 64, 210]),
    ],
  },
  {
    id: "demo-sf-model",
    headline: "Open-source AI model tops community coding benchmark",
    location: "San Francisco, USA",
    coordinates: [-122.4194, 37.7749],
    category: "Technology",
    summary:
      "A volunteer research group releases model weights that score highest on a public coding leaderboard.",
    hoursAgo: 3,
    posts: [
      post("devnews_demo", "Dev News Daily (Sample)", "New open model just went to the top of the coding leaderboard. Weights and eval scripts are public.", [12840, 932, 3120]),
      post("ml_reader_demo", "ML Reader (Sample)", "Benchmarks are one data point. Excited to try it on real repos this weekend.", [2210, 140, 301]),
    ],
  },
  {
    id: "demo-nyc-markets",
    headline: "Markets close higher as tech shares rally",
    location: "New York, USA",
    coordinates: [-74.006, 40.7128],
    category: "Business",
    summary: "Major indexes finish the session up more than 1%, led by semiconductor and software stocks.",
    hoursAgo: 5,
    posts: [
      post("marketwatch_demo", "Market Pulse (Sample)", "Closing bell: broad rally today, tech leads. Volume above the 30-day average.", [3150, 210, 820]),
    ],
  },
  {
    id: "demo-london-scooters",
    headline: "Parliament debates new rules for e-scooter rentals",
    location: "London, UK",
    coordinates: [-0.1276, 51.5072],
    category: "Politics",
    summary: "Lawmakers discuss speed limits, parking zones and insurance requirements for shared e-scooters.",
    hoursAgo: 6,
    posts: [
      post("westminster_demo", "Westminster Watch (Sample)", "E-scooter debate under way. Main points: 15 mph cap, mandatory parking bays, rider insurance.", [980, 340, 120]),
      post("cyclelondon_demo", "Cycle London (Sample)", "Glad to see parking bays in the proposal. Blocked pavements are the top complaint we hear.", [640, 52, 88]),
    ],
  },
  {
    id: "demo-paris-marathon",
    headline: "Paris marathon sets new course record",
    location: "Paris, France",
    coordinates: [2.3522, 48.8566],
    category: "Sports",
    summary: "The winner finishes in record time on a cool, windless morning along the Seine.",
    hoursAgo: 8,
    posts: [
      post("runnersworld_demo", "Running Weekly (Sample)", "Course record in Paris! Perfect conditions and a fast pack from the start.", [8720, 410, 1530]),
    ],
  },
  {
    id: "demo-berlin-batteries",
    headline: "Berlin lab reports faster recycling method for lithium batteries",
    location: "Berlin, Germany",
    coordinates: [13.405, 52.52],
    category: "Science",
    summary: "Researchers describe a low-temperature process that recovers 95% of lithium in half the usual time.",
    hoursAgo: 10,
    posts: [
      post("sciencedaily_demo", "Science Brief (Sample)", "New battery recycling method recovers most of the lithium at lower temperature. Paper is open access.", [2960, 120, 640]),
    ],
  },
  {
    id: "demo-nairobi-solar",
    headline: "Community solar project powers 200 schools",
    location: "Nairobi, Kenya",
    coordinates: [36.8219, -1.2921],
    category: "Uplifting",
    summary: "A cooperative completes rooftop solar installations that give 200 rural schools reliable power.",
    hoursAgo: 12,
    posts: [
      post("africaenergy_demo", "Energy Africa (Sample)", "200 schools now have reliable power from rooftop solar. Evening study classes start next month.", [6140, 260, 1890]),
      post("teacher_nbo_demo", "Ms. W (Sample)", "Our classroom lights stayed on through the storm last night for the first time.", [3020, 98, 450]),
    ],
  },
  {
    id: "demo-lagos-fintech",
    headline: "Fintech hub opens new accelerator for local founders",
    location: "Lagos, Nigeria",
    coordinates: [3.3792, 6.5244],
    category: "Business",
    summary: "The programme will fund 40 early-stage startups per year with mentoring and seed grants.",
    hoursAgo: 14,
    posts: [
      post("techcabal_demo", "Startup Wire (Sample)", "Applications open for the new Lagos accelerator. 40 startups per cohort, payments and logistics focus.", [1870, 145, 402]),
    ],
  },
  {
    id: "demo-saopaulo-rain",
    headline: "Heavy rain prompts flood warnings across the city",
    location: "São Paulo, Brazil",
    coordinates: [-46.6333, -23.5505],
    category: "Disaster",
    summary: "Forecasters warn of 80 mm of rain in 24 hours. Residents in low-lying areas should prepare.",
    hoursAgo: 2,
    posts: [
      post("sp_weather_demo", "SP Weather (Sample)", "Flood warning issued for the metro area until tomorrow morning. Avoid underpasses.", [5230, 380, 2410]),
    ],
  },
  {
    id: "demo-buenosaires-youth",
    headline: "Local club wins continental youth title",
    location: "Buenos Aires, Argentina",
    coordinates: [-58.3816, -34.6037],
    category: "Sports",
    summary: "The under-20 squad wins the final on penalties in front of a sold-out home crowd.",
    hoursAgo: 16,
    posts: [
      post("futbol_ar_demo", "Fútbol AR (Sample)", "Champions! What a night. The keeper saved two penalties.", [15400, 820, 4300]),
    ],
  },
  {
    id: "demo-mexico-sensors",
    headline: "Seismologists test new earthquake early-warning sensors",
    location: "Mexico City, Mexico",
    coordinates: [-99.1332, 19.4326],
    category: "Science",
    summary: "A network of 500 low-cost sensors aims to add several seconds of warning before shaking arrives.",
    hoursAgo: 18,
    posts: [
      post("geo_mx_demo", "Geo MX (Sample)", "Every extra second of warning matters. The new sensor grid is in test mode this week.", [2740, 130, 690]),
    ],
  },
  {
    id: "demo-toronto-trees",
    headline: "Volunteers plant 10,000 trees along the waterfront",
    location: "Toronto, Canada",
    coordinates: [-79.3832, 43.6532],
    category: "Uplifting",
    summary: "Over 3,000 volunteers join a weekend effort to extend the waterfront green corridor.",
    hoursAgo: 20,
    posts: [
      post("to_parks_demo", "TO Parks (Sample)", "10,000 trees in one weekend. Thank you to every volunteer who showed up!", [7380, 210, 1240]),
    ],
  },
  {
    id: "demo-sydney-reef",
    headline: "Marine survey finds coral recovery on outer reef",
    location: "Sydney, Australia",
    coordinates: [151.2093, -33.8688],
    category: "Science",
    summary: "Divers record higher coral cover than last year at most of the surveyed sites.",
    hoursAgo: 22,
    posts: [
      post("oceanlab_demo", "Ocean Lab (Sample)", "Good news from this season's survey: coral cover is up at 7 of 10 sites.", [4410, 150, 980]),
    ],
  },
  {
    id: "demo-mumbai-metro",
    headline: "Metro adds contactless ticketing at all stations",
    location: "Mumbai, India",
    coordinates: [72.8777, 19.076],
    category: "Technology",
    summary: "Riders can now tap a bank card or phone at every gate across the network.",
    hoursAgo: 4,
    posts: [
      post("mumbai_commute_demo", "Mumbai Commute (Sample)", "Tapped in with my phone this morning. Queue at the ticket counter: gone.", [3360, 170, 520]),
    ],
  },
  {
    id: "demo-delhi-air",
    headline: "Air quality alert issued as smog thickens",
    location: "Delhi, India",
    coordinates: [77.209, 28.6139],
    category: "Disaster",
    summary: "Officials advise residents to limit outdoor activity while pollution levels stay high.",
    hoursAgo: 7,
    posts: [
      post("aqi_watch_demo", "AQI Watch (Sample)", "Air quality in the 'very poor' band today. Masks recommended outdoors.", [2890, 240, 1110]),
    ],
  },
  {
    id: "demo-singapore-port",
    headline: "Port traffic reaches monthly record",
    location: "Singapore",
    coordinates: [103.8198, 1.3521],
    category: "Business",
    summary: "Container volumes hit an all-time monthly high on strong regional demand.",
    hoursAgo: 26,
    posts: [
      post("shipping_demo", "Shipping Times (Sample)", "Busiest month ever at the port. Automated terminals handled over half the volume.", [1240, 60, 280]),
    ],
  },
  {
    id: "demo-seoul-chips",
    headline: "Chipmaker announces new research campus",
    location: "Seoul, South Korea",
    coordinates: [126.978, 37.5665],
    category: "Technology",
    summary: "The campus will house 5,000 engineers working on next-generation memory.",
    hoursAgo: 28,
    posts: [
      post("kr_tech_demo", "KR Tech (Sample)", "New research campus announced. Construction starts next spring.", [2010, 90, 410]),
    ],
  },
  {
    id: "demo-cairo-tombs",
    headline: "Archaeologists catalogue newly scanned tomb chambers",
    location: "Cairo, Egypt",
    coordinates: [31.2357, 30.0444],
    category: "Research",
    summary: "Laser scans reveal the layout of three sealed chambers without opening them.",
    hoursAgo: 30,
    posts: [
      post("history_now_demo", "History Now (Sample)", "3D scans show three hidden chambers. No digging needed to map them.", [9830, 540, 2760]),
    ],
  },
  {
    id: "demo-reykjavik-seismic",
    headline: "Geologists monitor increased seismic activity on peninsula",
    location: "Reykjavík, Iceland",
    coordinates: [-21.9426, 64.1466],
    category: "Science",
    summary: "Hundreds of small earthquakes are recorded overnight. Scientists say there is no immediate risk to the city.",
    hoursAgo: 9,
    posts: [
      post("iceland_geo_demo", "Iceland Geo (Sample)", "Earthquake swarm continues. Most quakes are below magnitude 2.", [3540, 190, 870]),
    ],
  },
  {
    id: "demo-capetown-penguins",
    headline: "Penguin colony counts rise for third year",
    location: "Cape Town, South Africa",
    coordinates: [18.4241, -33.9249],
    category: "Uplifting",
    summary: "Conservation teams count more breeding pairs than in any year since monitoring started.",
    hoursAgo: 34,
    posts: [
      post("wildlife_sa_demo", "Wildlife SA (Sample)", "Third year in a row the colony grows. Nest boxes are working.", [11200, 310, 2980]),
    ],
  },
  {
    id: "demo-dubai-airline",
    headline: "Airline orders fleet of long-range jets",
    location: "Dubai, UAE",
    coordinates: [55.2708, 25.2048],
    category: "Business",
    summary: "The order covers 50 aircraft with deliveries starting in three years.",
    hoursAgo: 36,
    posts: [
      post("aviation_demo", "Aviation Daily (Sample)", "Big order: 50 long-range jets. New routes to South America expected.", [1890, 120, 350]),
    ],
  },
  {
    id: "demo-jakarta-rail",
    headline: "Commuter rail outage disrupts morning travel",
    location: "Jakarta, Indonesia",
    coordinates: [106.8456, -6.2088],
    category: "Breaking News",
    summary: "A signal fault stops trains on two lines during rush hour. Service resumes after three hours.",
    hoursAgo: 1,
    posts: [
      post("jkt_traffic_demo", "JKT Traffic (Sample)", "Two commuter lines suspended due to a signal fault. Use buses where possible.", [2670, 410, 1530]),
    ],
  },
  {
    id: "demo-geneva-physics",
    headline: "Physicists publish new measurement of particle mass",
    location: "Geneva, Switzerland",
    coordinates: [6.1432, 46.2044],
    category: "Research",
    summary: "The result is the most precise to date and agrees with predictions of the Standard Model.",
    hoursAgo: 40,
    posts: [
      post("physics_today_demo", "Physics Today (Sample)", "Most precise measurement yet, and it agrees with theory. Sometimes boring results are the best results.", [4980, 260, 1020]),
    ],
  },
  {
    id: "demo-anchorage-storm",
    headline: "Winter storm brings heavy snow to southern Alaska",
    location: "Anchorage, USA",
    coordinates: [-149.9003, 61.2181],
    category: "Disaster",
    summary: "Up to 60 cm of snow is expected. Schools close and flights are delayed.",
    hoursAgo: 11,
    posts: [
      post("ak_weather_demo", "AK Weather (Sample)", "Snow totals climbing fast. Roads are slick, stay home if you can.", [1760, 130, 640]),
    ],
  },
];

function toNewsItem(story: SampleStory, now: number): NewsItem {
  const timestamp = new Date(now - story.hoursAgo * 3_600_000).toISOString();
  const top_tweets: Tweet[] = story.posts.map((p, i) => ({
    id: `${story.id}-post-${i}`,
    author: `@${p.handle}`,
    name: p.name,
    text: p.text,
    timestamp: new Date(now - (story.hoursAgo * 60 - 10 * (i + 1)) * 60_000).toISOString(),
    likes: p.likes,
    replies: p.replies,
    reposts: p.reposts,
    isSample: true,
  }));

  return {
    id: story.id,
    headline: story.headline,
    location: story.location,
    summary: story.summary,
    category: story.category,
    coordinates: story.coordinates,
    timestamp,
    top_tweets,
  };
}

/**
 * Sample stories that match `query`. An empty query returns all of them.
 * A query with no match also returns all, with `matched: false`.
 */
export function getDemoNews(query = ""): { items: NewsItem[]; matched: boolean } {
  const now = Date.now();
  const all = SAMPLE_STORIES.map((s) => toNewsItem(s, now));
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return { items: all, matched: true };

  const items = all.filter((item) => {
    const haystack = `${item.headline} ${item.location} ${item.summary} ${item.category}`.toLowerCase();
    return terms.some((t) => haystack.includes(t));
  });
  return items.length > 0 ? { items, matched: true } : { items: all, matched: false };
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

/**
 * Emit sample stories as stream events, with short delays so the UI
 * looks like the live stream. The server route and the static demo both use it.
 */
export async function* demoNewsEvents(
  query: string,
  { reason, delayMs = 90, signal }: { reason: string; delayMs?: number; signal?: AbortSignal },
): AsyncGenerator<NewsStreamEvent> {
  yield { type: "mode", mode: "demo", message: reason };

  const { items, matched } = getDemoNews(query);
  yield {
    type: "status",
    message: matched
      ? `Loading ${items.length} sample stories${query ? ` for "${query}"` : ""}...`
      : `No sample stories match "${query}". Showing all sample stories.`,
  };

  for (const news of items) {
    if (signal?.aborted) return;
    await sleep(delayMs, signal);
    yield { type: "news", news };
  }
  yield { type: "status", message: `Loaded ${items.length} sample stories` };
  yield { type: "complete" };
}
