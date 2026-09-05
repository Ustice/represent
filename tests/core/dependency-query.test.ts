import { describe, expect, it } from "vitest";
import {
  dependents,
  codec,
  graph,
  optionalCodec,
  recordCodec,
  representation,
  type Graph,
  type GraphItem,
} from "../../packages/represent/src/index.js";

const item = (kind: GraphItem["kind"], name: string) => ({ kind, name });
const model: Graph = {
  nodes: ["A", "B", "C", "Result", "Isolated"].map((name) => ({ name })),
  edges: [
    { name: "First", from: "A", to: "B" },
    { name: "Second", from: "B", to: "C" },
    { name: "Route", from: "A", to: "C" },
  ],
  dependencies: [
    { parent: "Route", conversion: "First", field: null },
    { parent: "Route", conversion: "Second", field: null },
  ],
  references: [
    { name: "Link", from: "B", field: "ownerId", to: "A", key: "id" },
  ],
  operations: [
    {
      name: "Prepare",
      input: "C",
      output: "Result",
      reads: ["A"],
      references: ["Link"],
    },
    {
      name: "Consume result",
      input: "Result",
      output: "Result",
      reads: [],
      references: [],
    },
  ],
};

describe("declared definition dependency queries", () => {
  it("traces input/output contracts and reads, without inventing downstream schema changes", () => {
    const result = dependents(model, item("representation", "A"));
    expect(result.dependents.map(({ item }) => item)).toEqual([
      item("conversion", "First"),
      item("conversion", "Route"),
      item("operation", "Prepare"),
      item("reference", "Link"),
    ]);
    const prepare = result.dependents.find(
      ({ item }) => item.kind === "operation" && item.name === "Prepare",
    );
    expect(prepare?.path).toEqual([
      {
        dependency: item("representation", "A"),
        dependent: item("operation", "Prepare"),
        reason: { kind: "read" },
      },
    ]);
    expect(prepare?.via).toEqual([
      {
        dependency: item("representation", "A"),
        dependent: item("operation", "Prepare"),
        reason: { kind: "read" },
      },
      {
        dependency: item("reference", "Link"),
        dependent: item("operation", "Prepare"),
        reason: { kind: "reference-use" },
      },
    ]);
    expect(
      dependents(model, item("conversion", "First")).dependents.map(
        ({ item }) => item,
      ),
    ).toEqual([item("conversion", "Route")]);
    const output = dependents(model, item("representation", "Result"));
    expect(output.dependents.map(({ item }) => item)).toEqual([
      item("operation", "Consume result"),
      item("operation", "Prepare"),
    ]);
    expect(
      output.dependents.find(
        ({ item }) => item.kind === "operation" && item.name === "Prepare",
      )?.path[0]?.reason,
    ).toEqual({ kind: "output" });
  });

  it("retains parallel input/output/read reasons and both reference endpoints", () => {
    const repeated: Graph = {
      ...model,
      operations: [
        {
          name: "Many roles",
          input: "A",
          output: "A",
          reads: ["A", "A"],
          references: ["Link", "Link"],
        },
      ],
    };
    const result = dependents(repeated, item("representation", "A"));
    expect(
      result.dependents
        .find(
          ({ item }) => item.kind === "operation" && item.name === "Many roles",
        )
        ?.via.map(({ reason }) => reason.kind),
    ).toEqual(["input", "output", "read", "reference-use"]);
    expect(
      result.dependents.find(({ item }) => item.kind === "reference")?.path[0]
        ?.reason,
    ).toEqual({ kind: "reference-target", field: "id" });
    expect(
      dependents(model, item("representation", "B")).dependents.find(
        ({ item }) => item.kind === "reference",
      )?.path[0]?.reason,
    ).toEqual({ kind: "reference-source", field: "ownerId" });
    expect(
      dependents(model, item("reference", "Link")).dependents.map(
        ({ item }) => item,
      ),
    ).toEqual([item("operation", "Prepare")]);
  });

  it("keeps every shared field binding, including one reached through a longer optional path", () => {
    const source = representation({
      name: "Number",
      parse: (input: unknown) => {
        if (typeof input !== "number") throw new Error("Number required");
        return input;
      },
    });
    const target = representation({
      name: "Text",
      parse: (input: unknown) => {
        if (typeof input !== "string") throw new Error("Text required");
        return input;
      },
    });
    const field = codec({
      name: "Format",
      from: source,
      to: target,
      encode: String,
      decode: Number,
    });
    const optional = optionalCodec(field);
    const record = recordCodec({
      name: "Record",
      from: "Record",
      to: "Record JSON",
      fields: { first: field, second: field, maybe: optional },
    });
    const result = dependents(
      graph([record.encode, record.decode]),
      item("conversion", field.encode.name),
    );
    const parent = result.dependents.find(
      ({ item }) =>
        item.kind === "conversion" && item.name === record.encode.name,
    );
    expect(parent?.path).toHaveLength(1);
    expect(parent?.via.map(({ reason }) => reason)).toEqual([
      { kind: "field", field: "first" },
      { kind: "field", field: "second" },
      { kind: "field", field: "maybe" },
    ]);
    expect(
      result.dependents.some(
        ({ item }) =>
          item.kind === "conversion" && item.name === record.decode.name,
      ),
    ).toBe(false);
    expect(
      result.dependents.some(({ item }) => item.kind === "representation"),
    ).toBe(false);
  });

  it("keeps same-name definitions of different kinds distinct", () => {
    const same: Graph = {
      nodes: [{ name: "Same" }],
      edges: [{ name: "Same", from: "Same", to: "Same" }],
      dependencies: [],
      references: [
        { name: "Same", from: "Same", field: "id", to: "Same", key: "id" },
      ],
      operations: [
        {
          name: "Same",
          input: "Same",
          output: "Same",
          reads: [],
          references: ["Same"],
        },
      ],
    };
    expect(
      dependents(same, item("representation", "Same")).dependents.map(
        ({ item }) => item.kind,
      ),
    ).toEqual(["conversion", "operation", "reference"]);
    expect(
      dependents(same, item("reference", "Same")).dependents.map(
        ({ item }) => item.kind,
      ),
    ).toEqual(["operation"]);
    expect(dependents(same, item("conversion", "Same")).dependents).toEqual([]);
    expect(dependents(same, item("operation", "Same")).dependents).toEqual([]);
  });

  it("terminates cycles, omits the source, and preserves one shortest path per dependent", () => {
    const cyclic: Graph = {
      ...model,
      dependencies: [
        { parent: "First", conversion: "First", field: "self" },
        { parent: "Second", conversion: "First", field: null },
        { parent: "Route", conversion: "Second", field: null },
        { parent: "First", conversion: "Route", field: null },
        { parent: "Second", conversion: "Route", field: "feedback" },
        { parent: "Second", conversion: "Second", field: "self" },
      ],
    };
    const result = dependents(cyclic, item("conversion", "First"));
    expect(
      result.dependents.map(({ item, path }) => ({
        name: item.name,
        steps: path.length,
      })),
    ).toEqual([
      { name: "Second", steps: 1 },
      { name: "Route", steps: 2 },
    ]);
    expect(result.dependents[0]?.via).toHaveLength(3);
  });

  it("chooses the same shortest paths and reasons regardless of registration order", () => {
    const reordered: Graph = {
      nodes: [...model.nodes].reverse(),
      edges: [...model.edges].reverse(),
      dependencies: [...model.dependencies].reverse(),
      references: [...model.references].reverse(),
      operations: [...model.operations].reverse().map((op) => ({
        ...op,
        reads: [...op.reads].reverse(),
        references: [...op.references].reverse(),
      })),
    };
    const before = JSON.stringify(model);
    expect(dependents(reordered, item("representation", "B"))).toEqual(
      dependents(model, item("representation", "B")),
    );
    expect(JSON.stringify(model)).toBe(before);
  });

  it("distinguishes isolated definitions from unknown selections and rejects dangling graph links", () => {
    expect(dependents(model, item("representation", "Isolated"))).toEqual({
      source: item("representation", "Isolated"),
      dependents: [],
    });
    expect(() => dependents(model, item("representation", "Missing"))).toThrow(
      "Unknown graph item: representation Missing",
    );
    expect(() =>
      dependents(
        {
          ...model,
          edges: [
            ...model.edges,
            { name: "Dangling", from: "Missing", to: "B" },
          ],
        },
        item("representation", "A"),
      ),
    ).toThrow("Unknown graph item: representation Missing");
    expect(() =>
      dependents(
        {
          ...model,
          dependencies: [
            { conversion: "Missing", parent: "Route", field: null },
          ],
        },
        item("representation", "A"),
      ),
    ).toThrow("Unknown graph item: conversion Missing");
    expect(() =>
      dependents(
        { ...model, nodes: [...model.nodes, { name: "A" }] },
        item("representation", "A"),
      ),
    ).toThrow("Duplicate graph item: representation A");
  });
});
