import {
  inspectGraph,
  type DependencyLink,
  type Graph,
  type GraphItem,
} from "@represent/core";
export const itemKey = (item: GraphItem) =>
  JSON.stringify([item.kind, item.name]);
export const sameItem = (a: GraphItem, b: GraphItem) =>
  itemKey(a) === itemKey(b);
export function relationship(link: DependencyLink) {
  const { dependency, dependent, reason } = link;
  const forward = reason.kind === "input" || reason.kind === "reference-source";
  const label = (() => {
    switch (reason.kind) {
      case "input":
        return "input";
      case "output":
        return "output";
      case "read":
        return "reads";
      case "call":
        return "calls";
      case "reference-use":
        return "uses reference";
      case "conversion-use":
        return "uses conversion";
      case "field":
        return `uses for ${reason.field}`;
      case "reference-source":
        return `source field ${reason.field}`;
      case "reference-target":
        return `target key ${reason.field}`;
    }
  })();
  const family =
    reason.kind === "call" || reason.kind === "read"
      ? "operation"
      : reason.kind.startsWith("reference")
        ? "reference"
        : reason.kind === "field" || reason.kind === "conversion-use"
          ? "conversion"
          : "contract";
  return {
    from: forward ? dependency : dependent,
    to: forward ? dependent : dependency,
    label,
    family,
    link,
  };
}
export function explorerModel(graph: Graph) {
  const { items, links } = inspectGraph(graph);
  return { items, links, relationships: links.map(relationship) };
}
export type ExplorerModel = ReturnType<typeof explorerModel>;
