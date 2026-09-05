import { describe, expect, it } from "vitest";
import {
  conversion,
  representation,
  tracePath,
  ConversionError,
} from "../../packages/represent/src/index.js";

function isCounter(input: unknown): input is { count: number } {
  return (
    typeof input === "object" &&
    input !== null &&
    "count" in input &&
    typeof input.count === "number"
  );
}
const object = representation({
  name: "Counter",
  parse(input: unknown) {
    if (!isCounter(input)) throw new Error("Expected a counter");
    return input;
  },
});
const snapshot = (value: unknown): unknown => structuredClone(value);

describe("explicit conversion traces", () => {
  it("executes each step once and preserves intermediate snapshots even when a later mapping mutates its input", () => {
    const calls: number[] = [];
    const increment = conversion({
      name: "Increment",
      from: object,
      to: object,
      map(value) {
        calls.push(value.count);
        value.count++;
        return value;
      },
    });
    const result = tracePath(
      [increment, increment],
      { count: 0 },
      { snapshot },
    );
    expect(result).toMatchObject({
      status: "completed",
      initial: { count: 0 },
      steps: [{ output: { count: 1 } }, { output: { count: 2 } }],
      value: { count: 2 },
    });
    expect(calls).toEqual([0, 1]);
  });
  it("retains completed work and the actual stage failure without executing later steps", () => {
    let laterCalls = 0;
    const first = conversion({
      name: "First",
      from: object,
      to: object,
      map: ({ count }) => ({ count: count + 1 }),
    });
    const fail = conversion({
      name: "Fail",
      from: object,
      to: object,
      map() {
        throw new Error("Unavailable");
      },
    });
    const later = conversion({
      name: "Later",
      from: object,
      to: object,
      map(value) {
        laterCalls++;
        return value;
      },
    });
    const result = tracePath([first, fail, later], { count: 0 }, { snapshot });
    expect(result.status).toBe("failed");
    expect(result.steps).toMatchObject([
      { status: "completed", output: { count: 1 } },
      { status: "failed", error: { conversion: "Fail", stage: "map" } },
    ]);
    const failure = result.steps[1];
    if (failure?.status !== "failed") throw new Error("Expected a failed step");
    expect(failure.error).toBeInstanceOf(ConversionError);
    expect(laterCalls).toBe(0);
  });
  it("rejects disconnected paths before running any conversion or snapshot", () => {
    let calls = 0;
    const other = representation({ name: "Counter", parse: object.parse });
    const first = conversion({
      name: "First",
      from: object,
      to: object,
      map(value) {
        calls++;
        return value;
      },
    });
    const second = conversion({
      name: "Second",
      from: other,
      to: other,
      map: (value) => value,
    });
    const options = {
      snapshot(value: unknown) {
        calls++;
        return value;
      },
    };
    expect(() => tracePath([first, second], { count: 0 }, options)).toThrow(
      "same object",
    );
    expect(() => tracePath([], { count: 0 }, options)).toThrow("at least one");
    expect(calls).toBe(0);
  });
  it("does not misreport snapshot failure as a conversion failure", () => {
    const pass = conversion({
      name: "Pass",
      from: object,
      to: object,
      map: (value) => value,
    });
    let calls = 0;
    expect(() =>
      tracePath(
        [pass],
        { count: 0 },
        {
          snapshot(value: unknown) {
            if (calls++) throw new Error("Cannot snapshot this value");
            return value;
          },
        },
      ),
    ).toThrow("Cannot snapshot this value");
  });
});
