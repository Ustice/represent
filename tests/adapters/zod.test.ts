import { describe, it, expect } from "vitest";
import { z } from "zod";
import { Ajv2020 } from "ajv/dist/2020.js";
import { fromZod, zodJsonSchema } from "../../packages/zod/src/index.js";
import { toJsonSchema } from "../../packages/json-schema/src/index.js";
import {
  record,
  optional,
  representation,
  text,
} from "../../packages/represent/src/index.js";
import { eventExchange } from "../../examples/member-desk/src/events/model.js";

const exportSchema = (value: Parameters<typeof toJsonSchema>[0]) =>
  toJsonSchema(value, { providers: [zodJsonSchema] });
const ajv = () =>
  new Ajv2020({ strict: true, allErrors: true, ownProperties: true });
describe("Zod leaf interoperability", () => {
  it("matches string choices and Zod timestamps without imposing a different format language", () => {
    const timestamp = z.iso.datetime({ offset: true });
    const value = record("Input", {
      role: fromZod("Role", z.enum(["Member", "Organizer"])),
      when: fromZod("Timestamp", timestamp),
      email: optional(fromZod("Email", z.email())),
    });
    const validate = ajv().compile(exportSchema(value));
    for (const when of [
      "2026-09-05T12:00Z",
      "2026-09-05T12:00:30.1234+05:30",
      "2024-02-29T00:00:00Z",
      "2026-02-29T00:00:00Z",
      "2026-09-05T25:00:00Z",
      "2026-09-05T12:00:00",
      "garbage",
    ]) {
      const input = { role: "Member", when };
      expect(validate(input), when).toBe(timestamp.safeParse(when).success);
    }
    expect(
      validate({
        role: "Member",
        when: "2026-09-05T12:00Z",
        email: "maya@example.test",
      }),
    ).toBe(true);
    expect(validate({ role: "Owner", when: "2026-09-05T12:00Z" })).toBe(false);
    expect(
      validate({ role: "Member", when: "2026-09-05T12:00Z", email: "bad" }),
    ).toBe(false);
    expect(
      validate({ role: "Member", when: "2026-09-05T12:00Z", email: null }),
    ).toBe(false);
  });
  it("refuses normalization, custom checks, Unicode length mismatches, coercion, and metadata overrides", () => {
    let calls = 0;
    const cases: z.ZodType[] = [
      z.string().trim().min(1),
      z.string().refine(() => {
        calls++;
        return true;
      }),
      z.string().min(2),
      z.coerce.string(),
      z.object({ value: z.string() }),
      z.email({ pattern: /^.$/ }),
    ];
    for (const schema of cases)
      expect(() => exportSchema(fromZod("Unsupported", schema))).toThrow();
    expect(calls).toBe(0);
    const annotated = fromZod("Annotated", z.string().meta({ type: "number" }));
    const validate = ajv().compile(exportSchema(annotated));
    expect(validate("text")).toBe(true);
    expect(validate(42)).toBe(false);
    expect(() => toJsonSchema(annotated)).toThrow("opaque");
  });
  it("retains real Event decoding while distinguishing the wire contract from domain validation", () => {
    const validate = ajv().compile(exportSchema(eventExchange.encode.to));
    const input = {
      id: "e",
      title: " Gathering ",
      startsAt: "2026-09-12T10:00Z",
      endsAt: "2026-09-12T12:00Z",
    };
    expect(validate(input)).toBe(true);
    expect(eventExchange.decode.run(input).title).toBe("Gathering");
    const reversed = { ...input, endsAt: "2026-09-12T09:00Z" };
    expect(validate(reversed)).toBe(true);
    expect(() => eventExchange.decode.run(reversed)).toThrow(
      "End must be after start",
    );
    const blank = { ...input, title: "   " };
    expect(validate(blank)).toBe(true);
    expect(() => eventExchange.decode.run(blank)).toThrow(
      "Enter an event title",
    );
    expect(validate({ ...input, rsvpBy: null })).toBe(false);
    expect(validate({ ...input, startsAt: "not a date" })).toBe(false);
  });
  it("reports provider conflicts and failures without overriding native structure", () => {
    const unknown = representation({
      name: "Unknown",
      parse: (input) => input,
    });
    const provider = {
      name: "Example",
      contract: () => ({
        schema: { type: "string" },
        presence: "required" as const,
      }),
    };
    expect(() =>
      toJsonSchema(unknown, { providers: [provider, provider] }),
    ).toThrow("Multiple providers");
    const invalid = {
      name: "References",
      contract: () => ({
        schema: { $ref: "#/$defs/missing" },
        presence: "required" as const,
      }),
    };
    expect(() => toJsonSchema(unknown, { providers: [invalid] })).toThrow(
      "leaf schemas",
    );
    const native = record("Record", {
      value: text("Text", { nonempty: true }),
    });
    expect(
      ajv().compile(toJsonSchema(native, { providers: [provider] }))({
        value: "",
      }),
    ).toBe(false);
  });
});
