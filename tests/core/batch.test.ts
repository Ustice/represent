import { describe, expect, it } from "vitest";
import {
  operation,
  OperationError,
  representation,
  runBatch,
} from "../../packages/represent/src/index.js";

const amount = representation({
  name: "Amount",
  parse(input) {
    if (typeof input !== "number" || input < 0)
      throw new Error("Expected a nonnegative amount");
    return input;
  },
});
const reserve = operation({
  name: "Reserve",
  input: amount,
  output: amount,
  perform(value, context: { remaining: number }) {
    if (value > context.remaining) throw new Error("Insufficient capacity");
    return value;
  },
});
const advance = (context: { remaining: number }, value: number) => ({
  remaining: context.remaining - value,
});

describe("ordered operation batches", () => {
  it("collects indexed failures and carries only accepted results into later rows", () => {
    const initial = { remaining: 10 };
    const result = runBatch(reserve, [4, "bad", 8, 6], {
      context: initial,
      advance,
    });
    expect(result.rows).toMatchObject([
      { index: 0, status: "accepted", value: 4 },
      {
        index: 1,
        status: "rejected",
        error: { operation: "Reserve", stage: "input" },
      },
      {
        index: 2,
        status: "rejected",
        error: { operation: "Reserve", stage: "perform" },
      },
      { index: 3, status: "accepted", value: 6 },
    ]);
    expect(result.context).toEqual({ remaining: 0 });
    expect(initial).toEqual({ remaining: 10 });
    const rejected = result.rows[2];
    if (rejected?.status !== "rejected") throw new Error("Expected rejection");
    expect(rejected.error.cause).toEqual(new Error("Insufficient capacity"));
  });

  it("does not advance on invalid output and continues with the existing context", () => {
    const broken = operation({
      name: "Broken result",
      input: amount,
      output: amount,
      perform: (value, context: { remaining: number }) =>
        value === 2 ? -1 : context.remaining,
    });
    const result = runBatch(broken, [2, 3], {
      context: { remaining: 5 },
      advance,
    });
    expect(result.rows).toMatchObject([
      { index: 0, status: "rejected", error: { stage: "output" } },
      { index: 1, status: "accepted", value: 5 },
    ]);
    expect(result.context.remaining).toBe(0);
  });

  it("propagates transition failures rather than misreporting a rejected input row", () => {
    const failure = new OperationError(
      "Update context",
      "perform",
      new Error("Bad transition"),
    );
    expect(() =>
      runBatch(reserve, [1, 2], {
        context: { remaining: 10 },
        advance: () => {
          throw failure;
        },
      }),
    ).toThrow(failure);
  });

  it("does not swallow unexpected runner errors or invoke transitions for empty input", () => {
    const failure = new Error("Runner unavailable");
    const unavailable: typeof reserve = {
      ...reserve,
      run: () => {
        throw failure;
      },
    };
    expect(() =>
      runBatch(unavailable, [1], { context: { remaining: 10 }, advance }),
    ).toThrow(failure);
    const context = { remaining: 10 };
    expect(
      runBatch(reserve, [], {
        context,
        advance: () => {
          throw new Error("No transition expected");
        },
      }),
    ).toEqual({ rows: [], context });
  });
});
