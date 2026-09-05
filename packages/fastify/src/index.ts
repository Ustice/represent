import { OperationError, type OperationDescriptor } from "@represent/core";
import type { FastifyRequest } from "fastify";

export class InvalidOperationInput extends Error {
  readonly statusCode = 400;
  readonly code = "REPRESENT_INPUT";
  constructor(cause: OperationError) {
    super("Invalid operation input", { cause });
    this.name = "InvalidOperationInput";
  }
}

/** Adapt an operation to a Fastify handler; routes, hooks, and error policy remain Fastify's. */
export function operationHandler<Context, Output>(
  subject: OperationDescriptor & {
    readonly run: (
      input: unknown,
      context: Context,
    ) => Output | PromiseLike<Output>;
  },
  options: {
    readonly input: (request: FastifyRequest) => unknown;
    readonly context: (
      request: FastifyRequest,
    ) => NoInfer<Context> | PromiseLike<NoInfer<Context>>;
  },
) {
  return async (request: FastifyRequest) => {
    const input = options.input(request);
    const context = await options.context(request);
    try {
      return await subject.run(input, context);
    } catch (error) {
      if (error instanceof OperationError && error.stage === "input")
        throw new InvalidOperationInput(error);
      throw error;
    }
  };
}
