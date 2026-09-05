import { escapeHtml } from "../ui.js";
import { savedMembers } from "../member-store.js";
import type { CommunityEvent } from "../events/model.js";
import { signupClosesAt, rsvpMember } from "./model.js";
import { attendeeExportPanel } from "./export-panel.js";
import { loadRsvps } from "./store.js";

export function attendeesPanel(event: CommunityEvent) {
  try {
    const members = savedMembers();
    const attending = loadRsvps().filter(({ eventId }) => eventId === event.id);
    const eligible = members.filter(
      ({ id }) => !attending.some(({ memberId }) => memberId === id),
    );
    const closesAt = signupClosesAt(event);
    const closed = new Date() >= closesAt;
    return `<div class="panel-heading"><div><span class="eyebrow">PEOPLE MAKE THE PLAN</span><h2>Who's coming?</h2></div><span class="pill">${attending.length} attending</span></div>
      <p class="muted panel-intro">Signups ${closed ? "closed" : "close"} ${closesAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC${event.rsvpBy ? "" : ", when the event starts"}. You can cancel an RSVP at any time.</p>
      <ul class="attendee-list" aria-label="Attendees">${attending
        .map((rsvp) => {
          const member = rsvpMember.resolve(rsvp, members);
          const name = member?.name ?? `Missing member (${rsvp.memberId})`;
          return `<li><span><strong>${escapeHtml(name)}</strong><small>Signed up ${rsvp.signedUpAt.toLocaleDateString("en", { timeZone: "UTC" })}</small></span><button class="button secondary" data-cancel-rsvp="${escapeHtml(rsvp.memberId)}" aria-label="Cancel RSVP for ${escapeHtml(name)}">Cancel</button></li>`;
        })
        .join("")}</ul>
      ${attending.length ? "" : '<p class="empty-attendees">A good gathering starts with one person.<br>No RSVPs yet.</p>'}
      ${eligible.length ? `<form id="rsvp-form"><label for="rsvp-member">Add a member</label><select id="rsvp-member" ${closed ? "disabled" : ""}>${eligible.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`).join("")}</select><div class="api-actions"><button class="button primary" id="register-rsvp" ${closed ? "disabled" : ""}>${closed ? "Signups closed" : "Add attendee"}</button></div></form>` : '<p class="muted panel-intro">Everyone in the directory is attending.</p>'}
      <div class="inline-error" id="rsvp-error" role="alert" hidden></div>
      <div class="route-note"><span class="route-symbol">↔</span><div><strong>One place on the list, per member</strong><p>RSVPs use the saved event details and stay in this browser.</p></div></div>
      ${attendeeExportPanel(event, { members, events: [event], rsvps: attending })}`;
  } catch (error) {
    return `<h2>Attendees could not be loaded.</h2><p class="inline-error" role="alert">${escapeHtml(error instanceof Error ? error.message : "Unable to read saved data.")}</p>`;
  }
}
