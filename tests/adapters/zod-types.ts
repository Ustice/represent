import { z } from "zod";
import { fromZod } from "../../packages/zod/src/index.js";

// Consumer compilation keeps Zod's output type, including transformed outputs.
const role = fromZod("Role", z.enum(["Member", "Organizer"]));
const length = fromZod(
  "Length",
  z.string().transform((value) => value.length),
);
export const selectedRole: "Member" | "Organizer" = role.parse("Member");
export const characterCount: number = length.parse("hello");
// @ts-expect-error Parsing a transformed string produces a number.
export const originalText: string = length.parse("hello");
// @ts-expect-error Enum inference must not widen to an unrelated role.
export const owner: "Owner" = role.parse("Member");
