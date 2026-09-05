import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  toArbitrary,
  type ArbitraryProvider,
} from "../../packages/fast-check/src/index.js";
import {
  booleanValue,
  dateValue,
  list,
  nullable,
  numberValue,
  optional,
  record,
  recordCodec,
  representation,
  text,
  type Representation,
} from "../../packages/represent/src/index.js";

describe("derived fast-check generators", () => {
  it("generates bounded records with distinct null, missing, and present values and supports shrinking", () => {
    const note = optional(nullable(text("Note", { nonempty: true })));
    const model = record("Reading", {
      active: booleanValue("Active"),
      count: numberValue("Count", { min: 0, max: 9, integer: true }),
      values: list(numberValue("Measured", { min: -4, max: 4 })),
      note,
    });
    const arbitrary = toArbitrary(model, {
      limits: { maxStringLength: 6, maxListLength: 3 },
    });
    const samples = fc.sample(arbitrary, { seed: 162, numRuns: 200 });
    expect(samples.some((value) => !Object.hasOwn(value, "note"))).toBe(true);
    expect(
      samples.some(
        (value) => Object.hasOwn(value, "note") && value.note === undefined,
      ),
    ).toBe(true);
    expect(samples.some((value) => value.note === null)).toBe(true);
    expect(samples.some((value) => typeof value.note === "string")).toBe(true);
    expect(samples.some((value) => value.active)).toBe(true);
    expect(samples.some((value) => !value.active)).toBe(true);
    expect(
      samples.every(
        (value) =>
          value.count >= 0 &&
          value.count <= 9 &&
          Number.isInteger(value.count) &&
          value.values.length <= 3 &&
          value.values.every((item) => item >= -4 && item <= 4),
      ),
    ).toBe(true);
    expect(fc.sample(arbitrary, { seed: 162, numRuns: 200 })).toEqual(samples);
    const result = fc.check(
      fc.property(
        toArbitrary(
          numberValue("Positive", { min: 1, max: 100, integer: true }),
        ),
        (value) => value === 0,
      ),
      { seed: 9, numRuns: 20 },
    );
    expect(result.failed).toBe(true);
    expect(result.counterexample).toEqual([1]);
    expect(result.seed).toBe(9);
  });
  it("rejects unsupported domains with a field path instead of discarding inconvenient values", () => {
    const recursive: Representation<unknown> = {
      name: "Recursive",
      parse: (input: unknown) => input,
      get structure() {
        return { kind: "optional", inner: recursive } as const;
      },
    };
    expect(() => toArbitrary(recursive)).toThrow(
      "Recursive structures need an explicit provider",
    );
    expect(
      fc.sample(
        toArbitrary(recursive, {
          providers: [
            { name: "Finite seed", arbitrary: () => fc.constant(undefined) },
          ],
        }),
        { seed: 1, numRuns: 1 },
      ),
    ).toEqual([undefined]);
    const opaque = representation({
      name: "Opaque",
      parse: (value: unknown) => value,
    });
    expect(() => toArbitrary(record("Outer", { rows: list(opaque) }))).toThrow(
      '["rows","[]"] (Opaque)',
    );
    expect(() =>
      toArbitrary(
        recordCodec({
          name: "Restricted record",
          from: "Refined",
          to: "Wire",
          fields: { id: text("ID") },
          validate(value) {
            if (!value.id.startsWith("A")) throw new Error("Expected A prefix");
          },
        }).encode.from,
      ),
    ).toThrow("Refined record");
    expect(() =>
      toArbitrary(
        numberValue("Empty integer interval", {
          min: 0.2,
          max: 0.8,
          integer: true,
        }),
      ),
    ).toThrow("contains no integer");
    expect(() =>
      toArbitrary(
        numberValue("Unsafe", {
          min: Number.MAX_SAFE_INTEGER + 1,
          integer: true,
        }),
      ),
    ).toThrow("safe-integer bounds");
    expect(() =>
      toArbitrary(text("Nonempty", { nonempty: true }), {
        limits: { maxStringLength: 0 },
      }),
    ).toThrow("excludes nonempty");
  });
  it("accepts explicit generators for custom constraints and validates their output without filtering", () => {
    const normalized = representation({
      name: "Uppercase",
      parse(input: unknown) {
        if (typeof input !== "string") throw new Error("Expected text");
        return input.toUpperCase();
      },
    });
    const provider: ArbitraryProvider = {
      name: "Words",
      arbitrary: (subject) =>
        subject === normalized ? fc.constant("hello") : undefined,
    };
    expect(
      fc.sample(toArbitrary(normalized, { providers: [provider] }), {
        seed: 1,
        numRuns: 1,
      }),
    ).toEqual(["HELLO"]);
    expect(() =>
      toArbitrary(normalized, { providers: [provider, provider] }),
    ).toThrow("Multiple providers claim this representation: Words, Words");
    expect(() =>
      fc.sample(
        toArbitrary(normalized, {
          providers: [{ name: "Broken", arbitrary: () => fc.constant(1) }],
        }),
        { seed: 1, numRuns: 1 },
      ),
    ).toThrow("Expected text");
  });
  it("keeps generated Dates finite and preserves prototype-named record fields", () => {
    const model = record("Odd keys", {
      ["__proto__"]: dateValue("Date"),
      constructor: text("Constructor"),
    });
    const values = fc.sample(toArbitrary(model), { seed: 7, numRuns: 10 });
    for (const value of values) {
      expect(Object.hasOwn(value, "__proto__")).toBe(true);
      expect(Number.isFinite(value.__proto__.getTime())).toBe(true);
      expect(typeof value.constructor).toBe("string");
    }
  });
});
