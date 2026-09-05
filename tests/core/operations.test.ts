import { describe, expect, it } from "vitest";
import {
  operation,
  OperationError,
  representation,
} from "../../packages/represent/src/index.js";
const amount = representation({
  name: "Amount",
  parse(input: unknown) {
    if (typeof input !== "number" || !Number.isFinite(input) || input < 0)
      throw new Error("Expected nonnegative amount");
    return input;
  },
});
describe("contextual operations", () => {
  it("uses explicit context and validates input before performing work", () => {
    let performed = false;
    const add = operation({
      name: "Add",
      input: amount,
      output: amount,
      perform(value, context: { increment: number }) {
        performed = true;
        return value + context.increment;
      },
    });
    expect(() => add.run("12", { increment: 3 })).toThrow(/Add: input/);
    expect(performed).toBe(false);
    expect(add.execute(12, { increment: 3 })).toBe(15);
    expect(add.execute(12, { increment: 8 })).toBe(20);
  });
  it("rejects invalid output even when its TypeScript type is correct", () => {
    const bad = operation({
      name: "Subtract",
      input: amount,
      output: amount,
      perform: (value, context: { deduction: number }) =>
        value - context.deduction,
    });
    expect(() => bad.execute(1, { deduction: 2 })).toThrow(/Subtract: output/);
  });
  it("keeps a domain failure as the cause of a contextual operation error", () => {
    const cause = new Error("Closed");
    const fail = operation({
      name: "Reserve",
      input: amount,
      output: amount,
      perform: () => {
        throw cause;
      },
    });
    try {
      fail.run(12, undefined);
      throw new Error("Expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect(error).toMatchObject({
        operation: "Reserve",
        stage: "perform",
        cause,
      });
    }
  });
});
