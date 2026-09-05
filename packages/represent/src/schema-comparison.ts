import type { Graph } from "./graph-model.js";
import { inspectGraph } from "./graph-index.js";
import type { Structure } from "./structure.js";

export interface FieldChange {
  readonly key: string;
  readonly before: string | null;
  readonly after: string | null;
}
export interface SchemaChange {
  readonly representation: string;
  readonly kind: "added" | "removed" | "changed";
  readonly before: Structure | null;
  readonly after: Structure | null;
  readonly fields: readonly FieldChange[];
}
const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
function normalize(structure: Structure | undefined): Structure | null {
  if (!structure) return null;
  switch (structure.kind) {
    case "text":
      return { kind: "text", nonempty: structure.nonempty };
    case "date":
      return { kind: "date" };
    case "optional":
      return { kind: "optional", inner: structure.inner };
    case "record":
      return {
        kind: "record",
        refined: structure.refined,
        fields: structure.fields
          .map(({ key, representation }) => ({ key, representation }))
          .sort((a, b) => order(a.key, b.key)),
      };
  }
}
function fieldsOf(structure: Structure | null) {
  return new Map(
    structure?.kind === "record"
      ? structure.fields.map((field) => [field.key, field.representation])
      : [],
  );
}
function changedFields(
  before: Structure | null,
  after: Structure | null,
): FieldChange[] {
  const oldFields = fieldsOf(before),
    newFields = fieldsOf(after);
  return [...new Set([...oldFields.keys(), ...newFields.keys()])]
    .sort(order)
    .flatMap((key) => {
      const previous = oldFields.get(key) ?? null,
        next = newFields.get(key) ?? null;
      return previous === next ? [] : [{ key, before: previous, after: next }];
    });
}

// Compare declarations, not parser code, runtime values, or compatibility.
export function compareSchemas(before: Graph, after: Graph) {
  inspectGraph(before);
  inspectGraph(after);
  const previous = new Map(
    before.nodes.map((node) => [node.name, normalize(node.structure)]),
  );
  const next = new Map(
    after.nodes.map((node) => [node.name, normalize(node.structure)]),
  );
  const names = [...new Set([...previous.keys(), ...next.keys()])].sort(order);
  const changes: SchemaChange[] = [];
  const unverified: Array<{
    representation: string;
    reasons: Array<"opaque" | "refinement">;
  }> = [];
  for (const name of names) {
    const oldShape = previous.get(name),
      newShape = next.get(name);
    const reasons: Array<"opaque" | "refinement"> = [];
    if (oldShape === null || newShape === null) reasons.push("opaque");
    if (
      (oldShape?.kind === "record" && oldShape.refined) ||
      (newShape?.kind === "record" && newShape.refined)
    )
      reasons.push("refinement");
    if (reasons.length) unverified.push({ representation: name, reasons });
    if (JSON.stringify(oldShape) === JSON.stringify(newShape)) continue;
    changes.push({
      representation: name,
      kind: !previous.has(name)
        ? "added"
        : !next.has(name)
          ? "removed"
          : "changed",
      before: oldShape ?? null,
      after: newShape ?? null,
      fields: changedFields(oldShape ?? null, newShape ?? null),
    });
  }
  return { changes, unverified };
}
