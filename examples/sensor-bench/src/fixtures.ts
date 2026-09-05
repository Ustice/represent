import { toArbitrary, type ArbitraryProvider } from "@represent/fast-check";
import * as fc from "fast-check";
import {
  deviceId,
  sensorExchange,
  timestamp,
  type SensorSource,
} from "./model.js";

const sensorFixtures: ArbitraryProvider = {
  name: "Synthetic devices and timestamps in 2026",
  arbitrary: (subject) =>
    subject === deviceId
      ? fc.constantFrom("greenhouse-north", "greenhouse-south")
      : subject === timestamp.encode.to
        ? fc
            .date({
              min: new Date("2026-01-01T00:00:00Z"),
              max: new Date("2026-12-31T23:59:59Z"),
              noInvalidDate: true,
            })
            .map((value) => value.toISOString())
        : undefined,
};
export const sensorArbitrary = toArbitrary(sensorExchange.encode.to, {
  providers: [sensorFixtures],
  limits: { maxStringLength: 16, maxListLength: 8 },
});
export function generateBatch(seed: number) {
  if (!Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647)
    throw new Error("Seed must be a signed 32-bit integer");
  const value = fc.sample(sensorArbitrary, { seed, numRuns: 1 })[0];
  if (!value) throw new Error("The generator did not produce a batch");
  return value;
}
export function mockSensorSource(seed: number): SensorSource {
  const fixture = generateBatch(seed);
  return {
    read: (device) => Promise.resolve({ ...structuredClone(fixture), device }),
  };
}
