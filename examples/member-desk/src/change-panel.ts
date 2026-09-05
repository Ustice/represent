import { attendanceNoteProposal, schemaDependents } from "./schema-proposal.js";
import { escapeHtml, json } from "./ui.js";

const proposals = {
  optional: attendanceNoteProposal("optional"),
  required: attendanceNoteProposal("required"),
};
let mode: keyof typeof proposals = "required";
let selected = "RSVP request";
export function changePanel() {
  const proposal = proposals[mode];
  const changes = proposal.comparison.changes;
  const change =
    changes.find((item) => item.representation === selected) ?? changes[0];
  if (!change) return "<p>No declared schema changes.</p>";
  selected = change.representation;
  const affected = (model: typeof proposal.before) => {
    const items = schemaDependents(model, selected);
    return items.length
      ? `<ul>${items.map(({ item, path }) => `<li><strong>${escapeHtml(item.name)}</strong> <small>${escapeHtml(item.kind)}</small><details><summary>Why it is reached</summary><ol>${path.map((link) => `<li>${escapeHtml(link.dependency.name)} → ${escapeHtml(link.dependent.name)} <small>(${escapeHtml(link.reason.kind)}${"field" in link.reason ? `: ${escapeHtml(link.reason.field)}` : ""})</small></li>`).join("")}</ol></details></li>`).join("")}</ul>`
      : "<p>No dependents in this snapshot.</p>";
  };
  return `<section class="change-lab" aria-label="Change preview">
    <span class="eyebrow">A MODEL EXPERIMENT</span>
    <h2>What if an RSVP carried a note?</h2>
    <p>Compare the current request with a proposed contract. The proposed parser and generated schema are real; the application still uses its current operations and saved data.</p>
    <label for="note-mode">Proposed attendance note<select id="note-mode"><option value="required" ${mode === "required" ? "selected" : ""}>Required, nonempty note</option><option value="optional" ${mode === "optional" ? "selected" : ""}>Optional, nonempty when present</option></select></label>
    <h3>Try the same requests against both contracts</h3>
    <div class="change-table"><table><thead><tr><th>Request</th><th>Current</th><th>Proposed</th></tr></thead><tbody>${proposal.samples.map((sample) => `<tr><th scope="row">${sample.label}<details><summary>JSON</summary><pre>${json(sample.value)}</pre></details></th><td>${sample.before ? "Accepted" : "Rejected"}</td><td>${sample.after ? "Accepted" : "Rejected"}</td></tr>`).join("")}</tbody></table></div>
    <p class="muted">Both records reject extra fields. An optional addition lets existing requests pass, but requests containing the new field still fail the old contract. These examples do not prove compatibility.</p>
    <label for="changed-schema">Changed definition<select id="changed-schema">${changes.map((item) => `<option value="${escapeHtml(item.representation)}" ${selected === item.representation ? "selected" : ""}>${escapeHtml(item.representation)} · ${item.kind}</option>`).join("")}</select></label>
    <h3>${escapeHtml(change.representation)} · ${change.kind}</h3>${change.fields.length ? `<ul>${change.fields.map((field) => `<li>Field <strong>${escapeHtml(field.key)}</strong>: ${escapeHtml(field.before ?? "absent")} → ${escapeHtml(field.after ?? "absent")}</li>`).join("")}</ul>` : ""}
    <div class="change-columns"><section><h4>Current dependents</h4>${affected(proposal.before)}</section><section><h4>Proposed dependents</h4>${affected(proposal.after)}</section></div>
    <p class="muted">These definitions need review. Paths follow declared requirements; they do not prove that runtime behavior changes or that every dependency was declared.</p>
    <details><summary>Inspect the structural change</summary><pre>${json(change)}</pre></details>
    <details><summary>Generated proposed contract</summary><pre>${json(proposal.schema)}</pre></details>
    <details><summary>${proposal.comparison.unverified.length} opaque or refined definitions remain unverified</summary><p>Parser bodies and custom rules are absent from graph snapshots. Equal declarations do not prove equal behavior. Conversion and operation bodies are not compared.</p><ul>${proposal.comparison.unverified.map((item) => `<li>${escapeHtml(item.representation)} · ${item.reason}</li>`).join("")}</ul></details></section>`;
}
export function bindChanges(render: () => void) {
  document
    .querySelector<HTMLSelectElement>("#note-mode")
    ?.addEventListener("change", (event) => {
      const input = event.currentTarget;
      if (
        input instanceof HTMLSelectElement &&
        (input.value === "required" || input.value === "optional")
      )
        mode = input.value;
      render();
      document.querySelector<HTMLSelectElement>("#note-mode")?.focus();
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
