import { describe, expect, it } from "vitest";
import {
  codec,
  optionalCodec,
  recordCodec,
  representation,
} from "../../packages/represent/src/index.js";

const text = representation({
  name: "Text",
  parse(input: unknown) {
    if (typeof input !== "string") throw new Error("Expected text");
    return input;
  },
});
const count = representation({
  name: "Count",
  parse(input: unknown) {
    if (typeof input !== "number" || !Number.isInteger(input) || input < 0)
      throw new Error("Expected nonnegative integer");
    return input;
  },
});
const countText = codec({
  name: "Count text",
  from: count,
  to: text,
  encode: String,
  decode: Number,
});
const subject = recordCodec({
  name: "Stock",
  from: "Stock record",
  to: "Stock API",
  fields: {
    label: text,
    quantity: countText,
    reserved: optionalCodec(countText),
  },
  validate(value) {
    if (value.reserved !== undefined && value.reserved > value.quantity)
      throw new Error("Too many reserved");
  },
});

describe("record codec assembly", () => {
  it("rejects a pair whose directions describe different endpoints", () => {
    const unrelated = codec({
      name: "Unrelated",
      from: representation({ ...text, name: "Other text" }),
      to: count,
      encode: Number,
      decode: String,
    });
    expect(() =>
      recordCodec({
        name: "Mismatch",
        from: "Source",
        to: "Target",
        fields: {
          count: { encode: countText.encode, decode: unrelated.encode },
        },
      }),
    ).toThrow(/count: codec directions must share opposite endpoints/);
  });
  it("combines unchanged fields with converted fields in both directions", () => {
    expect(
      subject.encode.convert({ label: "Canvas", quantity: 17, reserved: 3 }),
    ).toEqual({ label: "Canvas", quantity: "17", reserved: "3" });
    expect(
      subject.decode.run({ label: "Canvas", quantity: "17", reserved: "3" }),
    ).toEqual({ label: "Canvas", quantity: 17, reserved: 3 });
  });
  it("preserves missing versus explicitly undefined fields", () => {
    const missing = { label: "Canvas", quantity: 17 };
    const present = { ...missing, reserved: undefined };
    expect(Object.hasOwn(subject.encode.convert(missing), "reserved")).toBe(
      false,
    );
    expect(Object.hasOwn(subject.encode.convert(present), "reserved")).toBe(
      true,
    );
    expect(
      Object.hasOwn(
        subject.decode.run({ label: "Canvas", quantity: "17" }),
        "reserved",
      ),
    ).toBe(false);
    expect(
      Object.hasOwn(
        subject.decode.run({
          label: "Canvas",
          quantity: "17",
          reserved: undefined,
        }),
        "reserved",
      ),
    ).toBe(true);
    expect(() =>
      subject.decode.run({ label: "Canvas", quantity: "17", reserved: null }),
    ).toThrow(/reserved/);
  });
  it("reports nested field failures and rejects malformed record shapes", () => {
    const nested = recordCodec({
      name: "Order",
      from: "Order",
      to: "Order API",
      fields: { stock: subject },
    });
    expect(() =>
      nested.decode.run({ stock: { label: "Canvas", quantity: "bad" } }),
    ).toThrow(/stock:.*quantity:/);
    for (const input of [
      null,
      [],
      "text",
      { label: "Canvas" },
      { label: "Canvas", quantity: "17", surprise: true },
    ])
      expect(() => subject.decode.run(input)).toThrow();
  });
  it("does not read missing declared fields from the prototype", () => {
    const inherited: unknown = Object.create({
      label: "Canvas",
      quantity: "17",
    });
    expect(() => subject.decode.run(inherited)).toThrow(/label/);
    const polluted: unknown = JSON.parse(
      '{"label":"Canvas","quantity":"17","__proto__":{"polluted":true}}',
    );
    expect(() => subject.decode.run(polluted)).toThrow(
      /Unexpected field: __proto__/,
    );
  });
  it("applies whole-record rules in both directions", () => {
    expect(() =>
      subject.encode.convert({ label: "Canvas", quantity: 1, reserved: 2 }),
    ).toThrow(/Stock: encode: input at Stock record: Too many reserved/);
    expect(() =>
      subject.decode.run({ label: "Canvas", quantity: "1", reserved: "2" }),
    ).toThrow(/Stock: decode: output at Stock record: Too many reserved/);
  });
  it("rejects a bad field result even when it has the right TypeScript type", () => {
    const broken = codec({
      name: "Broken",
      from: text,
      to: count,
      encode: () => -1,
      decode: String,
    });
    const record = recordCodec({
      name: "Broken record",
      from: "Source",
      to: "Target",
      fields: { value: broken },
    });
    expect(() => record.encode.convert({ value: "one" })).toThrow(
      /value:.*Broken: encode: output at Count/,
    );
  });
});
