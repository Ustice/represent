import {
  compose,
  conversion,
  representation,
} from "../../packages/represent/src/index.js";

// This consumer program is checked by tsc, not executed by Vitest.
const number = representation({
  name: "Number",
  parse(input: unknown) {
    if (typeof input !== "number") throw new Error("Expected number");
    return input;
  },
});
const text = representation({
  name: "Text",
  parse(input: unknown) {
    if (typeof input !== "string") throw new Error("Expected text");
    return input;
  },
});
const format = conversion({
  name: "Format",
  from: number,
  to: text,
  map: (value) => value.toFixed(2),
});
const parse = conversion({
  name: "Parse",
  from: text,
  to: number,
  map: (value) => Number(value),
});
compose(format, parse).convert(42).toFixed(2);
format.convert(42).toUpperCase();

// @ts-expect-error A number-to-text edge cannot accept a string statically.
format.convert("42");
// @ts-expect-error The second edge expects a number, but the first produces text.
compose(format, format);
conversion({
  name: "Wrong mapper",
  from: number,
  to: text,
  // @ts-expect-error Target inference comes from the representation, not the mapper.
  map: (value) => value,
});
