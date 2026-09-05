import {
  codec,
  compose,
  conversion,
  representation,
  recordCodec,
  optionalCodec,
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

const numberText = codec({
  name: "Number text",
  from: number,
  to: text,
  encode: (value) => value.toFixed(2),
  decode: (value) => Number(value),
});

const record = recordCodec({
  name: "Measurement",
  from: "Measurement",
  to: "Measurement API",
  fields: { label: text, amount: numberText, limit: optionalCodec(numberText) },
  validate(value) {
    value.amount.toFixed(2);
    value.limit?.toFixed(2);
  },
});
record.encode.convert({ label: "Length", amount: 12 }).amount.toUpperCase();
record.decode.convert({ label: "Length", amount: "12" }).amount.toFixed(2);
record.encode.convert({ label: "Length", amount: 12, limit: undefined });
record.decode.run({}).limit?.toFixed(2);
// @ts-expect-error Required fields remain required.
record.encode.convert({ label: "Length" });
// @ts-expect-error Optional fields still have a specific source type.
record.encode.convert({ label: "Length", amount: 12, limit: "14" });
// @ts-expect-error Decode inputs use the encoded field type.
record.decode.convert({ label: "Length", amount: 12 });
// @ts-expect-error Unknown fields are not part of the inferred record.
record.encode.convert({ label: "Length", amount: 12, extra: true });
// @ts-expect-error Decoded output retains its field types.
numberText.decode.convert(record.decode.run({}).amount);
numberText.encode.convert(42).toUpperCase();
numberText.decode.convert("42").toFixed(2);
compose(numberText.encode, numberText.decode).convert(42).toFixed(2);
// @ts-expect-error Encoding accepts the source representation.
numberText.encode.convert("42");
// @ts-expect-error Decoding accepts the target representation.
numberText.decode.convert(42);
codec({
  name: "Wrong decoder",
  from: number,
  to: text,
  encode: String,
  // @ts-expect-error Decoder output must match the source representation.
  decode: (value) => value,
});
codec({
  name: "Wrong encoder",
  from: number,
  to: text,
  // @ts-expect-error Encoder output must match the target representation.
  encode: (value) => value,
  decode: Number,
});
