import type { NewsStreamEvent } from "@/lib/types";

export type SendEvent = (event: NewsStreamEvent) => void;

/**
 * Build a Server-Sent Events response. `run` sends events with `send`.
 * The helper sends `connected` first and `complete` (or `error`) last,
 * and stops sending when the client disconnects.
 */
export function sseResponse(
  signal: AbortSignal,
  run: (send: SendEvent, signal: AbortSignal) => Promise<void>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const close = () => {
        if (!open) return;
        open = false;
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      };
      signal.addEventListener("abort", close);

      const send: SendEvent = (event) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          open = false;
        }
      };

      send({ type: "connected", message: "Connecting..." });
      try {
        await run(send, signal);
        send({ type: "complete" });
      } catch (e) {
        console.error("[sse] Stream error:", e);
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      }
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
