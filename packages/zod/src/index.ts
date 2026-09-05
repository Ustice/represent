import { representation, type Representation } from "@represent/core";
import type { JsonSchemaProvider } from "@represent/json-schema";
import { z } from "zod";

const schemas = new WeakMap<Representation<unknown>, z.ZodType>();
export function fromZod<Value>(name: string, schema: z.ZodType<Value>) {
  const value = representation({
    name,
    parse(input: unknown) {
      const result = schema.safeParse(input);
      if (!result.success)
        throw new Error(
          result.error.issues
            .map(
              (issue) => `${issue.path.join(".") || "Value"}: ${issue.message}`,
            )
            .join("; "),
        );
      return result.data;
    },
  });
  schemas.set(value, schema);
  return value;
}

function portableLeaf(schema: z.ZodType) {
  if (schema._zod.def.checks?.length)
    throw new Error(
      "Additional checks, normalization, and custom refinements are not supported by this export profile",
    );
  if (schema instanceof z.ZodEnum) {
    if (!schema.options.length)
      throw new Error("Empty choices are not supported by this export profile");
    if (!schema.options.every((value) => typeof value === "string"))
      throw new Error("Only string choices are supported");
    return;
  }
  if (
    !(schema instanceof z.ZodString) &&
    !(schema instanceof z.ZodISODateTime) &&
    !(schema instanceof z.ZodEmail)
  )
    throw new Error(`Unsupported Zod type: ${schema._zod.def.type}`);
  if (schema._zod.def.coerce)
    throw new Error("Coercion cannot be described by this contract");
  if (
    "check" in schema._zod.def &&
    !(schema instanceof z.ZodISODateTime) &&
    !(schema instanceof z.ZodEmail)
  )
    throw new Error("Unsupported string format");
  if ("when" in schema._zod.def)
    throw new Error("Conditional checks cannot be described by this contract");
  if (schema instanceof z.ZodISODateTime || schema instanceof z.ZodEmail) {
    const expected =
      schema instanceof z.ZodISODateTime
        ? z.regexes.datetime(schema._zod.def)
        : z.regexes.email;
    const actual = schema._zod.def.pattern;
    if (
      !actual ||
      actual.source !== expected.source ||
      actual.flags !== expected.flags
    )
      throw new Error(
        "Custom format patterns are not supported by this export profile",
      );
  }
}

export const zodJsonSchema: JsonSchemaProvider = {
  name: "Zod 4.4.3 leaf contracts",
  contract(value) {
    const schema = schemas.get(value);
    if (!schema) return;
    portableLeaf(schema);
    const exported = z.toJSONSchema(schema, {
      target: "draft-2020-12",
      io: "input",
      metadata: z.registry(),
    });
    // Zod's timestamp language differs from JSON Schema's date-time format.
    // The generated pattern carries the actual validation rule in this profile.
    const { $schema: dialect, format, ...fragment } = exported;
    void dialect;
    void format;
    return { schema: fragment, presence: "required" };
  },
};
