import { describe, expect, it } from "vitest";
import {
  compareAcceptance,
  optional,
  record,
  representation,
  text,
} from "../../packages/represent/src/index.js";

const copy = (value: unknown): unknown => structuredClone(value);
describe("sampled directional acceptance", () => {
  it("retains counterexamples in each direction instead of declaring optional additions compatible", () => {
    const id = text("ID");
    const before = record("Request", { id });
    const after = record("Request", {
      id,
      note: optional(text("Note", { nonempty: true })),
    });
    const result = compareAcceptance({
      before,
      after,
      copy,
      samples: [
        { label: "Old request", value: { id: "a" } },
        { label: "New request", value: { id: "a", note: "hello" } },
        { label: "Invalid", value: { id: "a", note: "" } },
      ],
    });
    expect(result.beforeToAfter).toEqual({
      status: "no-counterexamples",
      tested: 1,
      witnesses: [],
    });
    expect(result.afterToBefore).toEqual({
      status: "counterexamples",
      tested: 2,
      witnesses: [1],
    });
    expect(result.samples[1]).toMatchObject({
      before: { status: "rejected" },
      after: { status: "accepted", value: { id: "a", note: "hello" } },
    });
  });
  it("reports unexercised directions when no supplied sample passes the source parser", () => {
    const before = text("Before");
    const after = text("After");
    for (const samples of [[], [{ label: "Wrong kind", value: 1 }]]) {
      const result = compareAcceptance({ before, after, samples, copy });
      expect(result.beforeToAfter.status).toBe("unexercised");
      expect(result.afterToBefore.status).toBe("unexercised");
    }
  });
  it("isolates mutable parser inputs and preserves normalized outputs without promising value equivalence", () => {
    const before = representation({
      name: "Mutating",
      parse(input: unknown) {
        if (!Array.isArray(input)) throw new Error("Expected array");
        const values: unknown[] = input;
        values.push("added");
        return values;
      },
    });
    const after = representation({
      name: "Empty",
      parse(input: unknown) {
        if (!Array.isArray(input) || input.length)
          throw new Error("Expected empty array");
        const values: unknown[] = input;
        return values;
      },
    });
    const value: unknown[] = [];
    const result = compareAcceptance({
      before,
      after,
      copy,
      samples: [{ label: "Array", value }],
    });
    expect(value).toEqual([]);
    expect(result.samples[0]).toMatchObject({
      input: [],
      before: { status: "accepted", value: ["added"] },
      after: { status: "accepted", value: [] },
    });
    expect(result.beforeToAfter.status).toBe("no-counterexamples");
  });
  it("keeps actual parser errors and propagates copying failures rather than inventing rejections", () => {
    const failure = new Error("Parser failed");
    const before = representation({
      name: "Before",
      parse() {
        throw failure;
      },
    });
    const after = text("After");
    const samples = [{ label: "Sample", value: "ok" }];
    const result = compareAcceptance({ before, after, samples, copy });
    const rejected = result.samples[0]?.before;
    if (rejected?.status !== "rejected") throw new Error("Expected rejection");
    expect(rejected.error).toBe(failure);
    const copyFailure = new Error("Cannot copy");
    expect(() =>
      compareAcceptance({
        before,
        after,
        samples,
        copy() {
          throw copyFailure;
        },
      }),
    ).toThrow(copyFailure);
    const output = { normalized: true };
    const normalizing = representation({
      name: "Normalizing",
      parse: () => output,
    });
    expect(() =>
      compareAcceptance({
        before: normalizing,
        after,
        samples,
        copy(value) {
          if (value === output) throw copyFailure;
          return structuredClone(value);
        },
      }),
    ).toThrow(copyFailure);
  });
});
