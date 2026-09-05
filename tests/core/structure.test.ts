import { describe, expect, it } from "vitest";
import {
  text,
  dateValue,
  optional,
  record,
  recordCodec,
  codec,
  representation,
  graph,
  inspectGraph,
  dependents,
  presenceOf,
  type Representation,
} from "../../packages/represent/src/index.js";

describe("inspectable structural representations", () => {
  it("derives record fields and graph dependencies from executable definitions", () => {
    const identifier = text("Identifier", { nonempty: true });
    const note = optional(text("Note"));
    const request = record("Request", { id: identifier, note });
    expect(request.parse({ id: "x" })).toEqual({ id: "x" });
    expect(request.parse({ id: "x", note: undefined })).toHaveProperty("note");
    expect(request.parse({ id: " ", note: "" })).toEqual({ id: " ", note: "" });
    expect(() => request.parse({ id: "" })).toThrow("id");
    expect(() => request.parse({ id: "x", note: null })).toThrow("note");
    expect(() => request.parse({ id: "x", extra: true })).toThrow(
      "Unexpected field",
    );
    const route = codec({
      name: "Echo",
      from: request,
      to: request,
      encode: (value) => value,
      decode: (value) => value,
    });
    const model = graph([route.encode]);
    expect(
      model.nodes.find(({ name }) => name === "Request")?.structure,
    ).toEqual({
      kind: "record",
      refined: false,
      fields: [
        { key: "id", representation: "Identifier" },
        { key: "note", representation: "Note (optional)" },
      ],
    });
    const result = dependents(model, { kind: "representation", name: "Note" });
    expect(result.dependents.map(({ item }) => item.name)).toEqual([
      "Note (optional)",
      "Request",
      "Echo: encode",
    ]);
    expect(result.dependents[1]?.path.map(({ reason }) => reason.kind)).toEqual(
      ["wrapped-value", "record-field"],
    );
    expect(inspectGraph(structuredClone(model))).toEqual(inspectGraph(model));
  });
  it("keeps defaults and arbitrary parsers opaque rather than guessing missingness", () => {
    let calls = 0;
    const defaulted = representation({
      name: "Defaulted",
      parse: (value: unknown) => {
        calls++;
        if (value === undefined) return "fallback";
        if (typeof value !== "string") throw new Error("Expected text");
        return value;
      },
    });
    const value = record("Defaults", { value: defaulted });
    const model = graph([], { representations: [value] });
    expect(calls).toBe(0);
    expect(presenceOf(defaulted)).toBe("unknown");
    expect(
      presenceOf(model.nodes.find(({ name }) => name === "Defaulted") ?? {}),
    ).toBe("unknown");
    expect(value.parse({})).toEqual({ value: "fallback" });
  });
  it("marks record-codec source refinements separately from the target shape", () => {
    const date = dateValue("Date");
    const stamp = text("Timestamp");
    const exchange = codec({
      name: "Timestamp",
      from: date,
      to: stamp,
      encode: (value) => value.toISOString(),
      decode: (value) => new Date(value),
    });
    const schedule = recordCodec({
      name: "Schedule",
      from: "Schedule",
      to: "Schedule API",
      fields: { start: exchange, end: exchange },
      validate: ({ start, end }) => {
        if (end <= start) throw new Error("End must follow start");
      },
    });
    expect(schedule.encode.from.structure).toMatchObject({
      kind: "record",
      refined: true,
    });
    expect(schedule.encode.to.structure).toMatchObject({
      kind: "record",
      refined: false,
    });
    const invalid = {
      start: "2026-09-05T02:00:00Z",
      end: "2026-09-05T01:00:00Z",
    };
    expect(schedule.encode.to.parse(invalid)).toEqual(invalid);
    expect(() => schedule.decode.run(invalid)).toThrow("End must follow start");
    expect(() => date.parse(new Date("bad"))).toThrow("Invalid Date");
  });
  it("snapshots structural declarations, rejects conflicting child identities, and terminates cycles", () => {
    const field = text("Field");
    const fields = { value: field };
    const value = record("Record", fields);
    fields.value = text("Other");
    expect(value.structure).toMatchObject({
      fields: [{ key: "value", representation: field }],
    });
    const conflict = record("Conflict", {
      first: field,
      second: text("Field"),
    });
    const route = codec({
      name: "Conflict",
      from: conflict,
      to: conflict,
      encode: (value) => value,
      decode: (value) => value,
    });
    expect(() => graph([route.encode])).toThrow(
      "Duplicate representation name: Field",
    );
    const recursiveFields: Array<{
      key: string;
      representation: Representation<unknown>;
    }> = [];
    const recursive: Representation<unknown> = {
      name: "Recursive",
      parse: (value) => value,
      structure: { kind: "record", refined: false, fields: recursiveFields },
    };
    recursiveFields.push({ key: "next", representation: recursive });
    const echo = codec({
      name: "Recursive echo",
      from: recursive,
      to: recursive,
      encode: (value) => value,
      decode: (value) => value,
    });
    expect(graph([echo.encode]).nodes).toHaveLength(1);
  });
});
