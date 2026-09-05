import { OperationError } from "@represent/core";
import { element, escapeHtml, showError } from "../ui.js";
import {
  acceptedRows,
  previewRsvpImport,
  type RsvpImportPreview,
} from "./import.js";
import { applyRsvpImport } from "./import-store.js";
import { loadRsvps } from "./store.js";
import type { RsvpContext } from "./model.js";

interface ImportDraft {
  text: string;
  preview: RsvpImportPreview | null;
  imported: boolean;
  message: string;
}
const drafts = new Map<string, ImportDraft>();
function draftFor(eventId: string) {
  const existing = drafts.get(eventId);
  if (existing) return existing;
  const draft: ImportDraft = {
    text: "",
    preview: null,
    imported: false,
    message: "",
  };
  drafts.set(eventId, draft);
  return draft;
}

function rejectionMessage(error: OperationError): string {
  if (error.cause instanceof OperationError)
    return rejectionMessage(error.cause);
  return error.cause instanceof Error ? error.cause.message : error.message;
}

function previewTable(preview: RsvpImportPreview, imported: boolean) {
  const accepted = acceptedRows(preview).length;
  return `<p role="status">${accepted} ${imported ? "imported" : "ready"} · ${preview.rows.length - accepted} rejected</p>
    <div class="roster-scroll"><table class="import-table"><caption>RSVP import preview</caption><thead><tr><th scope="col">Line</th><th scope="col">Email</th><th scope="col">Result</th></tr></thead><tbody>${preview.rows
      .map((row) => {
        const entry = preview.entries[row.index];
        return `<tr><td>${entry?.line}</td><td>${escapeHtml(entry?.email ?? "")}</td><td>${row.status === "accepted" ? `<strong>${imported ? "Imported" : "Ready"}</strong>` : `<strong>Rejected</strong><small>${escapeHtml(rejectionMessage(row.error))}</small>`}</td></tr>`;
      })
      .join("")}</tbody></table></div>
    ${preview.rows.length ? "" : '<p class="muted panel-intro">Paste at least one email address. Blank lines are ignored.</p>'}
    <div class="api-actions"><button class="button primary" id="apply-rsvp-import" ${!accepted || imported ? "disabled" : ""}>Import ${accepted} ready ${accepted === 1 ? "attendee" : "attendees"}</button></div>`;
}

export function rsvpImportPanel(eventId: string) {
  const draft = draftFor(eventId);
  return `<section aria-label="Bulk RSVP import"><span class="eyebrow">BRING YOUR PEOPLE</span><h2>A whole list, one preview.</h2>
    <p class="muted panel-intro">Paste member emails, one per line, to RSVP to this saved event. Email matching ignores case. Blank lines are skipped.</p>
    <label for="rsvp-import-text">Attendee email addresses</label><textarea id="rsvp-import-text" class="code-input" spellcheck="false" placeholder="maya@example.test&#10;leo@example.test">${escapeHtml(draft.text)}</textarea>
    <div class="api-actions"><button class="button secondary" id="preview-rsvp-import">Preview import</button></div>
    <p class="graph-caption">Preview changes nothing. Import saves only ready rows and checks the directory, existing RSVPs, and signup deadline again.</p>
    <div id="rsvp-import-notice" class="notice" role="status" ${draft.message ? "" : "hidden"}>${escapeHtml(draft.message)}</div>
    <div id="rsvp-import-results">${draft.preview ? previewTable(draft.preview, draft.imported) : ""}</div>
    <div id="rsvp-import-error" class="inline-error" role="alert" hidden></div></section>`;
}

export function bindRsvpImport(
  eventId: string,
  context: () => Omit<RsvpContext, "rsvps">,
  render: () => void,
) {
  const draft = draftFor(eventId);
  const input = element<HTMLTextAreaElement>("#rsvp-import-text");
  input.addEventListener("input", () => {
    draft.text = input.value;
    draft.preview = null;
    draft.imported = false;
    draft.message = "";
    element("#rsvp-import-results").replaceChildren();
    element("#rsvp-import-error").hidden = true;
    element("#rsvp-import-notice").hidden = true;
  });
  element("#preview-rsvp-import").addEventListener("click", () => {
    try {
      draft.preview = previewRsvpImport(draft.text, eventId, {
        ...context(),
        rsvps: loadRsvps(),
      });
      draft.imported = false;
      draft.message = "";
      render();
    } catch (error) {
      draft.preview = null;
      element("#rsvp-import-results").replaceChildren();
      showError("#rsvp-import-error", error);
    }
  });
  document
    .querySelector("#apply-rsvp-import")
    ?.addEventListener("click", () => {
      if (!draft.preview || draft.imported) return;
      try {
        const result = applyRsvpImport(draft.preview, context());
        draft.preview = result.preview;
        draft.imported = result.status === "imported";
        draft.message =
          result.status === "changed"
            ? "Saved data or signup eligibility changed. Nothing was imported. Review the refreshed preview."
            : `${result.count} RSVPs imported. The attendee list and CSV are up to date.`;
        render();
      } catch (error) {
        showError("#rsvp-import-error", error);
      }
    });
}
