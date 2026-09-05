import { Ajv2020 } from "ajv/dist/2020.js";
import { toJsonSchema } from "@represent/json-schema";
import { registerRsvp } from "./rsvps/model.js";

export const rsvpContract = toJsonSchema(registerRsvp.input);
const validate = new Ajv2020({
  strict: true,
  allErrors: true,
  ownProperties: true,
}).compile(rsvpContract);
export function validateRequestJson(source: string) {
  let input: unknown;
  try {
    input = JSON.parse(source);
  } catch {
    return {
      status: "invalid-json",
      messages: ["Enter a complete JSON value."],
    } as const;
  }
  if (validate(input))
    return {
      status: "accepted",
      messages: ["Matches the generated RSVP request contract."],
    } as const;
  return {
    status: "rejected",
    messages: (validate.errors ?? []).map(
      (error) =>
        `${error.instancePath || "/"}: ${error.message ?? error.keyword}`,
    ),
  } as const;
}
