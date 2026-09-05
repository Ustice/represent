import { describe, expect, it } from "vitest";
import {
  codec,
  compose,
  graph,
  optionalCodec,
  recordCodec,
  representation,
} from "../../packages/represent/src/index.js";

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
const value = codec({
  name: "Value",
  from: number,
  to: text,
  encode: String,
  decode: Number,
});
describe("field conversion dependencies", () => {
  it("retains the ordered dependencies of an explicitly composed route", () => {
    const route = compose(value.encode, value.decode);
    expect(graph([route]).dependencies).toEqual([
      { parent: route.name, field: null, conversion: value.encode.name },
      { parent: route.name, field: null, conversion: value.decode.name },
    ]);
  });
  it("includes shared conversion once and retains every field binding", () => {
    const record = recordCodec({
      name: "Pair",
      from: "Pair",
      to: "Pair API",
      fields: { left: value, right: value },
    });
    const result = graph([record.encode, value.encode]);
    expect(result.edges).toEqual([
      { name: "Pair: encode", from: "Pair", to: "Pair API" },
      { name: "Value: encode", from: "Number", to: "Text" },
    ]);
    expect(result.dependencies).toEqual([
      { parent: "Pair: encode", field: "left", conversion: "Value: encode" },
      { parent: "Pair: encode", field: "right", conversion: "Value: encode" },
    ]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
  it("walks nested records and optional wrappers without running conversions", () => {
    const optional = optionalCodec(value);
    const inner = recordCodec({
      name: "Inner",
      from: "Inner",
      to: "Inner API",
      fields: { value: optional },
    });
    const outer = recordCodec({
      name: "Outer",
      from: "Outer",
      to: "Outer API",
      fields: { inner },
    });
    expect(graph([outer.decode]).dependencies).toEqual([
      {
        parent: outer.decode.name,
        field: "inner",
        conversion: inner.decode.name,
      },
      {
        parent: inner.decode.name,
        field: "value",
        conversion: optional.decode.name,
      },
      {
        parent: optional.decode.name,
        field: null,
        conversion: value.decode.name,
      },
    ]);
  });
  it("rejects conflicting dependency names rather than merging distinct conversions", () => {
    const other = codec({
      name: "Value",
      from: number,
      to: text,
      encode: (value) => `${value}!`,
      decode: Number,
    });
    const record = recordCodec({
      name: "Conflict",
      from: "Conflict",
      to: "Conflict API",
      fields: { left: value, right: other },
    });
    expect(() => graph([record.encode])).toThrow(
      /Duplicate conversion name: Value: encode/,
    );
  });
});
