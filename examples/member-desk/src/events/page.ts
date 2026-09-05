import { element, escapeHtml, showError } from "../ui.js";
import { download, renderPage } from "../shell.js";
import {
  eventExchange,
  readEvents,
  sampleEvents,
  type CommunityEvent,
} from "./model.js";
import { eventPreview, connectionsPanel } from "./views.js";

const storageKey = "represent.fieldwork.events.v1";
let notice = "";
let events = loadEvents();
let selectedId = events[0]?.id ?? "evt_01";
let view: "preview" | "api" | "graph" = "preview";
const drafts = new Map<string, ReturnType<typeof formValue>>();
const apiDrafts = new Map<string, string>();

function loadEvents() {
  try {
    const saved = localStorage.getItem(storageKey);
    const input: unknown = saved ? JSON.parse(saved) : null;
    return input ? readEvents(input) : sampleEvents;
  } catch {
    notice = "Saved events could not be opened. Showing the sample schedule.";
    return sampleEvents;
  }
}

function selectedEvent() {
  const value = events.find(({ id }) => id === selectedId);
  if (!value) throw new Error("The selected event is missing.");
  return value;
}

function apiPanel(value: CommunityEvent) {
  const payload = JSON.stringify(eventExchange.encode.convert(value), null, 2);
  const url = download(payload, "application/json");
  return `<div class="panel-heading"><div><span class="eyebrow">EVENT EXCHANGE</span><h2>The whole plan, in JSON.</h2></div><span class="pill">JSON</span></div>
    <p class="muted panel-intro">Times travel as ISO timestamps. Omit rsvpBy for no cutoff; null is not accepted. Downloads contain the saved event.</p>
    <label for="event-payload">Event API payload</label><textarea id="event-payload" class="code-input" spellcheck="false">${escapeHtml(apiDrafts.get(value.id) ?? payload)}</textarea>
    <div class="api-actions"><button class="button primary" id="apply-event">Validate &amp; apply</button><a class="button secondary" href="${url}" download="${escapeHtml(value.id)}.json">Download event JSON <span aria-hidden="true">↓</span></a></div>
    <div class="inline-error" id="event-api-error" role="alert" hidden></div>`;
}

export function renderEvents() {
  const current = selectedEvent();
  const fields =
    drafts.get(selectedId) ?? eventExchange.encode.convert(current);
  renderPage(
    "Events",
    () => `<div class="page-heading"><div><span class="eyebrow">MAKE TIME TOGETHER</span><h1>Community events<span>.</span></h1><p>A few good plans. Room for everyone.</p></div><button class="button secondary reset-button" id="reset-events">Reset events</button></div>
    <div class="notice" role="status" ${notice ? "" : "hidden"}>${escapeHtml(notice)}</div>
    <section class="directory" aria-label="Events"><div class="directory-heading"><h2>On the calendar <span>${events.length} events</span></h2><span>All times UTC</span></div><div class="event-list">${events.map((value) => `<button class="member-row ${value.id === selectedId ? "is-selected" : ""}" data-event="${escapeHtml(value.id)}" aria-pressed="${value.id === selectedId}"><span class="event-date">${value.startsAt.getUTCDate()}<small>${value.startsAt.toLocaleDateString("en", { month: "short", timeZone: "UTC" })}</small></span><span class="member-name"><strong>${escapeHtml(value.title)}</strong><small>${value.rsvpBy ? "RSVP deadline set" : "No RSVP cutoff"}</small></span></button>`).join("")}</div></section>
    <div class="work-area"><section class="editor panel"><div class="panel-heading"><div><span class="eyebrow">EVENT DETAILS</span><h2>Make a plan</h2></div><span class="pill">UTC</span></div>
    <form id="event-form" novalidate><label for="event-title">Event title</label><input id="event-title" value="${escapeHtml(fields.title)}" autocomplete="off" />
    <label for="starts-at">Starts at</label><input id="starts-at" value="${escapeHtml(fields.startsAt)}" aria-describedby="event-time-hint" />
    <label for="ends-at">Ends at</label><input id="ends-at" value="${escapeHtml(fields.endsAt)}" aria-describedby="event-time-hint" />
    <small class="input-hint" id="event-time-hint">ISO date and time with a timezone. Saved times display in UTC.</small>
    <label for="rsvp-by">RSVP deadline <span class="field-note">Optional</span></label><input id="rsvp-by" value="${escapeHtml(fields.rsvpBy ?? "")}" aria-describedby="rsvp-hint" /><small class="input-hint" id="rsvp-hint">Leave blank for no cutoff. Otherwise, on or before the start.</small>
    <div class="inline-error" id="event-error" role="alert" hidden></div><div class="form-footer"><button class="button primary" id="save-event" type="submit">Save event <span aria-hidden="true">↗</span></button><span id="event-edit-status">${drafts.has(selectedId) ? "Unsaved changes" : "Saved in this browser"}</span></div></form>
    <div class="editor-note">↳ The end must follow the start. Save to update the schedule and export.</div></section>
    <section class="preview panel" aria-label="Event representations"><div class="tabs" role="group" aria-label="Event representation"><button data-view="preview" aria-pressed="${view === "preview"}">Event preview</button><button data-view="api" aria-pressed="${view === "api"}">API payload</button><button data-view="graph" aria-pressed="${view === "graph"}">Connections</button></div><div class="preview-content">${view === "preview" ? eventPreview(current) : view === "api" ? apiPanel(current) : connectionsPanel()}</div></section></div>`,
  );
  bindEvents();
}

