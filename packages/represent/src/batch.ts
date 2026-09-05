import { OperationError, type OperationDescriptor } from "./operations.js";

export type BatchRow<Value> =
  | {
      readonly index: number;
      readonly status: "accepted";
      readonly value: Value;
    }
  | {
      readonly index: number;
      readonly status: "rejected";
      readonly error: OperationError;
    };

export function runBatch<Value, Context>(
  subject: OperationDescriptor & {
    run: (input: unknown, context: Context) => Value;
  },
  inputs: readonly unknown[],
  options: {
    context: NoInfer<Context>;
    advance: (
      context: NoInfer<Context>,
      value: NoInfer<Value>,
    ) => NoInfer<Context>;
  },
) {
  let context = options.context;
  const rows: BatchRow<Value>[] = [];
  for (const [index, input] of inputs.entries()) {
    let value: Value;
    try {
      value = subject.run(input, context);
    } catch (error) {
      if (!(error instanceof OperationError)) throw error;
      rows.push({ index, status: "rejected", error });
      continue;
    }
    context = options.advance(context, value);
    rows.push({ index, status: "accepted", value });
  }
  return { rows, context };
}
