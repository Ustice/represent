import {
  dependents,
  requirements,
  type Graph,
  type GraphItem,
} from "@represent/core";
import { identity, escape } from "./html.js";
import { relationship, sameItem, type ExplorerModel } from "./model.js";
export function dependencyView(
  graph: Graph,
  model: ExplorerModel,
  selected: GraphItem,
  direction: "dependents" | "requirements",
  prefix: string,
) {
  const results =
    direction === "dependents"
      ? dependents(graph, selected).dependents
      : requirements(graph, selected).requirements;
  const direct = results.filter(({ path }) => path.length === 1).length;
  function node(item: GraphItem, context: string) {
    const id = model.items.findIndex((value) => sameItem(value, item));
    return `<button type="button" class="rx-node-link" id="${prefix}-${context}-${id}" data-rx-select="${id}">${identity(item)}</button>`;
  }
  return `<div class="rx-segment" role="group" aria-label="Dependency direction"><button type="button" id="${prefix}-dependents" data-rx-direction="dependents" aria-pressed="${direction === "dependents"}">What depends on this?</button><button type="button" id="${prefix}-requirements" data-rx-direction="requirements" aria-pressed="${direction === "requirements"}">What does this require?</button></div><p class="rx-status" role="status">${results.length} ${direction} · ${direct} direct · ${results.length - direct} indirect</p><p class="rx-caption">Declared definition requirements, including calls. These paths identify definitions to review; they do not prove field-level impact or runtime effects.</p><ul class="rx-results">${results
    .map(
      ({ item, path, via }, index) =>
        `<li class="rx-result">${node(item, `result-${index}`)}<span class="rx-distance">${path.length === 1 ? "Direct" : `${path.length} steps`}</span><details class="rx-details"><summary>Why ${escape(item.name)}?</summary><p class="rx-caption">One shortest path ${direction === "dependents" ? "to a dependent" : "through requirements"} from ${escape(selected.name)}</p><ol class="rx-path">${path
          .map((link, step) => {
            const relation = relationship(link);
            return `<li>${node(direction === "dependents" ? link.dependent : link.dependency, `path-${index}-${step}`)}<small>${escape(relation.from.name)} → ${escape(relation.label)} → ${escape(relation.to.name)}</small></li>`;
          })
          .join("")}</ol>${
          via.length > 1
            ? `<p class="rx-caption">All immediate reasons reached (${via.length})</p><ul class="rx-reasons">${via
                .map((link) => {
                  const relation = relationship(link);
                  return `<li>${escape(relation.from.name)} → ${escape(relation.label)} → ${escape(relation.to.name)}</li>`;
                })
                .join("")}</ul>`
            : ""
        }</details></li>`,
    )
    .join(
      "",
    )}</ul>${results.length ? "" : `<p class="rx-empty">No ${direction} are declared for this definition.</p>`}`;
}
