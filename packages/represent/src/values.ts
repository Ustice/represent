import { representation, type Representation } from "./conversions.js";

export function text(name: string, options: { nonempty?: boolean } = {}) {
  const nonempty = options.nonempty ?? false;
  return representation({
    name,
    structure: { kind: "text", nonempty },
    parse(input: unknown) {
      if (typeof input !== "string") throw new Error("Expected text");
      if (nonempty && input.length === 0)
        throw new Error("Expected nonempty text");
      return input;
    },
  });
}

export function dateValue(name: string) {
  return representation({
    name,
    structure: { kind: "date" },
    parse(input: unknown) {
      if (!(input instanceof Date) || !Number.isFinite(input.getTime()))
        throw new Error("Invalid Date: expected a finite Date");
      return input;
    },
  });
}

export function optional<Value>(subject: Representation<Value>) {
  return representation({
    name: `${subject.name} (optional)`,
    structure: { kind: "optional", inner: subject },
    parse: (input: unknown) =>
      input === undefined ? undefined : subject.parse(input),
  });
}
