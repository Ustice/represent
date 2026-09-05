import { describe, it, expect } from "vitest";
import {
  graph,
  record,
  text,
  optional,
  representation,
  compareSchemas,
  dependents,
  operation,
} from "../../packages/represent/src/index.js";

describe("schema comparison", () => {
  it("reports field and constraint edits and explains dependencies in both snapshots", () => {
    function model(nonempty: boolean, withNote: boolean) {
      const id = text("ID", { nonempty });
      const request = record(
        "Request",
        withNote ? { id, note: optional(text("Note")) } : { id },
      );
      const command = operation({
        name: "Save",
        input: request,
        output: id,
        perform: (value) => value.id,
      });
      return graph([], { operations: [command] });
    }
    const before = model(false, false),
      after = model(true, true);
    const result = compareSchemas(before, after);
    expect(
      result.changes.map(({ representation, kind }) => [representation, kind]),
    ).toEqual([
      ["ID", "changed"],
      ["Note", "added"],
      ["Note (optional)", "added"],
      ["Request", "changed"],
    ]);
    expect(
      result.changes.find((change) => change.representation === "Request")
        ?.fields,
    ).toEqual([{ key: "note", before: null, after: "Note (optional)" }]);
    expect(result.changes[0]).toMatchObject({
      before: { kind: "text", nonempty: false },
      after: { kind: "text", nonempty: true },
    });
    for (const model of [before, after])
      expect(
        dependents(model, {
          kind: "representation",
          name: "ID",
        })
          .dependents.map(({ item }) => item.name)
          .sort(),
      ).toEqual(["Request", "Save"]);
    expect(
      compareSchemas(after, before).changes.find(
        (change) => change.representation === "Note",
      )?.kind,
    ).toBe("removed");
  });
  it("ignores declaration ordering without claiming unchanged opaque parsers are equivalent", () => {
    const first = record("Record", {
      a: text("A"),
      b: representation({ name: "Opaque", parse: () => "before" }),
    });
    const second = record("Record", {
      b: representation({ name: "Opaque", parse: () => "after" }),
      a: text("A"),
    });
    const before = graph([], { representations: [first] }),
      after = graph([], { representations: [second] });
    const snapshot = structuredClone(before);
    expect(compareSchemas(before, after)).toEqual({
      changes: [],
      unverified: [{ representation: "Opaque", reasons: ["opaque"] }],
    });
    expect(before).toEqual(snapshot);
    const added = compareSchemas(graph([]), before);
    expect(
      added.changes.find((change) => change.representation === "Opaque")?.kind,
    ).toBe("added");
  });
  it("distinguishes wrapper changes and lost structure, rejects malformed graphs, and handles recursive schemas", () => {
    const before = graph([], {
      representations: [record("Record", { value: optional(text("Text")) })],
    });
    const after = graph([], {
      representations: [record("Record", { value: text("Text") })],
    });
    expect(
      compareSchemas(before, after).changes.find(
        (change) => change.representation === "Record",
      )?.fields,
    ).toEqual([{ key: "value", before: "Text (optional)", after: "Text" }]);
    const opaque = graph([], {
      representations: [
        representation({ name: "Record", parse: (value) => value }),
      ],
    });
    expect(
      compareSchemas(after, opaque).changes.find(
        (change) => change.representation === "Record",
      ),
    ).toMatchObject({ kind: "changed", after: null });
    expect(() =>
      compareSchemas(
        { ...before, nodes: [...before.nodes, ...before.nodes] },
        after,
      ),
    ).toThrow("Duplicate");
    const recursive = {
      nodes: [
        {
          name: "Loop",
          structure: {
            kind: "record",
            refined: true,
            fields: [{ key: "next", representation: "Loop" }],
          },
        },
      ],
      edges: [],
      dependencies: [],
      operations: [],
      references: [],
    } as const;
    const unknownLoop = graph([], {
      representations: [
        representation({ name: "Loop", parse: (value) => value }),
      ],
    });
    expect(compareSchemas(unknownLoop, recursive).unverified).toEqual([
      { representation: "Loop", reasons: ["opaque", "refinement"] },
    ]);
    expect(compareSchemas(recursive, structuredClone(recursive))).toEqual({
      changes: [],
      unverified: [{ representation: "Loop", reasons: ["refinement"] }],
    });
  });
});
