import {
  graph,
  inspectGraph,
  presenceOf,
  type Representation,
} from "@represent/core";
import * as fc from "fast-check";

export interface ArbitraryProvider {
  readonly name: string;
  readonly arbitrary: (
    subject: Representation<unknown>,
  ) => fc.Arbitrary<unknown> | undefined;
}
export interface GenerationLimits {
  readonly maxStringLength: number;
  readonly maxListLength: number;
}
export class ArbitraryBuildError extends Error {
  constructor(
    readonly representation: string,
    readonly path: readonly string[],
    readonly reason: string,
  ) {
    super(`${JSON.stringify(path)} (${representation}): ${reason}`);
    this.name = "ArbitraryBuildError";
  }
}

/** Derive bounded generators. Providers choose domains; the real parser validates every generated result. */
export function toArbitrary<Value>(
  subject: Representation<Value>,
  options: {
    providers?: readonly ArbitraryProvider[];
    limits?: Partial<GenerationLimits>;
  } = {},
): fc.Arbitrary<Value> {
  const limits = { maxStringLength: 24, maxListLength: 4, ...options.limits };
  for (const [name, value] of Object.entries(limits))
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error(`${name} must be a nonnegative safe integer`);
  inspectGraph(graph([], { representations: [subject] }));
  const building = new Set<Representation<unknown>>();
  const cache = new Map<Representation<unknown>, fc.Arbitrary<unknown>>();
  function build(
    value: Representation<unknown>,
    path: readonly string[],
  ): fc.Arbitrary<unknown> {
    const previous = cache.get(value);
    if (previous) return previous;
    const fail = (reason: string): never => {
      throw new ArbitraryBuildError(value.name, path, reason);
    };
    const provided = (options.providers ?? []).flatMap((provider) => {
      try {
        const arbitrary = provider.arbitrary(value);
        return arbitrary ? [{ name: provider.name, arbitrary }] : [];
      } catch (error) {
        return fail(
          `${provider.name}: ${error instanceof Error ? error.message : "Provider failed"}`,
        );
      }
    });
    if (provided.length > 1)
      fail(
        `Multiple providers claim this representation: ${provided.map((provider) => provider.name).join(", ")}`,
      );
    const custom = provided[0]?.arbitrary;
    if (custom) {
      cache.set(value, custom);
      return custom;
    }
    if (building.has(value))
      fail("Recursive structures need an explicit provider");
    building.add(value);
    const structure = value.structure;
    let result: fc.Arbitrary<unknown>;
    if (!structure)
      return fail("Opaque representation needs an explicit provider");
    switch (structure.kind) {
      case "text":
        if (structure.nonempty && limits.maxStringLength === 0)
          fail("The string limit excludes nonempty text");
        result = fc.string({
          minLength: structure.nonempty ? 1 : 0,
          maxLength: limits.maxStringLength,
          unit: "binary",
        });
        break;
      case "boolean":
        result = fc.boolean();
        break;
      case "number": {
        if (structure.integer) {
          const min = Math.ceil(structure.min ?? Number.MIN_SAFE_INTEGER);
          const max = Math.floor(structure.max ?? Number.MAX_SAFE_INTEGER);
          if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max))
            fail(
              "Integer generation requires safe-integer bounds or an explicit provider",
            );
          if (min > max) fail("The declared interval contains no integer");
          result = fc.integer({ min, max });
        } else
          result = fc.double({
            min: structure.min ?? -Number.MAX_VALUE,
            max: structure.max ?? Number.MAX_VALUE,
            noNaN: true,
          });
        break;
      }
      case "date":
        result = fc.date({ noInvalidDate: true });
        break;
      case "optional":
        result = fc.option(build(structure.inner, path), { nil: undefined });
        break;
      case "nullable":
        result = fc.option(build(structure.inner, path), { nil: null });
        break;
      case "list":
        result = fc.array(build(structure.element, [...path, "[]"]), {
          maxLength: limits.maxListLength,
        });
        break;
      case "record": {
        if (structure.refined)
          fail("Refined record needs an explicit provider");
        const fields = Object.fromEntries(
          structure.fields.map((field) => [
            field.key,
            build(field.representation, [...path, field.key]),
          ]),
        );
        result = fc.record(fields, {
          requiredKeys: structure.fields
            .filter((field) => presenceOf(field.representation) !== "optional")
            .map((field) => field.key),
          noNullPrototype: true,
        });
        break;
      }
    }
    building.delete(value);
    cache.set(value, result);
    return result;
  }
  return build(subject, []).map((value) => subject.parse(value));
}
