import type {
  DependencyLink,
  DependencyReason,
  Graph,
  GraphItem,
} from "./graph-model.js";

const item = (kind: GraphItem["kind"], name: string): GraphItem => ({
  kind,
  name,
});
export const graphItemKey = (value: GraphItem) =>
  JSON.stringify([value.kind, value.name]);
const linkKey = (link: DependencyLink) =>
  JSON.stringify([
    graphItemKey(link.dependent),
    graphItemKey(link.dependency),
    link.reason,
  ]);
const compare = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

export function indexGraph(model: Graph) {
  const definitions = new Map<string, GraphItem>();
  const incoming = new Map<string, DependencyLink[]>();
  const outgoing = new Map<string, DependencyLink[]>();
  const links = new Map<string, DependencyLink>();
  for (const [kind, entries] of [
    ["representation", model.nodes],
    ["conversion", model.edges],
    ["operation", model.operations],
    ["reference", model.references],
  ] as const) {
    for (const { name } of entries) {
      const value = item(kind, name);
      if (definitions.has(graphItemKey(value)))
        throw new Error(`Duplicate graph item: ${kind} ${name}`);
      definitions.set(graphItemKey(value), value);
    }
  }
  function requireItem(value: GraphItem) {
    const found = definitions.get(graphItemKey(value));
    if (!found)
      throw new Error(`Unknown graph item: ${value.kind} ${value.name}`);
    return found;
  }
  function connect(
    dependency: GraphItem,
    dependent: GraphItem,
    reason: DependencyReason,
  ) {
    const link = {
      dependency: requireItem(dependency),
      dependent: requireItem(dependent),
      reason,
    };
    links.set(linkKey(link), link);
  }
  for (const node of model.nodes) {
    const parent = item("representation", node.name);
    if (node.structure?.kind === "record") {
      const keys = new Set<string>();
      for (const { key } of node.structure.fields) {
        if (keys.has(key))
          throw new Error(`Duplicate record field: ${node.name}.${key}`);
        keys.add(key);
      }
      for (const field of node.structure.fields)
        connect(item("representation", field.representation), parent, {
          kind: "record-field",
          field: field.key,
        });
    }
    if (node.structure?.kind === "optional")
      connect(item("representation", node.structure.inner), parent, {
        kind: "wrapped-value",
      });
  }
  for (const edge of model.edges) {
    const conversion = item("conversion", edge.name);
    connect(item("representation", edge.from), conversion, { kind: "input" });
    connect(item("representation", edge.to), conversion, { kind: "output" });
  }
  for (const dependency of model.dependencies) {
    connect(
      item("conversion", dependency.conversion),
      item("conversion", dependency.parent),
      dependency.field === null
        ? { kind: "conversion-use" }
        : { kind: "field", field: dependency.field },
    );
  }
  for (const ref of model.references) {
    const reference = item("reference", ref.name);
    connect(item("representation", ref.from), reference, {
      kind: "reference-source",
      field: ref.field,
    });
    connect(item("representation", ref.to), reference, {
      kind: "reference-target",
      field: ref.key,
    });
  }
  for (const op of model.operations) {
    const operation = item("operation", op.name);
    connect(item("representation", op.input), operation, { kind: "input" });
    connect(item("representation", op.output), operation, { kind: "output" });
    for (const call of op.calls) connect(call, operation, { kind: "call" });
    for (const name of op.reads)
      connect(item("representation", name), operation, { kind: "read" });
    for (const name of op.references)
      connect(item("reference", name), operation, { kind: "reference-use" });
  }
  const orderedLinks = [...links.values()].sort((a, b) =>
    compare(linkKey(a), linkKey(b)),
  );
  for (const link of orderedLinks) {
    for (const [adjacency, endpoint] of [
      [outgoing, link.dependency],
      [incoming, link.dependent],
    ] as const) {
      const id = graphItemKey(endpoint);
      const list = adjacency.get(id) ?? [];
      list.push(link);
      adjacency.set(id, list);
    }
  }
  const items = [...definitions.values()].sort((a, b) =>
    compare(graphItemKey(a), graphItemKey(b)),
  );
  return { requireItem, outgoing, incoming, items, links: orderedLinks };
}

export function inspectGraph(model: Graph) {
  const { items, links } = indexGraph(model);
  return { items, links };
}
