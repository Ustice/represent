import {
  schemaDependents,
  type attendanceNoteProposal,
} from "./schema-proposal.js";
import { escapeHtml, json } from "./ui.js";

type Proposal = ReturnType<typeof attendanceNoteProposal>;
const message = (error: unknown) =>
  escapeHtml(
    error instanceof Error ? error.message : "Parser rejected the value",
  );

function direction(
  title: string,
  evidence: Proposal["acceptance"]["beforeToAfter"],
  proposal: Proposal,
) {
  const labels = {
    counterexamples: "Counterexample found",
    "no-counterexamples": "No counterexample in these samples",
    unexercised: "Not exercised: no sample passes the source contract",
  };
  return `<section><h4>${title}</h4><strong>${labels[evidence.status]}</strong><p>${evidence.tested} source-accepted samples checked.</p>${evidence.witnesses.length ? `<ul>${evidence.witnesses.map((index) => `<li>${escapeHtml(proposal.acceptance.samples[index]?.label ?? `Sample ${index + 1}`)}</li>`).join("")}</ul>` : ""}</section>`;
}
function dependencies(model: Proposal["before"], selected: string) {
  const items = schemaDependents(model, selected);
  return items.length
    ? `<ul>${items.map(({ item, path }) => `<li><strong>${escapeHtml(item.name)}</strong> <small>${escapeHtml(item.kind)}</small><details><summary>Why it is reached</summary><ol>${path.map((link) => `<li>${escapeHtml(link.dependency.name)} → ${escapeHtml(link.dependent.name)} <small>(${escapeHtml(link.reason.kind)}${"field" in link.reason ? `: ${escapeHtml(link.reason.field)}` : ""})</small></li>`).join("")}</ol></details></li>`).join("")}</ul>`
    : "<p>No dependents in this snapshot.</p>";
}
export function proposalResults(proposal: Proposal, selected: string) {
  const changes = proposal.comparison.changes;
  const change =
    changes.find((item) => item.representation === selected) ?? changes[0];
  const acceptance = proposal.acceptance;
  const parserResult = (
    value: (typeof acceptance.samples)[number]["before"],
  ) =>
    value.status === "accepted"
      ? "Accepted"
      : `Rejected<details><summary>Reason</summary><p>${message(value.error)}</p></details>`;
  return `<h3>Directional acceptance</h3>
    <div class="change-columns">${direction("Current → proposed", acceptance.beforeToAfter, proposal)}${direction("Proposed → current", acceptance.afterToBefore, proposal)}</div>
    <p class="muted">These are parser-acceptance observations for the supplied samples. They do not prove compatibility, equal normalized values, or operation success. Both records reject extra fields.</p>
    <div class="change-table"><table><thead><tr><th>Request</th><th>Current parser</th><th>Proposed parser</th><th>JSON contracts</th></tr></thead><tbody>${acceptance.samples
      .map((sample) => {
        const artifact = proposal.samples[sample.index];
        const agrees =
          artifact?.before === (sample.before.status === "accepted") &&
          artifact.after === (sample.after.status === "accepted");
        return `<tr><th scope="row">${escapeHtml(sample.label)}<details><summary>Input JSON</summary><pre>${json(sample.input)}</pre></details></th><td>${parserResult(sample.before)}</td><td>${parserResult(sample.after)}</td><td>${agrees ? "Ajv agrees with both" : "Validator disagreement"}</td></tr>`;
      })
      .join("")}</tbody></table></div>
    <h3>Migration preview</h3><p>The explicit conversion adds the chosen default to a request accepted by the current parser, then validates the proposed output. Requests already containing the new field fail the source contract; this is not an overwrite or repair tool.</p>
    <ul class="migration-results">${proposal.migrations
      .map(
        ({ label, trace }) =>
          `<li><strong>${escapeHtml(label)}</strong> · ${trace.status === "completed" ? "Migrated sample" : "Migration rejected"}${
            trace.status === "completed"
              ? `<pre>${json(trace.output)}</pre>`
              : trace.steps
                  .filter((step) => step.status === "failed")
                  .map((step) => `<p>${message(step.error)}</p>`)
                  .join("")
          }</li>`,
      )
      .join("")}</ul>
    ${
      change
        ? `<h3>Declared model changes</h3><label for="changed-schema">Changed definition</label><select id="changed-schema">${changes.map((item) => `<option value="${escapeHtml(item.representation)}" ${change.representation === item.representation ? "selected" : ""}>${escapeHtml(item.representation)} · ${item.kind}</option>`).join("")}</select>
    <h4>${escapeHtml(change.representation)} · ${change.kind}</h4>${change.fields.length ? `<ul>${change.fields.map((field) => `<li>Field <strong>${escapeHtml(field.key)}</strong>: ${escapeHtml(field.before ?? "absent")} → ${escapeHtml(field.after ?? "absent")}</li>`).join("")}</ul>` : ""}
    <div class="change-columns"><section><h4>Current dependents</h4>${dependencies(proposal.before, change.representation)}</section><section><h4>Proposed dependents</h4>${dependencies(proposal.after, change.representation)}</section></div>
    <p class="muted">These definitions need review. Paths follow declared requirements, not observed effects.</p>
    <details><summary>Inspect the structural change</summary><pre>${json(change)}</pre></details>`
        : "<p>No declared schema changes.</p>"
    }
    <div class="change-columns"><details><summary>Generated current contract</summary><pre>${json(proposal.currentSchema)}</pre></details><details><summary>Generated proposed contract</summary><pre>${json(proposal.schema)}</pre></details></div>
    <details><summary>${proposal.comparison.unverified.length} opaque or refined definitions remain unverified</summary><p>Parser bodies and custom rules are absent from graph snapshots. Conversion and operation bodies are not compared.</p><ul>${proposal.comparison.unverified.map((item) => `<li>${escapeHtml(item.representation)} · ${item.reasons.join(", ")}</li>`).join("")}</ul></details>`;
}
