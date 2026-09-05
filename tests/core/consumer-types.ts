import {
  codec,
  compose,
  conversion,
  representation,
  recordCodec,
  optionalCodec,
  operation,
  reference,
  runBatch,
  graph,
  text as textValue,
  record as recordValue,
  optional,
  dateValue,
  dependents,
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

const add = operation({
  name: "Add",
  input: number,
  output: number,
  perform: (value, context: { increment: number }) => value + context.increment,
});
add.execute(1, { increment: 2 }).toFixed(2);
// @ts-expect-error Trusted operation inputs have the declared input type.
add.execute("1", { increment: 2 });
// @ts-expect-error Context must satisfy the operation's contextual contract.
add.run(1, { increment: "2" });
operation({
  name: "Wrong output",
  input: number,
  output: text,
  // @ts-expect-error Output inference is owned by the representation.
  perform: (value) => value,
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

const measurementRef = reference({
  name: "Related measurement",
  from: record.encode.from,
  field: "label",
  to: record.encode.from,
  key: "label",
});
measurementRef
  .resolve({ label: "Length" }, [{ label: "Length", amount: 12 }])
  ?.amount.toFixed(2);
// @ts-expect-error The source reference field must have the declared type.
measurementRef.resolve({ label: 12 }, []);
// @ts-expect-error Targets must have the full target representation type.
measurementRef.resolve({ label: "Length" }, [{ label: "Length" }]);
reference({
  name: "Wrong key",
  from: record.encode.from,
  field: "label",
  to: record.encode.from,
  // @ts-expect-error A numeric key cannot resolve a string reference.
  key: "amount",
});
reference({
  name: "Missing field",
  from: record.encode.from,
  // @ts-expect-error References must identify a real field on the source.
  field: "absent",
  to: record.encode.from,
  key: "label",
});

const batch = runBatch(add, [1, "external invalid input", 2], {
  context: { increment: 2 },
  advance: (context, value) => ({ increment: context.increment + value }),
});
batch.context.increment.toFixed(2);
for (const row of batch.rows) {
  if (row.status === "accepted") row.value.toFixed(2);
  else row.error.stage.toUpperCase();
}
runBatch(add, [], {
  // @ts-expect-error Context types come from the operation.
  context: { increment: "two" },
  advance: (context) => context,
});
runBatch(add, [], {
  context: { increment: 2 },
  // @ts-expect-error Transitions must preserve the operation's context type.
  advance: () => ({ increment: "two" }),
});

const dependencies = dependents(graph([numberText.encode]), {
  kind: "conversion",
  name: numberText.encode.name,
});
for (const dependent of dependencies.dependents) {
  dependent.item.kind.toUpperCase();
  for (const link of dependent.path) {
    if (link.reason.kind === "field") link.reason.field.toUpperCase();
  }
}
// @ts-expect-error Graph selection must identify the kind as well as the name.
dependents(graph([]), { name: "Number" });
// @ts-expect-error Runtime values are not graph definition kinds.
dependents(graph([]), { kind: "value", name: "Number" });

const form = recordValue("Form", {
  id: textValue("ID", { nonempty: true }),
  note: optional(textValue("Note")),
  when: dateValue("When"),
});
const parsedForm = form.parse({ id: "x", when: new Date() });
parsedForm.id.toUpperCase();
parsedForm.note?.toUpperCase();
parsedForm.when.getTime();
const formCommand = operation({
  name: "Use form",
  input: form,
  output: form,
  perform: (value) => value,
});
formCommand.execute({ id: "x", when: new Date() }, undefined);
// @ts-expect-error Structural record inputs infer required date values.
formCommand.execute({ id: "x", when: "2026-09-05" }, undefined);
// @ts-expect-error Structural record inputs retain required fields.
formCommand.execute({ when: new Date() }, undefined);
