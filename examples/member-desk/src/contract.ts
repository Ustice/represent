import { Ajv2020 } from "ajv/dist/2020.js";
import { toJsonSchema } from "@represent/json-schema";
import { zodJsonSchema } from "@represent/zod";
import { eventExchange } from "./events/model.js";
import { registerRsvp } from "./rsvps/model.js";

export const rsvpContract = toJsonSchema(registerRsvp.input);
export const eventContract = toJsonSchema(eventExchange.encode.to, {
  providers: [zodJsonSchema],
});
export const contracts = { rsvp: rsvpContract, event: eventContract };
export type ContractKind = keyof typeof contracts;
const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  ownProperties: true,
});
const validators = {
  rsvp: ajv.compile(rsvpContract),
  event: ajv.compile(eventContract),
};
export function validateRequestJson(
  source: string,
  kind: ContractKind = "rsvp",
) {
  let input: unknown;
  try {
    input = JSON.parse(source);
  } catch {
    return {
      status: "invalid-json",
      messages: ["Enter a complete JSON value."],
    } as const;
  }
  const validate = validators[kind];
  if (!validate(input))
    return {
      status: "rejected",
      messages: (validate.errors ?? []).map(
        (error) =>
          `${error.instancePath || "/"}: ${error.keyword === "pattern" ? "does not match the declared format" : (error.message ?? error.keyword)}`,
      ),
    } as const;
  if (kind === "rsvp")
    return {
      status: "accepted",
      messages: ["Matches the generated RSVP request contract."],
    } as const;
  try {
    const decoded = eventExchange.decode.run(input);
    return {
      status: "decoded",
      messages: [
        "Matches the generated Event API contract and passes domain validation.",
      ],
      decoded,
    } as const;
  } catch (error) {
    return {
      status: "domain-rejected",
      messages: [
        error instanceof Error ? error.message : "Event decoding failed.",
      ],
    } as const;
  }
}
