import { dependenciesOf } from "./dependencies.js";

export interface Representation<Value> {
  readonly name: string;
  readonly parse: (input: unknown) => Value;
}

export function representation<Value>(definition: Representation<Value>) {
  return Object.freeze({ ...definition });
}

export interface Conversion<Source, Target> {
  readonly name: string;
  readonly from: Representation<Source>;
  readonly to: Representation<Target>;
  readonly run: (input: unknown) => Target;
  readonly convert: (value: Source) => Target;
}

export interface Codec<Source, Target> {
  readonly encode: Conversion<Source, Target>;
  readonly decode: Conversion<Target, Source>;
}

type Stage = "input" | "map" | "output";

export class ConversionError extends Error {
  override readonly name = "ConversionError";

  constructor(
    readonly conversion: string,
    readonly representation: string,
    readonly stage: Stage,
    cause: unknown,
  ) {
    const detail = cause instanceof Error ? cause.message : "Conversion failed";
    super(`${conversion}: ${stage} at ${representation}: ${detail}`, { cause });
  }
}

function attempt<Value>(
  conversion: string,
  representation: string,
  stage: Stage,
  operation: () => Value,
) {
  try {
    return operation();
  } catch (cause) {
    throw new ConversionError(conversion, representation, stage, cause);
  }
}

export function conversion<Source, Target>(definition: {
  name: string;
  from: Representation<Source>;
  to: Representation<Target>;
  map: (value: NoInfer<Source>) => NoInfer<Target>;
}): Conversion<Source, Target> {
  const { name, from, to, map } = definition;
  const run = (input: unknown) => {
    const source = attempt(name, from.name, "input", () => from.parse(input));
    const mapped = attempt(name, from.name, "map", () => map(source));
    return attempt(name, to.name, "output", () => to.parse(mapped));
  };
  return Object.freeze({ name, from, to, run, convert: run });
}

export function compose<Source, Middle, Target>(
  first: Conversion<Source, Middle>,
  second: Conversion<NoInfer<Middle>, Target>,
): Conversion<Source, Target> {
  if (first.to !== second.from) {
    throw new Error(
      `Cannot compose ${first.name} with ${second.name}: intermediate representations must be the same object (${first.to.name}, ${second.from.name})`,
    );
  }
  const run = (input: unknown) => second.convert(first.run(input));
  return Object.freeze({
    name: `${first.name} → ${second.name}`,
    from: first.from,
    to: second.to,
    run,
    convert: run,
  });
}

export function codec<Source, Target>(definition: {
  name: string;
  from: Representation<Source>;
  to: Representation<Target>;
  encode: (value: NoInfer<Source>) => NoInfer<Target>;
  decode: (value: NoInfer<Target>) => NoInfer<Source>;
}): Codec<Source, Target> {
  const { name, from, to, encode, decode } = definition;
  return Object.freeze({
    encode: conversion({ name: `${name}: encode`, from, to, map: encode }),
    decode: conversion({
      name: `${name}: decode`,
      from: to,
      to: from,
      map: decode,
    }),
  });
}

export interface ConversionDescriptor {
  readonly name: string;
  readonly from: Representation<unknown>;
  readonly to: Representation<unknown>;
}

export function graph(conversions: readonly ConversionDescriptor[]) {
  const representations = new Map<string, Representation<unknown>>();
  const names = new Map<string, ConversionDescriptor>();
  const edges: Array<{ name: string; from: string; to: string }> = [];
  const dependencies: Array<{
    parent: string;
    field: string | null;
    conversion: string;
  }> = [];
  const roots = new Set<string>();
  for (const subject of conversions) {
    if (roots.has(subject.name))
      throw new Error(`Duplicate conversion name: ${subject.name}`);
    roots.add(subject.name);
  }
  function visit(subject: ConversionDescriptor) {
    const { name, from, to } = subject;
    const existing = names.get(name);
    if (existing === subject) return;
    if (existing) {
      throw new Error(`Duplicate conversion name: ${name}`);
    }
    names.set(name, subject);
    for (const endpoint of [from, to]) {
      const existing = representations.get(endpoint.name);
      if (existing && existing !== endpoint) {
        throw new Error(`Duplicate representation name: ${endpoint.name}`);
      }
      representations.set(endpoint.name, endpoint);
    }
    edges.push({ name, from: from.name, to: to.name });
    for (const dependency of dependenciesOf(subject)) {
      dependencies.push({
        parent: name,
        field: dependency.field,
        conversion: dependency.conversion.name,
      });
      visit(dependency.conversion);
    }
  }
  conversions.forEach(visit);
  const nodes = [...representations.keys()].map((name) => ({ name }));
  return { nodes, edges, dependencies };
}
