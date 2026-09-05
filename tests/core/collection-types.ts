import {
  booleanValue,
  codec,
  list,
  listCodec,
  nullable,
  nullableCodec,
  numberValue,
  record,
  text,
} from "../../packages/represent/src/index.js";

const reading = nullable(numberValue("Reading"));
const batch = record("Batch", {
  online: booleanValue("Online"),
  current: reading,
  samples: list(reading),
});
const value = batch.parse({ online: false, current: null, samples: [0, null] });
export const typed: {
  online: boolean;
  current: number | null;
  samples: (number | null)[];
} = value;
// @ts-expect-error Nullable remains a required field.
export const missing: typeof value = { online: false, samples: [] };
const exchange = codec({
  name: "Reading text",
  from: numberValue("Number"),
  to: text("Text"),
  encode: String,
  decode: Number,
});
const values = listCodec(nullableCodec(exchange));
export const encoded: (string | null)[] = values.encode.convert([1, null]);
export const decoded: (number | null)[] = values.decode.convert(["1", null]);
// @ts-expect-error Encoding takes numbers, not the target strings.
values.encode.convert(["1"]);
// @ts-expect-error Decoding returns numbers, not strings.
export const strings: string[] = values.decode.run(["1"]);
