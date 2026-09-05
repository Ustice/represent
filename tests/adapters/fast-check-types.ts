import * as fc from "fast-check";
import {
  booleanValue,
  numberValue,
  record,
} from "../../packages/represent/src/index.js";
import { toArbitrary } from "../../packages/fast-check/src/index.js";

const input = record("Generated input", {
  active: booleanValue("Active"),
  count: numberValue("Count"),
});
export const generated: fc.Arbitrary<{ active: boolean; count: number }> =
  toArbitrary(input);
// @ts-expect-error Generator output keeps the parsed number type.
export const wrong: fc.Arbitrary<{ active: boolean; count: string }> =
  toArbitrary(input);
