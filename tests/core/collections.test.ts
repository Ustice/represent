import { describe, expect, it } from "vitest";
import {
  booleanValue,
  codec,
  list,
  listCodec,
  nullable,
  nullableCodec,
  numberValue,
  optional,
  optionalCodec,
  presenceOf,
  record,
  representation,
  text,
} from "../../packages/represent/src/index.js";

describe("numeric and collection representations", () => {
  it("enforces finite bounds, integer values, and booleans without coercion", () => {
    const battery = numberValue("Battery", { min: 0, max: 100, integer: true });
    for (const value of [0, 100, 42]) expect(battery.parse(value)).toBe(value);
    for (const value of [-1, 101, 0.5, "42", null, NaN, Infinity])
      expect(() => battery.parse(value)).toThrow();
    expect(booleanValue("Online").parse(false)).toBe(false);
    for (const value of [0, "false", null])
      expect(() => booleanValue("Online").parse(value)).toThrow();
    expect(() => numberValue("Invalid", { min: 2, max: 1 })).toThrow("ordered");
    expect(() => numberValue("Invalid", { max: Infinity })).toThrow("finite");
  });
  it("distinguishes null from missing while following wrapped presence and leaving opaque behavior unknown", () => {
    const value = numberValue("Reading");
    const nullableValue = nullable(value);
    expect(nullableValue.parse(null)).toBeNull();
    expect(nullableValue.parse(0)).toBe(0);
    expect(() => nullableValue.parse(undefined)).toThrow();
    expect(presenceOf(nullableValue)).toBe("required");
    expect(presenceOf(nullable(optional(value)))).toBe("optional");
    expect(
      record("Optional reading", { value: nullable(optional(value)) }).parse(
        {},
      ),
    ).toEqual({});
    const defaultValue = representation({
      name: "Default",
      parse: (input: unknown) => (input === undefined ? 0 : value.parse(input)),
    });
    expect(nullable(defaultValue).parse(undefined)).toBe(0);
    expect(presenceOf(nullable(defaultValue))).toBe("unknown");
  });
  it("converts ordered lists, preserves unavailable readings, and locates element failures", () => {
    let maps = 0;
    const exchange = codec({
      name: "Reading",
      from: numberValue("Number"),
      to: text("Text"),
      encode(value) {
        maps++;
        if (value === 99) throw new Error("Unreportable");
        return String(value);
      },
      decode: (value) => Number(value),
    });
    const readings = listCodec(nullableCodec(exchange));
    expect(readings.encode.convert([0, null, 2])).toEqual(["0", null, "2"]);
    expect(maps).toBe(2);
    expect(readings.decode.run(["0", null, "2"])).toEqual([0, null, 2]);
    expect(readings.decode.run([])).toEqual([]);
    expect(() => readings.encode.convert(new Array<number | null>(3))).toThrow(
      "[0]",
    );
    const optionalReadings = listCodec(optionalCodec(exchange));
    expect(
      optionalReadings.encode.convert(new Array<number | undefined>(2)),
    ).toStrictEqual([undefined, undefined]);
    expect(() => readings.encode.run([1, null, 99])).toThrow(
      /\[2\].*Unreportable/,
    );
    expect(() => readings.decode.run(["0", null, "invalid"])).toThrow(
      /\[2\].*finite number/,
    );
    expect(() => list(numberValue("Dense")).parse(new Array(1))).toThrow("[0]");
  });
  it("does not hide incompatible codec endpoints inside wrappers", () => {
    const a = codec({
      name: "A",
      from: text("A source"),
      to: text("A target"),
      encode: (value) => value,
      decode: (value) => value,
    });
    const b = codec({
      name: "B",
      from: text("B source"),
      to: text("B target"),
      encode: (value) => value,
      decode: (value) => value,
    });
    const malformed = { encode: a.encode, decode: b.decode };
    expect(() => optionalCodec(malformed)).toThrow("opposite endpoints");
    expect(() => nullableCodec(malformed)).toThrow("opposite endpoints");
    expect(() => listCodec(malformed)).toThrow("opposite endpoints");
  });
});
