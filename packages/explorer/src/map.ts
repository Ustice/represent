import type { GraphItem } from "@represent/core";
import { escape, identity } from "./html.js";
import { itemKey, sameItem, type ExplorerModel } from "./model.js";

export function mapView(
  model: ExplorerModel,
  selected: GraphItem,
  prefix: string,
) {
  const adjacent = model.relationships.filter(
    ({ from, to }) => sameItem(from, selected) || sameItem(to, selected),
  );
  const incoming = adjacent.filter(
    ({ to, from }) => sameItem(to, selected) && !sameItem(from, selected),
  );
  const outgoing = adjacent.filter(
    ({ from, to }) => sameItem(from, selected) && !sameItem(to, selected),
  );
  function group(relations: typeof adjacent, side: "from" | "to") {
    const nodes = new Map<
      string,
      { item: GraphItem; relations: typeof adjacent }
    >();
    for (const relation of relations) {
      const item = relation[side],
        key = itemKey(item);
      const entry = nodes.get(key) ?? { item, relations: [] };
      entry.relations.push(relation);
      nodes.set(key, entry);
    }
    return [...nodes.values()];
  }
  const left = group(incoming, "from"),
    right = group(outgoing, "to");
  const rows = Math.max(left.length, right.length, 1),
    height = rows * 128;
  const center = 64;
  const self = adjacent.filter(({ from, to }) => sameItem(from, to));
  const curves = [
    ...left.map((node, index) => ({ node, index, side: "left" as const })),
    ...right.map((node, index) => ({ node, index, side: "right" as const })),
  ]
    .map(({ node, index, side }) => {
      const y = index * 128 + 64,
        from = side === "left" ? 280 : 640,
        to = side === "left" ? 360 : 720;
      const startY = side === "left" ? y : center,
        endY = side === "left" ? center : y;
      const families = new Set(node.relations.map(({ family }) => family));
      return `<path class="rx-line rx-${families.size === 1 ? node.relations[0]?.family : "mixed"}" d="M ${from} ${startY} C ${(from + to) / 2} ${startY}, ${(from + to) / 2} ${endY}, ${to} ${endY}" marker-end="url(#${prefix}-arrow)"/>`;
    })
    .join("");
  function cards(nodes: typeof left, side: "left" | "right") {
    return nodes
      .map(({ item, relations }, index) => {
        const id = model.items.findIndex((value) => sameItem(value, item));
        return `<button type="button" id="${prefix}-map-${side}-${id}" class="rx-map-node rx-map-${side}" style="top:${index * 128 + 8}px" data-rx-select="${id}" title="${escape(relations.map(({ from, to, label }) => `${from.name} → ${label} → ${to.name}`).join("\n"))}">${identity(item)}<span class="rx-edge-labels">${relations.map(({ label, family }) => `<span class="rx-edge-label rx-${family}">${escape(label)} →</span>`).join("")}</span></button>`;
      })
      .join("");
  }
  return `<p class="rx-caption">Immediate relationships around the selection. Follow a definition to explore its neighborhood. Arrows follow their labels: “reads” and “calls” point from the operation to what it uses. An output arrow describes a contract, not a schema change.</p><div class="rx-legend" aria-label="Relationship colors"><span class="rx-contract">Input / output</span><span class="rx-conversion">Conversion use</span><span class="rx-operation">Calls / reads</span><span class="rx-reference">References</span><span class="rx-structure">Fields / wrappers</span></div><div class="rx-map-scroll" tabindex="0" aria-label="Relationship map; scroll horizontally on small screens"><div class="rx-map" style="height:${height}px"><svg aria-hidden="true" focusable="false" viewBox="0 0 1000 ${height}" preserveAspectRatio="none"><defs><marker id="${prefix}-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="context-stroke"/></marker></defs>${curves}</svg>${cards(left, "left")}<div class="rx-map-center" style="top:${center - 48}px">${identity(selected)}<small>Selected definition</small></div>${cards(right, "right")}</div></div>${adjacent.length ? "" : '<p class="rx-empty">No relationships are declared for this definition.</p>'}${self.length ? `<p class="rx-caption">Self relationships: ${self.map(({ label }) => escape(label)).join(", ")}</p>` : ""}<details class="rx-details"><summary>Read relationships as a list (${adjacent.length})</summary><ul class="rx-relation-list">${adjacent.map(({ from, to, label }) => `<li><strong>${escape(from.name)}</strong> → <span>${escape(label)}</span> → <strong>${escape(to.name)}</strong></li>`).join("")}</ul></details>`;
}
