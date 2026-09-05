import type { FastifyRequest } from "fastify";
import {
  asyncOperation,
  record,
  text,
} from "../../packages/represent/src/index.js";
import { operationHandler } from "../../packages/fastify/src/index.js";

const input = record("Request", { id: text("ID") });
const lookup = asyncOperation({
  name: "Lookup",
  input,
  output: text("Result"),
  perform: ({ id }, context: { prefix: string }) =>
    Promise.resolve(context.prefix + id),
});
export const promise: Promise<string> = lookup.execute(
  { id: "x" },
  { prefix: "Found " },
);
// @ts-expect-error Async execution does not produce a synchronous string.
export const immediate: string = lookup.execute(
  { id: "x" },
  { prefix: "Found " },
);
export const handler = operationHandler(lookup, {
  input: (request) => request.body,
  context: () => ({ prefix: "Found " }),
});
operationHandler(lookup, {
  input: (request) => request.body,
  // @ts-expect-error Context must satisfy the operation, not redefine it.
  context: () => ({ prefix: 42 }),
});

export async function readResult(request: FastifyRequest) {
  const result = await handler(request);
  const text: string = result;
  // @ts-expect-error The handler preserves its string output type.
  const number: number = result;
  return { text, number };
}
