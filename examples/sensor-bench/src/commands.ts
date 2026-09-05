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
  const changedReadings = Array.from(
    { length: Math.max(before.samples.length, after.samples.length) },
    (_, index) => index,
  ).filter((index) => {
    const a = before.samples[index],
      b = after.samples[index];
    return a?.temperature !== b?.temperature || a?.time !== b?.time;
  });
  return {
    ...trace,
    changedReadings,
    scope:
      "One supplied batch. Temperature is rounded to one decimal in each direction; timestamp spelling is canonicalized. No losslessness claim.",
  };
}
export const sensorContract = () =>
  toJsonSchema(sensorExchange.encode.to, { providers: [zodJsonSchema] });
export { sensorGraph };
