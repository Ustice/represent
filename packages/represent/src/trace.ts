import type { ConversionDescriptor } from "./graph.js";

export interface ConversionRunner extends ConversionDescriptor {
  readonly run: (input: unknown) => unknown;
}
export type ConversionTraceStep<Snapshot> = {
  readonly index: number;
  readonly conversion: string;
  readonly from: string;
  readonly to: string;
} & (
  | { readonly status: "completed"; readonly output: Snapshot }
  | { readonly status: "failed"; readonly error: unknown }
);

/** Execute an explicit path once, retaining caller-defined snapshots at its boundaries. */
export function tracePath<Snapshot>(
  path: readonly ConversionRunner[],
  input: unknown,
  options: { snapshot: (value: unknown) => Snapshot },
) {
  const route = [...path];
  if (!route.length)
    throw new Error("A conversion path needs at least one step");
  for (const [index, current] of route.entries()) {
    const previous = route[index - 1];
    if (previous && previous.to !== current.from)
      throw new Error(
        `Cannot connect ${previous.name} to ${current.name}: intermediate representations must be the same object`,
      );
  }
  const initial = options.snapshot(input);
  const steps: ConversionTraceStep<Snapshot>[] = [];
  let value = input;
  for (const [index, conversion] of route.entries()) {
    const description = {
      index,
      conversion: conversion.name,
      from: conversion.from.name,
      to: conversion.to.name,
    };
    try {
      value = conversion.run(value);
    } catch (error) {
      steps.push({ ...description, status: "failed", error });
      return { status: "failed", initial, steps } as const;
    }
    // Snapshot failures belong to the inspection boundary, not the conversion.
    steps.push({
      ...description,
      status: "completed",
      output: options.snapshot(value),
    });
  }
  return { status: "completed", initial, steps, value } as const;
}
