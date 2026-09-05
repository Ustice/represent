import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import {
  record,
  text,
  optional,
  dateValue,
  representation,
  recordCodec,
  type Representation,
} from "../../packages/represent/src/index.js";
import {
  toJsonSchema,
  SchemaExportError,
} from "../../packages/json-schema/src/index.js";
import { registerRsvp } from "../../examples/member-desk/src/rsvps/model.js";

const ajv = () =>
  new Ajv2020({ allErrors: true, strict: true, ownProperties: true });
describe("JSON Schema adapter", () => {
  it("agrees with the actual RSVP input parser over representative JSON requests", () => {
    const validate = ajv().compile(toJsonSchema(registerRsvp.input));
    const cases = [
      [{ memberId: "m", eventId: "e" }, true],
      [{ memberId: " ", eventId: "😀" }, true],
      [{ memberId: "", eventId: "e" }, false],
      [{ memberId: "m" }, false],
      [{ memberId: "m", eventId: "e", extra: 1 }, false],
      [{ memberId: 1, eventId: "e" }, false],
      [{ memberId: null, eventId: "e" }, false],
      [null, false],
      [[], false],
      ["request", false],
    ] as const;
    for (const [input, accepted] of cases) {
      expect(validate(input), JSON.stringify(input)).toBe(accepted);
      if (accepted) expect(registerRsvp.input.parse(input)).toEqual(input);
      else expect(() => registerRsvp.input.parse(input)).toThrow();
    }
  });
  it("retains nested requiredness, optional missing fields, escaped names, and strict keys", () => {
    const value = record("Form/~ #雪", {
      account: record("Account", {
        id: text("Text/~ #雪", { nonempty: true }),
      }),
      note: optional(optional(text("Note"))),
    });
    const schema = toJsonSchema(value);
    const validate = ajv().compile(schema);
    expect(validate({ account: { id: "x" } })).toBe(true);
    expect(validate({ account: { id: "x" }, note: "" })).toBe(true);
    for (const input of [
      { account: {} },
      { account: { id: "" } },
      { account: { id: "x", extra: 0 } },
      { account: { id: "x" }, note: null },
      {},
    ]) {
      expect(validate(input)).toBe(false);
      expect(() => value.parse(input)).toThrow();
    }
    expect(
      ajv().compile(JSON.parse(JSON.stringify(schema)))({
        account: { id: "x" },
      }),
    ).toBe(true);
  });
  it("refuses unexpressible constraints without executing opaque parsers", () => {
    let calls = 0;
    const opaque = representation({
      name: "Default",
      parse: () => {
        calls++;
        return "default";
      },
    });
    const value = record("Unsupported", {
      time: dateValue("Date"),
      label: opaque,
    });
    try {
      toJsonSchema(value);
      throw new Error("Expected export failure");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaExportError);
      expect(error).toMatchObject({
        issues: [
          { path: ["label"], representation: "Default", reason: "opaque" },
          { path: ["time"], representation: "Date", reason: "date" },
        ],
      });
    }
    expect(calls).toBe(0);
    expect(() => toJsonSchema(optional(text("Text")))).toThrow("optional-root");
    const refined = recordCodec({
      name: "Rule",
      from: "Domain",
      to: "API",
      fields: { id: text("ID") },
      validate: ({ id }) => {
        if (id === "bad") throw new Error("Reserved");
      },
    });
    expect(() => toJsonSchema(refined.encode.from)).toThrow("refinement");
    expect(ajv().compile(toJsonSchema(refined.encode.to))({ id: "bad" })).toBe(
      true,
    );
    expect(() => refined.decode.run({ id: "bad" })).toThrow("Reserved");
  });
  it("supports recursive record declarations and rejects wrapper-only cycles", () => {
    const fields: Array<{
      key: string;
      representation: Representation<unknown>;
    }> = [];
    const node: Representation<unknown> = {
      name: "Node",
      parse: (value) => value,
      structure: { kind: "record", fields, refined: false },
    };
    fields.push({ key: "next", representation: optional(node) });
    const validate = ajv().compile(toJsonSchema(node));
    expect(validate({ next: { next: {} } })).toBe(true);
    expect(validate({ next: null })).toBe(false);
    const wrapper: Representation<unknown> = {
      name: "Loop",
      parse: (value) => value,
    };
    Object.assign(wrapper, { structure: { kind: "optional", inner: wrapper } });
    expect(() => toJsonSchema(record("Wrapped", { value: wrapper }))).toThrow(
      "optional-cycle",
    );
  });
});
