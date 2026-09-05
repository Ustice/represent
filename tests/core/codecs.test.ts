import { describe, expect, it } from "vitest";
import {
  codec,
  compose,
  graph,
  representation,
} from "../../packages/represent/src/index.js";

const amount = representation({
  name: "Amount",
  parse(input: unknown) {
    if (typeof input !== "number" || !Number.isFinite(input) || input < 0)
      throw new Error("Expected a finite nonnegative amount");
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
const price = codec({
  name: "Price",
  from: amount,
  to: text,
  encode: (value) => value.toFixed(2),
  decode: (value) => Number(value),
});

describe("bidirectional codecs", () => {
  it("composes the directions without promising recovery of rounded amounts", () => {
    expect(price.encode.convert(12.345)).toBe("12.35");
    expect(price.decode.run("12.35")).toBe(12.35);
    expect(compose(price.encode, price.decode).convert(12.345)).toBe(12.35);
    expect(compose(price.decode, price.encode).run("012.350")).toBe("12.35");
  });

  it("validates each direction at its actual endpoints and identifies the failure", () => {
    expect(() => price.encode.run(-1)).toThrow(
      /Price: encode: input at Amount/,
    );
    expect(() => price.decode.run(12)).toThrow(/Price: decode: input at Text/);
    expect(() => price.decode.run("invalid")).toThrow(
      /Price: decode: output at Amount/,
    );
    const invalid = codec({
      name: "Invalid price",
      from: text,
      to: amount,
      encode: () => -1,
      decode: String,
    });
    expect(() => invalid.encode.run("12")).toThrow(
      /Invalid price: encode: output at Amount/,
    );
  });

  it("registers both executable directions in the graph", () => {
    expect(graph([price.encode, price.decode])).toEqual({
      nodes: [{ name: "Amount" }, { name: "Text" }],
      edges: [
        { name: "Price: encode", from: "Amount", to: "Text" },
        { name: "Price: decode", from: "Text", to: "Amount" },
      ],
      dependencies: [],
      operations: [],
      references: [],
    });
  });
});
