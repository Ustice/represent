import type { Representation } from "./conversions.js";

import type { ConversionDescriptor } from "./graph.js";
import type { ReferenceDescriptor } from "./references.js";

export interface OperationDescriptor {
  readonly kind: "operation";
  readonly name: string;
  readonly input: Representation<unknown>;
  readonly output: Representation<unknown>;
  readonly reads: readonly Representation<unknown>[];
  readonly references: readonly ReferenceDescriptor[];
  readonly calls: readonly (ConversionDescriptor | OperationDescriptor)[];
}

export class OperationError extends Error {
  override readonly name = "OperationError";
  constructor(
    readonly operation: string,
    readonly stage: "input" | "perform" | "output",
    cause: unknown,
  ) {
    super(
      `${operation}: ${stage}: ${cause instanceof Error ? cause.message : "Operation failed"}`,
      { cause },
    );
  }
}

interface OperationDefinition<Input, Output> {
  readonly name: string;
  readonly input: Representation<Input>;
  readonly output: Representation<Output>;
  readonly reads?: readonly Representation<unknown>[];
  readonly references?: readonly ReferenceDescriptor[];
  readonly calls?: readonly (ConversionDescriptor | OperationDescriptor)[];
}

function descriptor<Input, Output>(
  definition: OperationDefinition<Input, Output>,
) {
  return {
    kind: "operation" as const,
    name: definition.name,
    input: definition.input,
    output: definition.output,
    reads: Object.freeze([...(definition.reads ?? [])]),
    calls: Object.freeze([...(definition.calls ?? [])]),
    references: Object.freeze([...(definition.references ?? [])]),
  };
}

export function operation<Input, Output, Context>(
  definition: OperationDefinition<Input, Output> & {
    perform: (value: NoInfer<Input>, context: Context) => NoInfer<Output>;
  },
) {
  const { name, input, output, perform } = definition;
  function step<Value>(
    stage: "input" | "perform" | "output",
    action: () => Value,
  ) {
    try {
      return action();
    } catch (cause) {
      throw new OperationError(name, stage, cause);
    }
  }
  const run = (value: unknown, context: Context) => {
    const parsed = step("input", () => input.parse(value));
    const result = step("perform", () => perform(parsed, context));
    return step("output", () => output.parse(result));
  };
  const execute = (value: Input, context: Context) => run(value, context);
  return Object.freeze({ ...descriptor(definition), run, execute });
}

export function asyncOperation<Input, Output, Context>(
  definition: OperationDefinition<Input, Output> & {
    perform: (
      value: NoInfer<Input>,
      context: Context,
    ) => PromiseLike<NoInfer<Output>>;
  },
) {
  const { name, input, output, perform } = definition;
  const run = async (value: unknown, context: Context) => {
    let parsed: Input;
    try {
      parsed = input.parse(value);
    } catch (cause) {
      throw new OperationError(name, "input", cause);
    }
    let result: Output;
    try {
      result = await perform(parsed, context);
    } catch (cause) {
      throw new OperationError(name, "perform", cause);
    }
    try {
      return output.parse(result);
    } catch (cause) {
      throw new OperationError(name, "output", cause);
    }
  };
  const execute = (value: Input, context: Context) => run(value, context);
  return Object.freeze({ ...descriptor(definition), run, execute });
}
