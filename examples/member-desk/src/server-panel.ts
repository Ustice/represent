import { eventExchange, type CommunityEvent } from "./events/model.js";
import { escapeHtml, json } from "./ui.js";

let id = "evt_01";
let busy = false;
let result:
  | { status: "loaded"; payload: unknown; event: CommunityEvent }
  | { status: "failed"; message: string }
  | undefined;
export function serverPanel() {
  return `<section class="contract-lab" aria-label="Server lab"><span class="eyebrow">ACROSS A REAL HTTP BOUNDARY</span><h2>Look up a saved event.</h2><p>A Fastify route runs the asynchronous Look up event operation. It reads the server's JSON file, validates the domain event, and encodes its API representation. The browser decodes the HTTP response again.</p><p class="muted">This separate server fixture is read only. It does not use or modify your browser's saved events. Start it with <code>pnpm server</code>; Vite forwards API requests to port 5175.</p><div class="contract-grid"><div><label for="server-event-id">Event identifier</label><input id="server-event-id" value="${escapeHtml(id)}" ${busy ? "disabled" : ""}><p class="muted">Try evt_01, evt_02, or a missing identifier.</p><button class="button primary" type="button" id="load-server-event" ${busy ? "disabled" : ""}>${busy ? "Loading…" : "Look up event"}</button></div><div role="status">${result?.status === "loaded" ? `<strong>${escapeHtml(result.event.title)}</strong><p>Decoded start: ${escapeHtml(result.event.startsAt.toISOString())} · Date instance</p><details open><summary>HTTP response · Event API</summary><pre>${json(result.payload)}</pre></details>` : result?.status === "failed" ? `<strong>Lookup failed</strong><p>${escapeHtml(result.message)}</p>` : busy ? "Reading the server's event directory…" : "No request sent yet."}</div></div></section>`;
}
async function load() {
  if (!id) {
    result = { status: "failed", message: "Enter an event identifier." };
    return;
  }
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(id)}`);
    if (
      response.ok &&
      !response.headers.get("content-type")?.includes("application/json")
    )
      throw new Error("The event endpoint returned a non-JSON response.");
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : "Request failed";
      throw new Error(`${response.status}: ${detail}`);
    }
    result = {
      status: "loaded",
      payload,
      event: eventExchange.decode.run(payload),
    };
  } catch (error) {
    result = {
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Unable to reach the event server",
    };
  }
}
export function bindServer(render: () => void) {
  const input = document.querySelector<HTMLInputElement>("#server-event-id");
  input?.addEventListener("input", () => {
    id = input.value;
    result = undefined;
    const status = document.querySelector(
      '[aria-label="Server lab"] [role="status"]',
    );
    if (status) status.textContent = "Identifier changed. Look up again.";
  });
  document
    .querySelector("#load-server-event")
    ?.addEventListener("click", () => {
      if (busy) return;
      busy = true;
      result = undefined;
      render();
      void load().finally(() => {
        busy = false;
        if (!document.querySelector("#load-server-event")) return;
        render();
        document
          .querySelector<HTMLButtonElement>("#load-server-event")
          ?.focus();
      });
    });
}
