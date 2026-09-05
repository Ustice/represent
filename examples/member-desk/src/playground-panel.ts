import {
  experiments,
  runExperiment,
  type ExperimentKind,
} from "./playground.js";
import { escapeHtml, json } from "./ui.js";

let kind: ExperimentKind = "event";
const drafts = new Map<ExperimentKind, string>();
let result: ReturnType<typeof runExperiment> | undefined;
const source = () =>
  drafts.get(kind) ?? JSON.stringify(experiments[kind].sample, null, 2);
function valueType(value: unknown) {
  if (value instanceof Date) return "Date";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
function typeNotes(value: unknown) {
  const description =
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
      ? Object.entries(value)
          .map(([key, field]) => `${key}: ${valueType(field)}`)
          .join(" · ")
      : valueType(value);
  return `<p class="trace-types">${escapeHtml(description)}</p>`;
}
function outcome() {
  if (!result)
    return "Run the supplied example or edit its JSON. Nothing is saved.";
  if (result.status === "invalid-json")
    return `<strong>Invalid JSON</strong><p>${escapeHtml(result.message)}</p>`;
  const steps = result.steps
    .map(
      (step) =>
        `<li><strong>${escapeHtml(step.conversion)}</strong><p class="muted">${escapeHtml(step.from)} → ${escapeHtml(step.to)}</p>${step.status === "completed" ? `<pre>${json(step.output)}</pre>${typeNotes(step.output)}` : `<p class="error">${escapeHtml(step.error instanceof Error ? step.error.message : "Conversion failed")}</p>`}</li>`,
    )
    .join("");
  const trace = `<details open><summary>Executed steps · ${result.steps.length}</summary><ol class="trace-steps">${steps}</ol></details>`;
  if (result.status === "failed")
    return `<strong>Stopped at a failed conversion</strong>${trace}`;
  const changes = result.changes.length
    ? `<ul>${result.changes.map((change) => `<li><strong>${escapeHtml(change.path.length ? JSON.stringify(change.path) : "Whole value")}</strong> · ${change.kind}${change.kind !== "added" ? `<pre>Before: ${json(change.before)}</pre>` : ""}${change.kind !== "removed" ? `<pre>After: ${json(change.after)}</pre>` : ""}</li>`).join("")}</ul>`
    : "<p>All JSON values match. Object property order is ignored.</p>";
  return `<strong>${result.changes.length ? "JSON values changed" : "JSON values preserved"}</strong>${result.comparison ? `<p>${escapeHtml(result.comparison.name)}: <strong>${result.comparison.equivalent ? "equivalent" : "different"}</strong>.</p>` : "<p>This projection has no declared reverse. The field differences below describe this example; they do not establish a general recovery guarantee.</p>"}<p class="muted">Evidence for this supplied value and named comparison only. It is not proof for all inputs. Date objects in intermediate values display as ISO strings.</p><details open><summary>Input versus final output</summary>${changes}</details>${trace}`;
}
export function playgroundPanel() {
  const experiment = experiments[kind];
  return `<section class="contract-lab" aria-label="Conversion playground"><span class="eyebrow">VALUES THROUGH THE MODEL</span><h2>Follow a value.</h2><p>${escapeHtml(experiment.description)}</p><label for="playground-kind">Experiment</label><select id="playground-kind">${Object.entries(
    experiments,
  )
    .map(
      ([key, value]) =>
        `<option value="${key}" ${key === kind ? "selected" : ""}>${escapeHtml(value.label)}</option>`,
    )
    .join(
      "",
    )}</select><div class="contract-grid"><div><label for="playground-input">Source JSON</label><textarea id="playground-input" rows="12" spellcheck="false">${escapeHtml(source())}</textarea><button type="button" class="button primary" id="run-playground">Run conversions</button><p class="muted">Each listed conversion runs once. This example uses pure conversions and does not save or publish data.</p></div><div class="playground-result" role="status">${outcome()}</div></div></section>`;
}
export function bindPlayground(render: () => void) {
  const select = document.querySelector<HTMLSelectElement>("#playground-kind");
  select?.addEventListener("change", () => {
    if (
      select.value !== "event" &&
      select.value !== "timestamp" &&
      select.value !== "profile"
    )
      return;
    kind = select.value;
    result = undefined;
    render();
    document.querySelector<HTMLSelectElement>("#playground-kind")?.focus();
  });
  const input =
    document.querySelector<HTMLTextAreaElement>("#playground-input");
  input?.addEventListener("input", () => {
    drafts.set(kind, input.value);
    result = undefined;
    const status = document.querySelector(".playground-result");
    if (status) status.textContent = "Source changed. Run again.";
  });
  document.querySelector("#run-playground")?.addEventListener("click", () => {
    result = runExperiment(kind, source());
    render();
    document.querySelector<HTMLButtonElement>("#run-playground")?.focus();
  });
}
