import { BASE_PATH, IS_STATIC_DEMO } from "./config";
import { demoNewsEvents } from "./demo-data";
import type { NewsStreamEvent } from "./types";

/**
 * Subscribe to breaking news for `query`. Returns a function that stops the stream.
 *
 * - Server build: reads Server-Sent Events from `/api/grok/breaking-news`.
 *   The server itself falls back to sample data when API keys are missing.
 * - Static demo build: there is no server, so sample events are generated here.
 */
export function streamNews(query: string, onEvent: (event: NewsStreamEvent) => void): () => void {
  return IS_STATIC_DEMO ? streamDemo(query, onEvent) : streamFromServer(query, onEvent);
}

function streamDemo(query: string, onEvent: (event: NewsStreamEvent) => void): () => void {
  const controller = new AbortController();
  (async () => {
    const events = demoNewsEvents(query, {
      reason: "Static demo: showing sample data. Run the app locally with API keys for live news.",
      signal: controller.signal,
    });
    for await (const event of events) {
      if (controller.signal.aborted) return;
      onEvent(event);
    }
  })();
  return () => controller.abort();
}

function streamFromServer(query: string, onEvent: (event: NewsStreamEvent) => void): () => void {
  const params = query ? `?query=${encodeURIComponent(query)}` : "";
  const source = new EventSource(`${BASE_PATH}/api/grok/breaking-news${params}`);
  let finished = false;

  const finish = () => {
    finished = true;
    source.close();
  };

  source.onmessage = (message) => {
    let event: NewsStreamEvent;
    try {
      event = JSON.parse(message.data);
    } catch {
      return;
    }
    onEvent(event);
    if (event.type === "complete" || event.type === "error") finish();
  };

  // EventSource fires `error` when the server closes the stream, too.
  // Report it only if the stream did not complete normally.
  source.onerror = () => {
    if (finished) return;
    finish();
    onEvent({ type: "error", message: "Connection lost. Please try again." });
  };

  return finish;
}
