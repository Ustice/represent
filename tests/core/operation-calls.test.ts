import { describe, expect, it } from "vitest";
import {
  conversion,
  dependents,
  graph,
  inspectGraph,
  operation,
  representation,
  requirements,
} from "../../packages/represent/src/index.js";
import type { OperationDescriptor } from "../../packages/represent/src/operations.js";
const amount = representation({
  name: "Amount",
  parse(input: unknown) {
    if (typeof input !== "number") throw new Error("Number required");
    return input;
  },
});
const text = representation({
  name: "Text",
  parse(input: unknown) {
    if (typeof input !== "string") throw new Error("Text required");
    return input;
  },
});

describe("declared operation calls", () => {
  it("discovers called definitions without executing them, including cross-kind names", () => {
    let executions = 0;
    const encode = conversion({
      name: "Prepare",
      from: amount,
      to: text,
      map(value) {
        executions++;
        return String(value);
      },
    });
    const annotatedEncoder = { ...encode, input: amount };
    const child = operation({
      name: "Prepare",
      input: amount,
      output: text,
      calls: [annotatedEncoder],
      perform(value) {
        return encode.convert(value);
      },
    });
    const parent = operation({
      name: "Export",
      input: amount,
      output: text,
      calls: [child],
      perform(value) {
        return child.execute(value, undefined);
      },
    });
    const model = graph([], { operations: [parent, child] });
    expect(executions).toBe(0);
    const result = dependents(model, { kind: "conversion", name: encode.name });
    expect(
      result.dependents.map(({ item, path }) => ({ item, steps: path.length })),
    ).toEqual([
      { item: { kind: "operation", name: "Prepare" }, steps: 1 },
      { item: { kind: "operation", name: "Export" }, steps: 2 },
    ]);
    expect(result.dependents[1]?.path.map(({ reason }) => reason)).toEqual([
      { kind: "call" },
      { kind: "call" },
    ]);
    expect(parent.execute(12, undefined)).toBe("12");
    expect(executions).toBe(1);
    expect(
      requirements(model, {
        kind: "operation",
        name: "Export",
      }).requirements.map(({ item }) => item),
    ).toContainEqual({ kind: "conversion", name: "Prepare" });
    expect(inspectGraph(structuredClone(model))).toEqual(inspectGraph(model));
  });
  it("traverses declaration cycles once, keeps alternate reasons, and rejects conflicting identities", () => {
    const calls: OperationDescriptor[] = [];
    const first: OperationDescriptor = {
      kind: "operation",
      name: "First",
      input: amount,
      output: amount,
      reads: [],
      references: [],
      calls,
    };
    const second: OperationDescriptor = {
      ...first,
      name: "Second",
      calls: [first],
    };
    calls.push(second, second);
    const model = graph([], { operations: [first] });
    expect(model.operations).toHaveLength(2);
    expect(model.operations[0]?.calls).toEqual([
      { kind: "operation", name: "Second" },
    ]);
    const result = requirements(model, { kind: "operation", name: "First" });
    expect(result.requirements.map(({ item }) => item)).toEqual([
      { kind: "operation", name: "Second" },
      { kind: "representation", name: "Amount" },
    ]);
    expect(
      result.requirements.find(({ item }) => item.name === "Amount")?.via,
    ).toHaveLength(4);
    expect(() => graph([], { operations: [first, { ...second }] })).toThrow(
      "Duplicate operation name: Second",
    );
    const conflict = conversion({
      name: "Duplicate",
      from: amount,
      to: text,
      map: String,
    });
    const caller = operation({
      name: "Caller",
      input: amount,
      output: text,
      calls: [conflict, { ...conflict }],
      perform: String,
    });
    expect(() => graph([], { operations: [caller] })).toThrow(
      "Duplicate conversion name: Duplicate",
    );
  });
  it("snapshots the declared call list and validates dangling serialized calls", () => {
    const callee = conversion({
      name: "Format",
      from: amount,
      to: text,
      map: String,
    });
    const calls = [callee];
    const caller = operation({
      name: "Show",
      input: amount,
      output: text,
      calls,
      perform: String,
    });
    calls.length = 0;
    const model = graph([], { operations: [caller] });
    expect(model.edges).toEqual([
      { name: "Format", from: "Amount", to: "Text" },
    ]);
    expect(() => inspectGraph({ ...model, edges: [] })).toThrow(
      "Unknown graph item: conversion Format",
    );
  });
});
