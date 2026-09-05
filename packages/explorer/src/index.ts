import { structureView } from "./inspection.js";
import type { Graph, GraphItem } from "@represent/core";
import { explorerModel, sameItem } from "./model.js";
import { escape, identity, json } from "./html.js";
import { mapView } from "./map.js";
import { dependencyView } from "./dependencies.js";

let nextInstance = 0;
export function createExplorer(
  input: Graph,
  options: {
    initial?: GraphItem;
    shortcuts?: readonly { item: GraphItem; label: string }[];
  } = {},
) {
  const graph = structuredClone(input);
  const model = explorerModel(graph);
  const graphJson = json(graph);
  const shortcuts = (options.shortcuts ?? []).map(({ item, label }) => {
    const index = model.items.findIndex((value) => sameItem(value, item));
    if (index < 0)
      throw new Error(`Unknown shortcut: ${item.kind} ${item.name}`);
    return { index, label };
  });
  const prefix = `represent-explorer-${++nextInstance}`;
  const initial = options.initial ?? model.items[0];
  let selected = initial;
  if (initial && !model.items.some((item) => sameItem(item, initial)))
    throw new Error(
      `Unknown initial selection: ${initial.kind} ${initial.name}`,
    );
  let view: "map" | "dependencies" = "map";
  let direction: "dependents" | "requirements" = "dependents";
  const history: GraphItem[] = [];
  function choose(index: number) {
    const next = model.items[index];
    if (!next || (selected && sameItem(next, selected))) return;
    if (selected) history.push(selected);
    selected = next;
  }
  function render() {
    if (!selected)
      return `<section class="rx" id="${prefix}" aria-label="Represent explorer"><h2>Explore the model</h2><p class="rx-empty">This graph has no definitions yet.</p></section>`;
    const current = selected;
    return `<section class="rx" id="${prefix}" aria-label="Represent explorer"><header class="rx-heading"><div><span class="rx-eyebrow">REPRESENT EXPLORER</span><h2>Explore the model.</h2></div><span class="rx-count">${model.items.length} definitions · ${model.links.length} relationships</span></header><p class="rx-intro">Follow a connection. Understand a dependency. See the same model from another angle.</p><div class="rx-controls"><button type="button" id="${prefix}-back" data-rx-back ${history.length ? "" : "disabled"}>← Back</button><label for="${prefix}-source">Definition<select id="${prefix}-source" data-rx-source>${["representation", "conversion", "operation", "reference"].map((kind) => `<optgroup label="${kind}">${model.items.map((item, index) => (item.kind === kind ? `<option value="${index}" ${sameItem(item, current) ? "selected" : ""}>${escape(item.name)}</option>` : "")).join("")}</optgroup>`).join("")}</select></label></div>${
      shortcuts.length
        ? `<div class="rx-shortcuts" role="group" aria-label="Explore examples">${shortcuts.map(({ index, label }, position) => `<button type="button" id="${prefix}-shortcut-${position}" data-rx-select="${index}">${escape(label)}</button>`).join("")}</div>`
        : ""
    }<div class="rx-tabs" role="group" aria-label="Explorer view"><button type="button" id="${prefix}-map" data-rx-view="map" aria-pressed="${view === "map"}">Relationships</button><button type="button" id="${prefix}-dependencies" data-rx-view="dependencies" aria-pressed="${view === "dependencies"}">Dependencies</button></div><div class="rx-selection" role="status" id="${prefix}-selection" tabindex="-1">${identity(current)}</div>${structureView(graph, model, current, prefix)}${view === "map" ? mapView(model, current, prefix) : dependencyView(graph, model, current, direction, prefix)}<details class="rx-details rx-inspection"><summary>Inspect definition and graph data</summary><pre>${json({ selection: current, definition: current.kind === "representation" ? graph.nodes.find((x) => x.name === current.name) : current.kind === "conversion" ? graph.edges.find((x) => x.name === current.name) : current.kind === "operation" ? graph.operations.find((x) => x.name === current.name) : graph.references.find((x) => x.name === current.name) })}</pre><details><summary>Complete graph JSON</summary><pre>${graphJson}</pre></details></details></section>`;
  }
  // Bind only within this instance. Abort an earlier binding when the host rerenders.
  let binding: AbortController | undefined;
  function bind(root: ParentNode, rerender: () => void) {
    binding?.abort();
    binding = new AbortController();
    const container = root.querySelector<HTMLElement>(`#${prefix}`);
    if (!container) return;
    function refresh() {
      const active = document.activeElement;
      const focus = active instanceof HTMLElement ? active.id : "";
      rerender();
      bind(root, rerender);
      const target = focus
        ? root.querySelector<HTMLElement>(`#${CSS.escape(focus)}`)
        : null;
      const focusTarget =
        target instanceof HTMLButtonElement && target.disabled ? null : target;
      (
        focusTarget ?? root.querySelector<HTMLElement>(`#${prefix}-selection`)
      )?.focus();
    }
    container.addEventListener(
      "change",
      (event) => {
        if (
          !(event.target instanceof HTMLSelectElement) ||
          !event.target.hasAttribute("data-rx-source")
        )
          return;
        choose(Number(event.target.value));
        refresh();
      },
      { signal: binding.signal },
    );
    container.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest<HTMLButtonElement>("button");
        if (!button) return;
        if (button.dataset.rxSelect !== undefined)
          choose(Number(button.dataset.rxSelect));
        else if (
          button.dataset.rxView === "map" ||
          button.dataset.rxView === "dependencies"
        )
          view = button.dataset.rxView;
        else if (
          button.dataset.rxDirection === "dependents" ||
          button.dataset.rxDirection === "requirements"
        )
          direction = button.dataset.rxDirection;
        else if (button.hasAttribute("data-rx-back")) {
          selected = history.pop() ?? selected;
        } else return;
        refresh();
      },
      { signal: binding.signal },
    );
  }
  return { render, bind, destroy: () => binding?.abort() };
}
