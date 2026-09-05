import type { ConversionDescriptor } from "./graph.js";

export interface Dependency {
  readonly field: string | null;
  readonly conversion: ConversionDescriptor;
}
const registry = new WeakMap<ConversionDescriptor, readonly Dependency[]>();

export function setDependencies(
  subject: ConversionDescriptor,
  dependencies: readonly Dependency[],
) {
  registry.set(subject, dependencies);
}

export function dependenciesOf(subject: ConversionDescriptor) {
  return registry.get(subject) ?? [];
}
