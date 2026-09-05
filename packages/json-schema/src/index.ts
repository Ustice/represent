import {
  graph,
  inspectGraph,
  presenceOf,
  type Representation,
} from "@represent/core";

type Ref = { readonly $ref: string };
type Definition =
  | { readonly type: "string"; readonly minLength?: 1 }
  | {
      readonly type: "object";
      readonly properties: Readonly<Record<string, Ref>>;
      readonly required: readonly string[];
      readonly additionalProperties: false;
    };
export interface JsonSchema extends Ref {
  readonly $schema: "https://json-schema.org/draft/2020-12/schema";
  readonly $defs: Readonly<Record<string, Definition>>;
}
export interface ExportIssue {
  readonly path: readonly string[];
  readonly representation: string;
  readonly reason:
    | "opaque"
    | "date"
    | "refinement"
    | "optional-root"
    | "optional-cycle"
    | "unsupported-field";
}
export class SchemaExportError extends Error {
  constructor(readonly issues: readonly ExportIssue[]) {
    super(
      issues
        .map(
          (issue) =>
            `${JSON.stringify(issue.path)} (${issue.representation}): ${issue.reason}`,
        )
        .join("; "),
    );
    this.name = "SchemaExportError";
  }
}

// This adapter describes JSON values, not arbitrary JavaScript objects or parser effects.
export function toJsonSchema(subject: Representation<unknown>): JsonSchema {
  const model = graph([], { representations: [subject] });
  inspectGraph(model);
  const nodes = new Map(model.nodes.map((node) => [node.name, node]));
  const definitions = new Map<string, Definition>();
  const visited = new Set<string>();
  const issues: ExportIssue[] = [];
  const ref = (name: string): Ref => ({
    $ref: `#/$defs/${encodeURIComponent(name.replace(/~/g, "~0").replace(/\//g, "~1"))}`,
  });
  function nodeFor(name: string) {
    const node = nodes.get(name);
    if (!node) throw new Error(`Unknown representation: ${name}`);
    return node;
  }
  function visit(
    name: string,
    path: readonly string[],
    wrappers = new Set<string>(),
  ): Ref {
    const structure = nodeFor(name).structure;
    if (structure?.kind === "optional") {
      if (wrappers.has(name)) {
        issues.push({ path, representation: name, reason: "optional-cycle" });
        return ref(name);
      }
      return visit(structure.inner, path, new Set([...wrappers, name]));
    }
    if (visited.has(name)) return ref(name);
    visited.add(name);
    if (!structure || structure.kind === "date") {
      issues.push({
        path,
        representation: name,
        reason: structure ? "date" : "opaque",
      });
    } else if (structure.kind === "text") {
      definitions.set(
        name,
        structure.nonempty
          ? { type: "string", minLength: 1 }
          : { type: "string" },
      );
    } else {
      if (structure.refined)
        issues.push({ path, representation: name, reason: "refinement" });
      const fields = [...structure.fields].sort((a, b) =>
        a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
      );
      for (const field of fields) {
        // Ajv deliberately ignores this key in properties; do not promise a
        // contract that the demonstrated validator cannot enforce faithfully.
        if (field.key === "__proto__")
          issues.push({
            path: [...path, field.key],
            representation: name,
            reason: "unsupported-field",
          });
      }
      const properties = Object.fromEntries(
        fields.map((field) => [
          field.key,
          visit(field.representation, [...path, field.key]),
        ]),
      );
      const required = fields
        .filter((field) => {
          return presenceOf(nodeFor(field.representation)) !== "optional";
        })
        .map((field) => field.key);
      definitions.set(name, {
        type: "object",
        properties,
        required,
        additionalProperties: false,
      });
    }
    return ref(name);
  }
  if (subject.structure?.kind === "optional")
    issues.push({
      path: [],
      representation: subject.name,
      reason: "optional-root",
    });
  const root = visit(subject.name, []);
  if (issues.length) throw new SchemaExportError(issues);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...root,
    $defs: Object.fromEntries(
      [...definitions].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  };
}
