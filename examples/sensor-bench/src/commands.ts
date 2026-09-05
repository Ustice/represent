import { tracePath } from "@represent/core";
import { toJsonSchema } from "@represent/json-schema";
import { zodJsonSchema } from "@represent/zod";
import { sensorExchange, sensorGraph, summarize } from "./model.js";

export function summarizeInput(input: unknown) {
  return summarize.convert(sensorExchange.decode.run(input));
}
export function roundTrip(input: unknown) {
  const trace = tracePath(
    [sensorExchange.decode, sensorExchange.encode],
    input,
    {
      snapshot: (value: unknown): unknown => structuredClone(value),
    },
  );
  if (trace.status === "failed") return trace;
  const before = sensorExchange.encode.to.parse(trace.initial);
  const after = sensorExchange.encode.to.parse(trace.output);
  const readingChanges = Array.from(
    { length: Math.max(before.samples.length, after.samples.length) },
    (_, index) => ({
      index,
      temperatureChanged:
        before.samples[index]?.temperature !==
        after.samples[index]?.temperature,
      timestampSpellingChanged:
        before.samples[index]?.time !== after.samples[index]?.time,
    }),
  ).filter(
    (change) => change.temperatureChanged || change.timestampSpellingChanged,
  );
  return {
    ...trace,
    readingChanges,
    scope:
      "One supplied batch. Temperature is rounded to one decimal in each direction; timestamp spelling is canonicalized. No losslessness claim.",
  };
}
export const sensorContract = () =>
  toJsonSchema(sensorExchange.encode.to, { providers: [zodJsonSchema] });
export { sensorGraph };
