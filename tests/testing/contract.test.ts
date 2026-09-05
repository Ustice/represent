import { describe, expect, it } from "vitest";
import { checkContract } from "../../packages/testing/src/index.js";
import { representation, text } from "../../packages/represent/src/index.js";

const copy = (input: unknown): unknown => structuredClone(input);
const subject = text("Nonempty", { nonempty: true });
const valid = { label: "Valid", value: "x" };
const invalid = { label: "Empty", value: "" };
const samples = [valid, invalid, { label: "Wrong kind", value: 1 }];
describe("contract acceptance checks", () => {
  it("retains a counterexample to an overly permissive contract and rejects one-sided evidence", () => {
    const options = { representation: subject, samples, copy };
    expect(
      checkContract({
        ...options,
        accepts: (value) => typeof value === "string" && value.length > 0,
      }),
    ).toMatchObject({ status: "pass", evidence: { accepted: 1, rejected: 2 } });
    expect(checkContract({ ...options, accepts: () => true })).toMatchObject({
      status: "fail",
      evidence: {
        mismatches: [
          { label: "Empty", parserAccepted: false, contractAccepted: true },
          {
            label: "Wrong kind",
            parserAccepted: false,
            contractAccepted: true,
          },
        ],
      },
    });
    for (const values of [[], [valid], [invalid]])
      expect(
        checkContract({
          ...options,
          samples: values,
          accepts: (value) => typeof value === "string" && value.length > 0,
        }).status,
      ).toBe("gap");
  });
  it("isolates parser mutation and preserves validator and copy failures as harness problems", () => {
    const mutating = representation({
      name: "Mutating",
      parse(input: unknown) {
        if (!Array.isArray(input) || input.length)
          throw new Error("Expected empty array");
        input.push("mutated");
        return true;
      },
    });
    const values = [
      { label: "Empty", value: [] },
      { label: "Nonempty", value: ["x"] },
    ];
    expect(
      checkContract({
        representation: mutating,
        samples: values,
        copy,
        accepts: (input) => Array.isArray(input) && input.length === 0,
      }).status,
    ).toBe("pass");
    expect(values[0]?.value).toEqual([]);
    const failure = new Error("Validator crashed");
    expect(() =>
      checkContract({
        representation: subject,
        samples,
        copy,
        accepts: () => {
          throw failure;
        },
      }),
    ).toThrow(failure);
    expect(() =>
      checkContract({
        representation: subject,
        samples,
        copy: () => {
          throw failure;
        },
        accepts: () => true,
      }),
    ).toThrow(failure);
  });
});
