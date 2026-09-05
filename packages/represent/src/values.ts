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

export function numberValue(
  name: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
) {
  const { min = null, max = null, integer = false } = options;
  if (
    (min !== null && !Number.isFinite(min)) ||
    (max !== null && !Number.isFinite(max)) ||
    (min !== null && max !== null && min > max)
  )
    throw new Error("Numeric bounds must be finite and ordered");
  return representation({
    name,
    structure: { kind: "number", min, max, integer },
    parse(input: unknown) {
      if (typeof input !== "number" || !Number.isFinite(input))
        throw new Error("Expected a finite number");
      if (integer && !Number.isInteger(input))
        throw new Error("Expected an integer");
      if (min !== null && input < min)
        throw new Error(`Expected at least ${min}`);
      if (max !== null && input > max)
        throw new Error(`Expected at most ${max}`);
      return input;
    },
  });
}
export function booleanValue(name: string) {
  return representation({
    name,
    structure: { kind: "boolean" },
    parse(input: unknown) {
      if (typeof input !== "boolean") throw new Error("Expected a boolean");
      return input;
    },
  });
}
export function nullable<Value>(subject: Representation<Value>) {
  return representation({
    name: `${subject.name} (nullable)`,
    structure: { kind: "nullable", inner: subject },
    parse: (input: unknown) => (input === null ? null : subject.parse(input)),
  });
}
export function list<Value>(element: Representation<Value>) {
  return representation({
    name: `${element.name}[]`,
    structure: { kind: "list", element },
    parse(input: unknown) {
      if (!Array.isArray(input)) throw new Error("Expected a list");
      return Array.from(input, (value: unknown, index) => {
        try {
          return element.parse(value);
        } catch (cause) {
          throw new Error(
            `[${index}]: ${cause instanceof Error ? cause.message : "Invalid element"}`,
            { cause },
          );
        }
      });
    },
  });
}
