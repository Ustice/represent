import { describe, expect, it } from "vitest";
import {
  compose,
  conversion,
  ConversionError,
  graph,
  representation,
} from "../../packages/represent/src/index.js";

const amount = representation({
  name: "Amount",
  parse(input: unknown) {
    if (typeof input !== "number" || !Number.isFinite(input) || input < 0) {
      throw new Error("Expected a finite nonnegative amount");
    }
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

const cents = conversion({
  name: "Dollars to cents",
  from: amount,
  to: amount,
  map: (dollars) => dollars * 100,
});

const format = conversion({
  name: "Format amount",
  from: amount,
  to: text,
  map: (value) => `${value} cents`,
});

function failure(operation: () => unknown) {
  try {
    operation();
  } catch (error) {
    if (error instanceof ConversionError) return error;
    throw error;
  }
  throw new Error("Expected a ConversionError");
}

describe("explicit conversion execution", () => {
  it("uses source parsing and target parsing around the mapping", () => {
    const canonicalText = representation({
      name: "Canonical text",
      parse: (input: unknown) => text.parse(input).trim(),
    });
    const normalize = conversion({
      name: "Normalize",
      from: canonicalText,
      to: canonicalText,
      map: (value) => ` ${value.toUpperCase()}:${value.length} `,
    });
    expect(normalize.run("  hello  ")).toBe("HELLO:5");
    expect(cents.convert(12.5)).toBe(1250);
  });

  it("rejects malformed input before executing a conversion", () => {
    let mapped = false;
    const subject = conversion({
      name: "Track amount",
      from: amount,
      to: amount,
      map(value) {
        mapped = true;
        return value;
      },
    });
    const error = failure(() => subject.run("12.50"));
    expect(error).toMatchObject({
      conversion: "Track amount",
      representation: "Amount",
      stage: "input",
    });
    expect(error.message).toContain("Expected a finite nonnegative amount");
    expect(mapped).toBe(false);
  });

  it("catches invalid runtime values even through the typed entry point", () => {
    expect(() => cents.convert(Number.NaN)).toThrowError(ConversionError);
  });

  it("rejects output that satisfies TypeScript but violates its representation", () => {
    const negative = conversion({
      name: "Broken discount",
      from: amount,
      to: amount,
      map: (value) => -value,
    });
    expect(failure(() => negative.run(12))).toMatchObject({
      conversion: "Broken discount",
      representation: "Amount",
      stage: "output",
    });
  });

  it("preserves a mapper failure as a contextual cause", () => {
    const cause = new Error("Exchange rate unavailable");
    const unavailable = conversion({
      name: "Exchange",
      from: amount,
      to: amount,
      map() {
        throw cause;
      },
    });
    const error = failure(() => unavailable.run(12));
    expect(error).toMatchObject({
      conversion: "Exchange",
      representation: "Amount",
      stage: "map",
    });
    expect(error.cause).toBe(cause);
  });
});

describe("explicit routes", () => {
  it("executes edges in the declared order", () => {
    expect(compose(cents, format).run(12.5)).toBe("1250 cents");
  });

  it("requires identical intermediate representations, not matching shapes or names", () => {
    const differentAmount = representation({ ...amount });
    const formatOther = conversion({
      name: "Format other amount",
      from: differentAmount,
      to: text,
      map: String,
    });
    expect(() => compose(cents, formatOther)).toThrowError(
      /intermediate representations must be the same object/,
    );
  });

  it("stops at the failing edge and keeps that edge's diagnostic", () => {
    let continued = false;
    const broken = conversion({
      name: "Invalid intermediate",
      from: amount,
      to: amount,
      map: () => Number.NaN,
    });
    const next = conversion({
      name: "Next",
      from: amount,
      to: text,
      map(value) {
        continued = true;
        return String(value);
      },
    });
    expect(failure(() => compose(broken, next).run(12))).toMatchObject({
      conversion: "Invalid intermediate",
      stage: "output",
    });
    expect(continued).toBe(false);
  });
});

describe("graph descriptors", () => {
  it("describes registered directions and serializes without runtime functions", () => {
    const descriptor = graph([cents, format]);
    expect(JSON.parse(JSON.stringify(descriptor))).toEqual({
      nodes: [{ name: "Amount" }, { name: "Text" }],
      edges: [
        { name: "Dollars to cents", from: "Amount", to: "Amount" },
        { name: "Format amount", from: "Amount", to: "Text" },
      ],
    });
  });

  it("rejects conversion-name collisions instead of silently losing an edge", () => {
    expect(() => graph([cents, cents])).toThrowError(
      "Duplicate conversion name: Dollars to cents",
    );
  });

  it("rejects representation-name collisions instead of joining distinct nodes", () => {
    const other = representation({ ...amount });
    const conflicting = conversion({
      name: "Different amount",
      from: other,
      to: text,
      map: String,
    });
    expect(() => graph([cents, conflicting])).toThrowError(
      "Duplicate representation name: Amount",
    );
  });
});
