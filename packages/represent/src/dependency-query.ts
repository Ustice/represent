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
const key = (value: GraphItem) => JSON.stringify([value.kind, value.name]);
const linkKey = (link: DependencyLink) =>
  JSON.stringify([key(link.dependent), key(link.dependency), link.reason]);
const compare = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

function indexGraph(model: Graph) {
  const definitions = new Map<string, GraphItem>();
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
      if (definitions.has(key(value)))
        throw new Error(`Duplicate graph item: ${kind} ${name}`);
      definitions.set(key(value), value);
    }
  }
  function requireItem(value: GraphItem) {
    const found = definitions.get(key(value));
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
    for (const name of op.reads)
      connect(item("representation", name), operation, { kind: "read" });
    for (const name of op.references)
      connect(item("reference", name), operation, { kind: "reference-use" });
  }
  for (const link of [...links.values()].sort((a, b) =>
    compare(linkKey(a), linkKey(b)),
  )) {
    const id = key(link.dependency);
    const list = outgoing.get(id) ?? [];
    list.push(link);
    outgoing.set(id, list);
  }
  return { requireItem, outgoing };
}

// Traces declared definition dependencies, not runtime values or persistence.
export function dependents(model: Graph, selection: GraphItem) {
  const { requireItem, outgoing } = indexGraph(model);
  const source = requireItem(selection);
  const sourceKey = key(source);
  const reached = new Map<
    string,
    { item: GraphItem; path: readonly DependencyLink[]; via: DependencyLink[] }
  >();
  const queue: Array<{ item: GraphItem; path: readonly DependencyLink[] }> = [
    { item: source, path: [] },
  ];
  for (const { item: current, path } of queue) {
    for (const link of outgoing.get(key(current)) ?? []) {
      const id = key(link.dependent);
      if (id === sourceKey) continue;
      let result = reached.get(id);
      if (!result) {
        const nextPath = [...path, link];
        result = { item: link.dependent, path: nextPath, via: [] };
        reached.set(id, result);
        queue.push(result);
      }
      result.via.push(link);
    }
  }
  return { source, dependents: [...reached.values()] };
}
