import {
  conversion,
  representation,
} from "../../packages/represent/src/index.js";
import { describe, expect, it } from "vitest";
import {
  experiments,
  runExperiment,
} from "../../examples/member-desk/src/playground.js";
import { jsonChanges } from "../../examples/member-desk/src/json-diff.js";

describe("conversion playground evidence", () => {
  it("compares captured values even if a conversion mutates the supplied JSON", () => {
    const numbers = representation({
      name: "Numbers",
      parse(input: unknown) {
        if (
          !Array.isArray(input) ||
          !input.every((value) => typeof value === "number")
        )
          throw new Error("Expected numbers");
        return input;
      },
    });
    const append = conversion({
      name: "Append",
      from: numbers,
      to: numbers,
      map(value) {
        value.push(2);
        return value;
      },
    });
    const result = runExperiment(
      {
        label: "Mutation",
        description: "Mutation probe",
        sample: [1],
        path: [append],
        comparison: {
          name: "Same length",
          equivalent: (a, b) =>
            numbers.parse(a).length === numbers.parse(b).length,
        },
      },
      "[1]",
    );
    if (result.status !== "completed")
      throw new Error("Expected a completed path");
    expect(result.changes).toEqual([{ path: [1], kind: "added", after: 2 }]);
    expect(result.comparison).toMatchObject({ equivalent: false });
  });

  it("distinguishes wire changes from domain equivalence and exposes the decoded Date boundary", () => {
    const result = runExperiment(
      experiments.event,
      JSON.stringify(experiments.event.sample),
    );
    expect(result.status).toBe("completed");
    if (result.status !== "completed")
      throw new Error("Expected a completed path");
    expect(result.comparison).toMatchObject({ equivalent: true });
    expect(result.changes.map((change) => change.path)).toEqual([
      ["endsAt"],
      ["startsAt"],
      ["title"],
    ]);
    expect(result.steps[0]).toMatchObject({
      output: {
        title: "Weekend gathering",
        startsAt: new Date("2026-09-12T08:00Z"),
      },
    });
    expect(result.value).toMatchObject({
      startsAt: "2026-09-12T08:00:00.000Z",
    });
  });
  it("reports the actual domain failure and does not fabricate later outputs", () => {
    const result = runExperiment(
      experiments.event,
      JSON.stringify({
        ...experiments.event.sample,
        endsAt: "2026-09-12T09:00+02:00",
      }),
    );
    expect(result).toMatchObject({
      status: "failed",
      steps: [{ status: "failed", conversion: "Event exchange: decode" }],
    });
    if (result.status !== "failed") throw new Error("Expected failure");
    expect(result.steps).toHaveLength(1);
    expect(runExperiment(experiments.event, "{")).toMatchObject({
      status: "invalid-json",
    });
  });
  it("exposes a projection's missing fields without declaring a round trip", () => {
    const result = runExperiment(
      experiments.profile,
      JSON.stringify(experiments.profile.sample),
    );
    if (result.status !== "completed")
      throw new Error("Expected a completed path");
    expect(result.changes).toEqual([
      { path: ["email"], kind: "removed", before: "maya@example.test" },
      { path: ["status"], kind: "removed", before: "Active" },
    ]);
    expect(result.comparison).toBeNull();
    expect(result.steps.map((step) => step.conversion)).toEqual([
      "Member exchange: decode",
      "Member exchange: encode",
      "Publish profile",
    ]);
  });
  it("ignores object property order while retaining array order, null, missing, and prototype-named keys", () => {
    expect(
      jsonChanges({ b: { x: 1, y: 2 }, a: 0 }, { a: 0, b: { y: 2, x: 1 } }),
    ).toEqual([]);
    expect(jsonChanges({ a: null, list: [1, 2] }, { list: [2, 1] })).toEqual([
      { path: ["a"], kind: "removed", before: null },
      { path: ["list", 0], kind: "changed", before: 1, after: 2 },
      { path: ["list", 1], kind: "changed", before: 2, after: 1 },
    ]);
    expect(
      jsonChanges({}, { constructor: null, ["__proto__"]: "value" }),
    ).toEqual([
      { path: ["__proto__"], kind: "added", after: "value" },
      { path: ["constructor"], kind: "added", after: null },
    ]);
  });
});
