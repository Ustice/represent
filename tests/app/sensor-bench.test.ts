import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  roundTrip,
  summarizeInput,
} from "../../examples/sensor-bench/src/commands.js";

import { temperatureRoute } from "../../examples/sensor-bench/src/routing.js";

const sample = async (): Promise<unknown> =>
  JSON.parse(
    await readFile(
      new URL("../../examples/sensor-bench/sample.json", import.meta.url),
      "utf8",
    ),
  );
describe("Sensor Bench consumer", () => {
  it("summarizes available Celsius readings without treating unavailable samples as zero", async () => {
    expect(summarizeInput(await sample())).toEqual({
      device: "greenhouse-north",
      online: true,
      samples: 3,
      available: 2,
      meanCelsius: 21.2,
    });
    const empty = {
      device: "offline",
      online: false,
      batteryPercent: 0,
      samples: [],
    };
    expect(summarizeInput(empty)).toEqual({
      device: "offline",
      online: false,
      samples: 0,
      available: 0,
      meanCelsius: null,
    });
    expect(
      summarizeInput({
        ...empty,
        samples: [{ time: "2026-09-05T10:00Z", temperature: null }],
      }),
    ).toMatchObject({ samples: 1, available: 0, meanCelsius: null });
  });
  it("shows numeric rounding and timestamp normalization without inventing losslessness", async () => {
    const result = roundTrip(await sample());
    if (result.status !== "completed")
      throw new Error("Expected a completed path");
    expect(result.steps[0]).toMatchObject({
      output: {
        samples: [
          { temperature: 20.1 },
          { temperature: null },
          { temperature: 22.3 },
        ],
      },
    });
    expect(result.output).toMatchObject({
      samples: [
        { time: "2026-09-05T08:00:00.000Z", temperature: 68.2 },
        { temperature: null },
        { temperature: 72.1 },
      ],
    });
    expect(result.readingChanges).toEqual([
      { index: 0, temperatureChanged: true, timestampSpellingChanged: true },
      { index: 1, temperatureChanged: false, timestampSpellingChanged: true },
      { index: 2, temperatureChanged: false, timestampSpellingChanged: true },
    ]);
    expect(roundTrip(result.output)).toMatchObject({
      status: "completed",
      readingChanges: [],
    });
  });
  it("retains indexed field errors for invalid source data", () => {
    expect(() =>
      summarizeInput({
        device: "sensor",
        online: true,
        batteryPercent: 50,
        samples: [
          { time: "2026-09-05T10:00Z", temperature: 68 },
          { time: "2026-09-05T10:05Z" },
        ],
      }),
    ).toThrow(/samples:.*\[1\].*temperature/);
  });
  it("starts as an independent CLI and writes parseable JSON to stdout", () => {
    const output = execFileSync("pnpm", ["--silent", "sensor", "summary"], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const result: unknown = JSON.parse(output);
    expect(result).toMatchObject({
      device: "greenhouse-north",
      available: 2,
      meanCelsius: 21.2,
    });
  });
  it("requires a policy when two direct temperature paths produce different values", () => {
    expect(temperatureRoute(68.1)).toMatchObject({
      status: "ambiguous",
      complete: true,
    });
    expect(temperatureRoute(68.1, "fewest").status).toBe("ambiguous");
    expect(temperatureRoute(68.1, "reported")).toMatchObject({
      status: "selected",
      trace: { output: 20.1 },
    });
    const result = temperatureRoute(68.1, "unrounded");
    if (!("trace" in result) || result.trace.status !== "completed")
      throw new Error("Expected executed unrounded route");
    expect(result.trace.output).toBeCloseTo(20.05555556, 7);
    expect(() => temperatureRoute(300, "unrounded")).toThrow(/Fahrenheit/);
    expect(() => temperatureRoute(68.1, "toString")).toThrow(
      "Choose route policy",
    );
  });
  it("selects and traces a policy from actual CLI arguments", () => {
    const output = execFileSync(
      "pnpm",
      [
        "--silent",
        "sensor",
        "route",
        "--policy",
        "reported",
        "--value",
        "68.1",
      ],
      {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const result: unknown = JSON.parse(output);
    expect(result).toMatchObject({
      status: "selected",
      policy: "Use reported precision",
      trace: { initial: 68.1, output: 20.1 },
    });
  });
});
