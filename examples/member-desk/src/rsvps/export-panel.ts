import type { CommunityEvent } from "../events/model.js";
import { download } from "../shell.js";
import { escapeHtml } from "../ui.js";
import { exportAttendees, type AttendeeContext } from "./export.js";

export function attendeeExportPanel(
  event: CommunityEvent,
  context: AttendeeContext,
) {
  try {
    const roster = exportAttendees(event.id, context);
    const url = download(roster.csv, "text/csv;charset=utf-8");
    return `<section class="attendee-export" aria-label="Attendee export">
      <span class="eyebrow">READY FOR THE DAY</span><h3>Take the guest list with you.</h3>
      <p class="muted panel-intro">Names, emails, event times, and signup times in one CSV. Save member or event edits to update the next export.</p>
      <div class="export-event"><strong>${escapeHtml(event.title)}</strong><span>${event.startsAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</span></div>
      ${roster.rows.length ? `<div class="roster-scroll"><table class="roster-table"><caption>Attendee export preview</caption><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th></tr></thead><tbody>${roster.rows.map((row) => `<tr><td>${escapeHtml(row["Full name"])}</td><td>${escapeHtml(row.Email)}</td><td>${escapeHtml(row.Role)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted panel-intro">No attendees yet. The CSV contains column headings only.</p>'}
      <div class="api-actions"><a class="button primary" href="${url}" download="${escapeHtml(event.id)}-attendees.csv">Download attendee CSV <span aria-hidden="true">↓</span></a></div>
      <p class="graph-caption">Includes private member emails. Each download is a snapshot of the saved records.</p>
      <details class="data-details"><summary>View exported text <span>CSV ↗</span></summary><pre>${escapeHtml(roster.csv)}</pre></details>
    </section>`;
  } catch (error) {
    return `<section class="attendee-export" aria-label="Attendee export"><h3>Export needs attention.</h3><p class="inline-error" role="alert">${escapeHtml(error instanceof Error ? error.message : "Unable to prepare the attendee roster.")}</p></section>`;
  }
}
