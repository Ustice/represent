import type { Representation } from "./conversions.js";

export type Presence = "required" | "optional" | "unknown";

// References are runtime definitions in a model and names in a serialized graph.
export type Structure<Reference = string> =
  | { readonly kind: "text"; readonly nonempty: boolean }
  | { readonly kind: "date" }
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
    case "optional":
      return { ...structure, inner: map(structure.inner) };
    default:
      return { ...structure };
  }
}

export function structureReferences<Ref>(structure: Structure<Ref>) {
  switch (structure.kind) {
    case "record":
      return structure.fields.map(({ representation }) => representation);
    case "optional":
      return [structure.inner];
    default:
      return [];
  }
}

export function presenceOf(subject: {
  readonly structure?: Structure<unknown>;
}): Presence {
  if (!subject.structure) return "unknown";
  return subject.structure.kind === "optional" ? "optional" : "required";
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
