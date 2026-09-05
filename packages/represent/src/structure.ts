import type { Representation } from "./conversions.js";

export type Presence = "required" | "optional" | "unknown";

// References are runtime definitions in a model and names in a serialized graph.
export type Structure<Reference = string> =
  | { readonly kind: "text"; readonly nonempty: boolean }
  | { readonly kind: "date" }
  | { readonly kind: "boolean" }
  | {
      readonly kind: "number";
      readonly min: number | null;
      readonly max: number | null;
      readonly integer: boolean;
    }
  | { readonly kind: "list"; readonly element: Reference }
  | { readonly kind: "nullable"; readonly inner: Reference }
  | {
      readonly kind: "record";
      readonly fields: readonly {
        readonly key: string;
        readonly representation: Reference;
      }[];
      readonly refined: boolean;
    }
  | { readonly kind: "optional"; readonly inner: Reference };

export function mapStructure<From, To>(
  structure: Structure<From>,
  map: (reference: From) => To,
): Structure<To> {
  switch (structure.kind) {
    case "record":
      return {
        ...structure,
        fields: structure.fields.map((field) => ({
          ...field,
          representation: map(field.representation),
        })),
      };
    case "nullable":
    case "optional":
      return { ...structure, inner: map(structure.inner) };
    case "list":
      return { ...structure, element: map(structure.element) };
    default:
      return { ...structure };
  }
}

export function structureReferences<Ref>(structure: Structure<Ref>) {
  switch (structure.kind) {
    case "record":
      return structure.fields.map(({ representation }) => representation);
    case "nullable":
    case "optional":
      return [structure.inner];
    case "list":
      return [structure.element];
    default:
      return [];
  }
}

type PresenceSubject = {
  readonly structure?: Structure<string | Representation<unknown>>;
};
export function presenceOf(
  subject: PresenceSubject,
  resolve?: (name: string) => PresenceSubject | undefined,
): Presence {
  const seen = new Set<string | Representation<unknown>>();
  let current: PresenceSubject | undefined = subject;
  while (current?.structure?.kind === "nullable") {
    const inner: string | Representation<unknown> = current.structure.inner;
    if (seen.has(inner)) return "unknown";
    seen.add(inner);
    current = typeof inner === "string" ? resolve?.(inner) : inner;
  }
  if (!current?.structure) return "unknown";
  return current.structure.kind === "optional" ? "optional" : "required";
}

export function recordStructure(
  fields: Readonly<Record<string, Representation<unknown>>>,
  refined: boolean,
): Structure<Representation<unknown>> {
  return {
    kind: "record",
    refined,
    fields: Object.entries(fields).map(([key, representation]) => ({
      key,
      representation,
    })),
  };
}
