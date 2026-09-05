import { describe, expect, it } from "vitest";
import {
  asyncOperation,
  representation,
  OperationError,
} from "../../packages/represent/src/index.js";

const amount = representation({
  name: "Amount",
  parse(input: unknown) {
    if (typeof input !== "number" || !Number.isFinite(input) || input < 0)
      throw new Error("Expected a nonnegative amount");
    return input;
  },
});
describe("asynchronous operations", () => {
  it("validates input before work and waits for the result before output validation", async () => {
    let release: (value: number) => void = () => {
      throw new Error("Uninitialized request");
    };
    const request = new Promise<number>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    let outputChecks = 0;
    const output = representation({
      name: "Confirmed amount",
      parse(input: unknown) {
        outputChecks++;
        return amount.parse(input);
      },
    });
    const load = asyncOperation({
      name: "Load amount",
      input: amount,
      output,
      async perform(value, context: { offset: number }) {
        calls++;
        return value + (await request) + context.offset;
      },
    });
    await expect(load.run("3", { offset: 2 })).rejects.toMatchObject({
      stage: "input",
    });
    expect(calls).toBe(0);
    const pending = load.execute(3, { offset: 2 });
    expect(outputChecks).toBe(0);
    release(4);
    await expect(pending).resolves.toBe(9);
    expect(calls).toBe(1);
    expect(outputChecks).toBe(1);
  });
  it("validates resolved values and preserves asynchronous rejection causes", async () => {
    const subtract = asyncOperation({
      name: "Subtract",
      input: amount,
      output: amount,
      perform: (value) => Promise.resolve(value - 2),
    });
    await expect(subtract.execute(1, undefined)).rejects.toMatchObject({
      stage: "output",
    });
    const cause = new Error("Store unavailable");
    const unavailable = asyncOperation({
      name: "Load",
      input: amount,
      output: amount,
      perform: () => Promise.reject(cause),
    });
    await expect(unavailable.run(1, undefined)).rejects.toMatchObject({
      operation: "Load",
      stage: "perform",
      cause,
    });
    const immediate = asyncOperation({
      name: "Immediate",
      input: amount,
      output: amount,
      perform() {
        throw cause;
      },
    });
    const failure = immediate.run(1, undefined);
    await expect(failure).rejects.toBeInstanceOf(OperationError);
    await expect(failure).rejects.toMatchObject({
      stage: "perform",
      cause,
    });
  });
});
