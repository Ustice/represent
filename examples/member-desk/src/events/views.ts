import { escapeHtml } from "../ui.js";
import { type CommunityEvent } from "./model.js";

const time = (value: Date) =>
  value.toLocaleString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

export function eventPreview(value: CommunityEvent) {
  return `<div class="panel-heading"><div><span class="eyebrow">ON THE CALENDAR</span><h2>Something to look forward to.</h2></div></div>
    <p class="muted panel-intro">A preview of the saved plan. All times below are UTC.</p>
    <article class="event-card" aria-label="Saved event preview"><div class="event-cover"><span>fieldwork / together</span><span aria-hidden="true">✳</span></div><div class="event-body"><span class="eyebrow">COMMUNITY GATHERING</span><h3>${escapeHtml(value.title)}</h3><dl><dt>Starts</dt><dd>${time(value.startsAt)}</dd><dt>Ends</dt><dd>${time(value.endsAt)}</dd><dt>RSVP</dt><dd>${value.rsvpBy ? `By ${time(value.rsvpBy)}` : "No cutoff — drop in welcome"}</dd></dl><span class="pill">Times in UTC</span></div></article>`;
}