function formValue() {
  const rsvpBy = element<HTMLInputElement>("#rsvp-by").value.trim();
  return {
    id: selectedId,
    title: element<HTMLInputElement>("#event-title").value,
    startsAt: element<HTMLInputElement>("#starts-at").value,
    endsAt: element<HTMLInputElement>("#ends-at").value,
    ...(rsvpBy ? { rsvpBy } : {}),
  };
}

function save(value: CommunityEvent) {
  if (value.id !== selectedId)
    throw new Error("The event ID must match the selected event.");
  const next = events.map((item) => (item.id === selectedId ? value : item));
  localStorage.setItem(
    storageKey,
    JSON.stringify(next.map((item) => eventExchange.encode.convert(item))),
  );
  events = next;
  drafts.delete(selectedId);
  apiDrafts.delete(selectedId);
  notice = `${value.title} saved. Schedule and export are up to date.`;
  renderEvents();
}

function bindEvents() {
  document
    .querySelectorAll<HTMLButtonElement>("[data-event]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        selectedId = button.dataset.event ?? selectedId;
        notice = "";
        renderEvents();
      }),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-view]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const next = button.dataset.view;
        if (next === "preview" || next === "api" || next === "graph")
          view = next;
        renderEvents();
      }),
    );
  const form = element<HTMLFormElement>("#event-form");
  form.addEventListener("input", () => {
    drafts.set(selectedId, formValue());
    element("#event-edit-status").textContent = "Unsaved changes";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      save(eventExchange.decode.run(formValue()));
    } catch (error) {
      showError("#event-error", error);
    }
  });
  document
    .querySelector("#event-payload")
    ?.addEventListener("input", () =>
      apiDrafts.set(
        selectedId,
        element<HTMLTextAreaElement>("#event-payload").value,
      ),
    );
  document.querySelector("#apply-event")?.addEventListener("click", () => {
    try {
      const input: unknown = JSON.parse(
        element<HTMLTextAreaElement>("#event-payload").value,
      );
      save(eventExchange.decode.run(input));
    } catch (error) {
      showError("#event-api-error", error);
    }
  });
  element("#reset-events").addEventListener("click", () => {
    try {
      localStorage.removeItem(storageKey);
      drafts.clear();
      apiDrafts.clear();
      events = sampleEvents.map((value) =>
        eventExchange.encode.from.parse(value),
      );
      selectedId = events[0]?.id ?? "evt_01";
      notice = "Sample events restored.";
      renderEvents();
    } catch (error) {
      showError("#event-error", error);
    }
  });
}
