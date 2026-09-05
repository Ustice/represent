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

export function operation<Input, Output, Context>(definition: {
  name: string;
  input: Representation<Input>;
  output: Representation<Output>;
  reads?: readonly Representation<unknown>[];
  references?: readonly ReferenceDescriptor[];
  calls?: readonly (ConversionDescriptor | OperationDescriptor)[];
  perform: (value: NoInfer<Input>, context: Context) => NoInfer<Output>;
}) {
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
  return Object.freeze({
    kind: "operation" as const,
    name,
    input,
    output,
    run,
    execute,
    reads: Object.freeze([...(definition.reads ?? [])]),
    calls: Object.freeze([...(definition.calls ?? [])]),
    references: Object.freeze([...(definition.references ?? [])]),
  });
}
