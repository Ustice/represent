import {
  graph,
  inspectGraph,
  presenceOf,
  type Representation,
} from "@represent/core";

type Ref = { readonly $ref: string };
export type JsonSchemaDefinition = boolean | Readonly<Record<string, unknown>>;
export interface ProvidedContract {
  readonly schema: JsonSchemaDefinition;
  readonly presence: "required" | "optional";
}
export interface JsonSchemaProvider {
  readonly name: string;
  readonly contract: (
    representation: Representation<unknown>,
  ) => ProvidedContract | undefined;
}
export interface JsonSchema extends Ref {
  readonly $schema: "https://json-schema.org/draft/2020-12/schema";
  readonly $defs: Readonly<Record<string, JsonSchemaDefinition>>;
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
    | "unsupported-field"
    | "provider";
  readonly detail?: string;
}
export class SchemaExportError extends Error {
  constructor(readonly issues: readonly ExportIssue[]) {
    super(
      issues
        .map(
          (issue) =>
            `${JSON.stringify(issue.path)} (${issue.representation}): ${issue.reason}${issue.detail ? `: ${issue.detail}` : ""}`,
        )
        .join("; "),
    );
    this.name = "SchemaExportError";
  }
}

// This adapter describes JSON values, not arbitrary JavaScript objects or parser effects.
export function toJsonSchema(
  subject: Representation<unknown>,
  options: { providers?: readonly JsonSchemaProvider[] } = {},
): JsonSchema {
  const model = graph([], { representations: [subject] });
  inspectGraph(model);
  const definitions = new Map<string, JsonSchemaDefinition>();
  const visited = new Set<string>();
  const issues: ExportIssue[] = [];
  const ref = (name: string): Ref => ({
    $ref: `#/$defs/${encodeURIComponent(name.replace(/~/g, "~0").replace(/\//g, "~1"))}`,
  });
  const contracts = new Map<
    Representation<unknown>,
    ProvidedContract | undefined
  >();
  function external(value: Representation<unknown>, path: readonly string[]) {
    if (contracts.has(value)) return contracts.get(value);
    const found: ProvidedContract[] = [];
    for (const provider of options.providers ?? []) {
      try {
        const result = provider.contract(value);
        if (result) {
          const allowed = new Set([
            "type",
            "enum",
            "const",
            "pattern",
            "minLength",
            "maxLength",
            "format",
            "minimum",
            "maximum",
            "exclusiveMinimum",
            "exclusiveMaximum",
            "multipleOf",
            "title",
            "description",
          ]);
          if (
            typeof result.schema === "object" &&
            Object.keys(result.schema).some((key) => !allowed.has(key))
          )
            throw new Error(
              "Providers currently supply leaf schemas without references, identifiers, or nested schemas",
            );
          found.push(result);
        }
      } catch (error) {
        issues.push({
          path,
          representation: value.name,
          reason: "provider",
          detail: `${provider.name}: ${error instanceof Error ? error.message : "Export failed"}`,
        });
      }
    }
    if (found.length > 1)
      issues.push({
        path,
        representation: value.name,
        reason: "provider",
        detail: "Multiple providers claim this representation",
      });
    const result = found[0];
    contracts.set(value, result);
    return result;
  }
  function presence(value: Representation<unknown>, path: readonly string[]) {
    return value.structure
      ? presenceOf(value)
      : (external(value, path)?.presence ?? "unknown");
  }
  function visit(
    value: Representation<unknown>,
    path: readonly string[],
    wrappers = new Set<string>(),
  ): Ref {
    const { name, structure } = value;
    if (structure?.kind === "optional") {
      if (wrappers.has(name)) {
        issues.push({ path, representation: name, reason: "optional-cycle" });
        return ref(name);
      }
      return visit(structure.inner, path, new Set([...wrappers, name]));
    }
    if (visited.has(name)) return ref(name);
    visited.add(name);
    if (!structure) {
      const provided = external(value, path);
      if (provided) definitions.set(name, provided.schema);
      else if (!issues.some((issue) => issue.representation === name))
        issues.push({ path, representation: name, reason: "opaque" });
    } else if (structure.kind === "date") {
      issues.push({ path, representation: name, reason: "date" });
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
          return (
            presence(field.representation, [...path, field.key]) !== "optional"
          );
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
  if (presence(subject, []) === "optional")
    issues.push({
      path: [],
      representation: subject.name,
      reason: "optional-root",
    });
  const root = visit(subject, []);
  if (issues.length) throw new SchemaExportError(issues);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...root,
    $defs: Object.fromEntries(
      [...definitions].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  };
}
