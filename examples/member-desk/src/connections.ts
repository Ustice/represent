import {
  dependents,
  type GraphItem,
  type DependencyLink,
  type DependencyReason,
} from "@represent/core";
import { escapeHtml, json } from "./ui.js";
import { workspaceGraph, sharedFieldUses } from "./workspace-graph.js";

const choices: GraphItem[] = [
  ...workspaceGraph.nodes.map(
    ({ name }) => ({ kind: "representation", name }) as const,
  ),
  ...workspaceGraph.edges.map(
    ({ name }) => ({ kind: "conversion", name }) as const,
  ),
];
let selected: GraphItem = { kind: "representation", name: "Member" };

function reasonLabel(reason: DependencyReason) {
  switch (reason.kind) {
    case "input":
      return "Uses input contract";
    case "output":
      return "Validates output contract";
    case "read":
      return "Declares a read of";
    case "reference-use":
      return "Uses reference";
    case "conversion-use":
      return "Uses conversion";
    case "field":
      return `Converts field ${reason.field} with`;
    case "reference-source":
      return `Takes source field ${reason.field} from`;
    case "reference-target":
      return `Resolves target key ${reason.field} against`;
  }
}

function definitionLabel(value: GraphItem) {
  return `<span class="dependency-kind">${value.kind}</span><strong>${escapeHtml(value.name)}</strong>`;
}

function linkLabel(link: DependencyLink) {
  return `${escapeHtml(reasonLabel(link.reason))} <strong>${escapeHtml(link.dependency.name)}</strong>`;
}

function outputLabel(value: GraphItem) {
  if (value.kind === "conversion") {
    const edge = workspaceGraph.edges.find(({ name }) => name === value.name);
    return edge
      ? `Converts ${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}`
      : "";
  }
  if (value.kind === "operation") {
    const op = workspaceGraph.operations.find(
      ({ name }) => name === value.name,
    );
    return op ? `Returns ${escapeHtml(op.output)}` : "";
  }
  return "";
}

export function connectionsPanel() {
  const result = dependents(workspaceGraph, selected);
  const fieldUses = sharedFieldUses();
  const direct = result.dependents.filter(
    ({ path }) => path.length === 1,
  ).length;
  return `<section aria-label="Dependency explorer"><div class="panel-heading"><div><span class="eyebrow">REPRESENT IN FIELDWORK</span><h2>What depends on this?</h2></div></div>
    <p class="muted panel-intro">Explore which definitions deserve review when a representation or conversion changes, with a path explaining each connection.</p>
    <label for="dependency-source">Definition to inspect</label><select id="dependency-source">${["representation", "conversion"].map((kind) => `<optgroup label="${kind === "representation" ? "Representations" : "Conversions"}">${choices.map((choice, index) => (choice.kind === kind ? `<option value="${index}" ${selected.kind === choice.kind && selected.name === choice.name ? "selected" : ""}>${escapeHtml(choice.name)}</option>` : "")).join("")}</optgroup>`).join("")}</select>
    <div class="dependency-shortcuts" role="group" aria-label="Explore common definitions">${[
      { kind: "representation", name: "Member", label: "Member" },
      { kind: "representation", name: "Event", label: "Event" },
      {
        kind: "conversion",
        name: "Date and ISO timestamp: encode",
        label: "Shared date encoder",
      },
    ]
      .map(
        (choice, index) =>
          `<button id="dependency-shortcut-${index}" class="button secondary" data-dependency-choice="${choices.findIndex((value) => value.kind === choice.kind && value.name === choice.name)}">${choice.label}</button>`,
      )
      .join("")}</div>
    <p class="dependency-summary" role="status">${result.dependents.length} dependents · ${direct} direct · ${result.dependents.length - direct} indirect</p>
    <p class="graph-caption">Declared definition dependencies only. A produced value does not change its schema. Output names below provide context; these paths do not imply writes, cascades, or field-level impact.</p>
    <ul class="dependency-results" aria-label="Dependent definitions">${result.dependents.map(({ item, path, via }) => `<li class="dependency-card"><div class="dependency-title">${definitionLabel(item)}<span class="pill">${path.length === 1 ? "Direct" : `${path.length} steps`}</span></div>${outputLabel(item) ? `<p class="dependency-output">${outputLabel(item)}</p>` : ""}<details class="dependency-details"><summary>Why ${escapeHtml(item.name)}?</summary><p class="graph-caption">One shortest path from ${escapeHtml(selected.name)}</p><ol class="dependency-path">${path.map((link) => `<li><strong>${escapeHtml(link.dependent.name)}</strong><small>${linkLabel(link)}</small></li>`).join("")}</ol>${via.length > 1 ? `<p class="graph-caption">All immediate reasons reached by this query (some may follow longer paths)</p><ul class="dependency-reasons">${via.map((link) => `<li>${linkLabel(link)}</li>`).join("")}</ul>` : ""}</details></li>`).join("")}</ul>
    ${result.dependents.length ? "" : '<p class="empty-attendees">No dependents are declared for this definition in the graph.</p>'}
    <details class="data-details"><summary>View query result <span>JSON ↗</span></summary><pre>${json(result)}</pre></details>
    <details class="data-details"><summary>Shared date fields <span>${fieldUses.length} uses ↗</span></summary><ul class="dependency-reasons">${fieldUses.map(({ path }) => `<li>${escapeHtml(path)}</li>`).join("")}</ul></details>
    <details class="data-details"><summary>View workspace graph <span>JSON ↗</span></summary><pre>${json(workspaceGraph)}</pre></details></section>`;
}

export function bindConnections(render: () => void) {
  function choose(value: string) {
    const choice = choices[Number(value)];
    if (!choice) return;
    selected = choice;
    render();
  }
  const select =
    document.querySelector<HTMLSelectElement>("#dependency-source");
  select?.addEventListener("change", () => choose(select.value));
  document
    .querySelectorAll<HTMLButtonElement>("[data-dependency-choice]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const value = button.dataset.dependencyChoice;
        if (value !== undefined) choose(value);
      }),
    );
}
