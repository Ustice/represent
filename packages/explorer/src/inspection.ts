import { presenceOf, type Graph, type GraphItem } from "@represent/core";
import { escape } from "./html.js";
import { sameItem, type ExplorerModel } from "./model.js";

export function structureView(
  graph: Graph,
  model: ExplorerModel,
  item: GraphItem,
  prefix: string,
) {
  if (item.kind !== "representation") return "";
  const definition = graph.nodes.find(({ name }) => name === item.name);
  const structure = definition?.structure;
  function link(name: string, context: string) {
    const index = model.items.findIndex((candidate) =>
      sameItem(candidate, { kind: "representation", name }),
    );
    return `<button type="button" class="rx-node-link" id="${prefix}-field-${context}" data-rx-select="${index}"><strong>${escape(name)}</strong></button>`;
  }
  if (!structure)
    return '<section class="rx-schema"><h3>Opaque parser</h3><p class="rx-caption">No structural contract is declared. Its accepted values, missing-field behavior, and refinements are unknown to the graph.</p></section>';
  if (structure.kind === "record")
    return `<section class="rx-schema"><h3>Record · ${structure.fields.length} fields</h3><p class="rx-caption">Additional enumerable string keys are rejected.${structure.refined ? " This record also has custom validation that the graph cannot describe." : ""}</p><div class="rx-table-scroll"><table><thead><tr><th>Field</th><th>Representation</th><th>Structure</th><th>Presence</th></tr></thead><tbody>${structure.fields
      .map(({ key, representation }, index) => {
        const child = graph.nodes.find(({ name }) => name === representation);
        return `<tr><th scope="row">${escape(key)}</th><td>${link(representation, String(index))}</td><td>${escape(child?.structure?.kind ?? "opaque")}</td><td>${child ? presenceOf(child, (name) => graph.nodes.find((node) => node.name === name)) : "unknown"}</td></tr>`;
      })
      .join("")}</tbody></table></div></section>`;
  if (structure.kind === "nullable")
    return `<section class="rx-schema"><h3>Nullable value</h3><p>Wraps ${link(structure.inner, "inner")}</p><p class="rx-caption">Accepts null. Otherwise the wrapped parser applies, including its missing-field behavior.</p></section>`;
  if (structure.kind === "list")
    return `<section class="rx-schema"><h3>List</h3><p>Elements: ${link(structure.element, "element")}</p><p class="rx-caption">An ordered array, including an empty array. Every element is parsed; failures identify its index.</p></section>`;
  if (structure.kind === "number")
    return `<section class="rx-schema"><h3>${structure.integer ? "Integer" : "Number"} value</h3><p class="rx-caption">${escape(`Finite numeric values. ${structure.min === null ? "No lower bound." : `Minimum ${structure.min}.`} ${structure.max === null ? "No upper bound." : `Maximum ${structure.max}.`}`)}</p></section>`;
  if (structure.kind === "boolean")
    return `<section class="rx-schema"><h3>Boolean value</h3><p class="rx-caption">True or false. Strings and numbers are not coerced.</p></section>`;
  if (structure.kind === "optional")
    return `<section class="rx-schema"><h3>Optional value</h3><p>Wraps ${link(structure.inner, "inner")}</p><p class="rx-caption">Accepts undefined and missing record fields. Otherwise the wrapped parser applies. This does not imply that null is accepted.</p></section>`;
  return `<section class="rx-schema"><h3>${structure.kind === "date" ? "Date value" : "Text value"}</h3><p class="rx-caption">${structure.kind === "date" ? "A JavaScript Date with a finite timestamp. This is not a JSON string." : structure.nonempty ? "A nonempty string. Whitespace is preserved; no trimming or format checks are declared." : "A string, including empty text. No normalization or format checks are declared."}</p></section>`;
}
