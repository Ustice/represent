import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  generateBatch,
  mockSensorSource,
} from "../../examples/sensor-bench/src/fixtures.js";
import {
  inspectSensor,
  sensorExchange,
} from "../../examples/sensor-bench/src/model.js";
import { summarizeInput } from "../../examples/sensor-bench/src/commands.js";

describe("generated telemetry fixtures and mock source", () => {
  it("replays a generated fixture and exercises the real async operation against independent mock values", async () => {
    expect(generateBatch(162)).toEqual(generateBatch(162));
    const source = mockSensorSource(162);
    const first = await source.read("test-sensor");
    expect(
      await inspectSensor.execute({ device: "test-sensor" }, source),
    ).toEqual(summarizeInput(first));
    if (
      typeof first !== "object" ||
      first === null ||
      !("samples" in first) ||
      !Array.isArray(first.samples)
    )
      throw new Error("Expected mock batch");
    first.samples.push(null);
    expect(() => sensorExchange.decode.run(first)).toThrow();
    expect(
      await inspectSensor.execute({ device: "test-sensor" }, source),
    ).toEqual(summarizeInput(await source.read("test-sensor")));
  });
  it("preserves upstream validation and requested-device identity with a mock or real source", async () => {
    await expect(
      inspectSensor.execute(
        { device: "requested" },
        {
          read: () =>
            Promise.resolve({ ...generateBatch(162), device: "different" }),
        },
      ),
    ).rejects.toThrow("different device");
    await expect(
      inspectSensor.execute(
        { device: "requested" },
        {
          read: () =>
            Promise.resolve({
              ...generateBatch(162),
              device: "requested",
              batteryPercent: 101,
            }),
        },
      ),
    ).rejects.toThrow("batteryPercent: Expected at most 100");
    expect(() => generateBatch(NaN)).toThrow("signed 32-bit integer");
  });
  it("emits a consumable fixture through the actual CLI", () => {
    const output = execFileSync(
      "pnpm",
      ["--silent", "sensor", "generate", "--seed", "162"],
      {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const input: unknown = JSON.parse(output);
    expect(summarizeInput(input)).toEqual(summarizeInput(generateBatch(162)));
  });
});
