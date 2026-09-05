import { codec, representation } from "@represent/core";
import { z } from "zod";

export function parser<Value>(schema: z.ZodType<Value>) {
  return (input: unknown) => {
    const result = schema.safeParse(input);
    if (!result.success) {
      throw new Error(
        result.error.issues
          .map(
            (issue) => `${issue.path.join(".") || "Value"}: ${issue.message}`,
          )
          .join("; "),
      );
    }
    return result.data;
  };
}

export function field<Value>(name: string, schema: z.ZodType<Value>) {
  return representation({ name, parse: parser(schema) });
}

export const dateTime = codec({
  name: "Date and ISO timestamp",
  from: field("Date", z.date()),
  to: field("ISO timestamp", z.iso.datetime({ offset: true })),
  encode: (value) => value.toISOString(),
  decode: (value) => new Date(value),
});
