import type { Graph, GraphItem, DependencyLink } from "./graph-model.js";
import { indexGraph, graphItemKey } from "./graph-index.js";

// Traces declared definition dependencies, not runtime values or persistence.
function trace(
  model: Graph,
  selection: GraphItem,
  direction: "outgoing" | "incoming",
) {
  const indexed = indexGraph(model);
  const { requireItem } = indexed;
  const adjacency = indexed[direction];
  const source = requireItem(selection);
  const sourceKey = graphItemKey(source);
  const reached = new Map<
    string,
    { item: GraphItem; path: readonly DependencyLink[]; via: DependencyLink[] }
  >();
  const queue: Array<{ item: GraphItem; path: readonly DependencyLink[] }> = [
    { item: source, path: [] },
  ];
  for (const { item: current, path } of queue) {
    for (const link of adjacency.get(graphItemKey(current)) ?? []) {
      const next = direction === "outgoing" ? link.dependent : link.dependency;
      const id = graphItemKey(next);
      if (id === sourceKey) continue;
      let result = reached.get(id);
      if (!result) {
        const nextPath = [...path, link];
        result = { item: next, path: nextPath, via: [] };
        reached.set(id, result);
        queue.push(result);
      }
      result.via.push(link);
    }
  }
  return { source, reached: [...reached.values()] };
}

export function dependents(model: Graph, selection: GraphItem) {
  const { source, reached } = trace(model, selection, "outgoing");
  return { source, dependents: reached };
}

export function requirements(model: Graph, selection: GraphItem) {
  const { source, reached } = trace(model, selection, "incoming");
  return { source, requirements: reached };
}
