import {
  attendanceNoteProposal,
  defaultNoteProposal,
  exampleRequests,
  parseProposalSamples,
} from "./schema-proposal.js";
import { proposalResults } from "./proposal-results.js";
import { element, escapeHtml } from "./ui.js";

let settings = { ...defaultNoteProposal };
let source = JSON.stringify(exampleRequests(settings.field), null, 2);
let proposal = attendanceNoteProposal(settings, parseProposalSamples(source));
let selected = "RSVP request";
let dirty = false;
let error = "";

export function changePanel() {
  return `<section class="change-lab" aria-label="Change preview">
    <span class="eyebrow">AN EDITABLE MODEL EXPERIMENT</span>
    <h2>Try the change before adopting it.</h2>
    <p>Propose a text field on the RSVP request, edit examples, and inspect the generated contracts, directional evidence, and an explicit migration. This preview runs real parsers and conversions on copies. Live operations and saved records remain unchanged.</p>
    <form id="proposal-form">
      <div class="proposal-settings">
        <label for="proposal-field">New field name<input id="proposal-field" value="${escapeHtml(settings.field)}" required></label>
        <label for="note-mode">Field presence<select id="note-mode"><option value="required" ${settings.mode === "required" ? "selected" : ""}>Required</option><option value="optional" ${settings.mode === "optional" ? "selected" : ""}>Optional</option></select></label>
        <label for="proposal-empty">Text constraint<select id="proposal-empty"><option value="nonempty" ${settings.nonempty ? "selected" : ""}>Nonempty</option><option value="any" ${!settings.nonempty ? "selected" : ""}>Allow empty text</option></select></label>
        <label for="proposal-default">Migration default<input id="proposal-default" value="${escapeHtml(settings.defaultValue)}"></label>
      </div>
      <label for="proposal-samples">Sample requests · JSON array of label/value pairs</label>
      <textarea id="proposal-samples" rows="12" spellcheck="false">${escapeHtml(source)}</textarea>
      <div class="proposal-actions"><button class="button primary" type="submit" id="preview-proposal">Preview proposal</button><button class="button" type="button" id="proposal-examples">Use examples for this field</button></div>
    </form>
    <div id="proposal-result" aria-live="polite">${error ? `<p role="alert">${escapeHtml(error)}</p>` : dirty ? "Draft changed. Preview again to update the evidence." : proposalResults(proposal, selected)}</div>
  </section>`;
}
function captureDraft() {
  const mode = element<HTMLSelectElement>("#note-mode").value;
  if (mode !== "required" && mode !== "optional")
    throw new Error("Choose required or optional presence");
  settings = {
    field: element<HTMLInputElement>("#proposal-field").value,
    mode,
    nonempty:
      element<HTMLSelectElement>("#proposal-empty").value === "nonempty",
    defaultValue: element<HTMLInputElement>("#proposal-default").value,
  };
  source = element<HTMLTextAreaElement>("#proposal-samples").value;
}
export function bindChanges(render: () => void) {
  const form = document.querySelector<HTMLFormElement>("#proposal-form");
  form?.addEventListener("input", () => {
    captureDraft();
    dirty = true;
    error = "";
    element("#proposal-result").textContent =
      "Draft changed. Preview again to update the evidence.";
  });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      captureDraft();
      proposal = attendanceNoteProposal(settings, parseProposalSamples(source));
      dirty = false;
      error = "";
    } catch (failure) {
      error =
        failure instanceof Error
          ? failure.message
          : "Cannot preview this proposal";
    }
    render();
    document.querySelector<HTMLButtonElement>("#preview-proposal")?.focus();
  });
  document
    .querySelector("#proposal-examples")
    ?.addEventListener("click", () => {
      captureDraft();
      source = JSON.stringify(exampleRequests(settings.field), null, 2);
      dirty = true;
      error = "";
      render();
      document.querySelector<HTMLTextAreaElement>("#proposal-samples")?.focus();
    });
  document
    .querySelector<HTMLSelectElement>("#changed-schema")
    ?.addEventListener("change", (event) => {
      const input = event.currentTarget;
      if (input instanceof HTMLSelectElement) selected = input.value;
      render();
      document.querySelector<HTMLSelectElement>("#changed-schema")?.focus();
    });
}
