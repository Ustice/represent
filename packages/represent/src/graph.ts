import type { Representation } from "./conversions.js";
import { dependenciesOf } from "./dependencies.js";
import type { OperationDescriptor } from "./operations.js";
import type { ReferenceDescriptor } from "./references.js";

export interface ConversionDescriptor {
  readonly name: string;
  readonly from: Representation<unknown>;
  readonly to: Representation<unknown>;
}

export function graph(
  conversions: readonly ConversionDescriptor[],
  options: {
    operations?: readonly OperationDescriptor[];
    references?: readonly ReferenceDescriptor[];
  } = {},
) {
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
    [from, to].forEach(addRepresentation);
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
  function addRepresentation(endpoint: Representation<unknown>) {
    const existing = representations.get(endpoint.name);
    if (existing && existing !== endpoint)
      throw new Error(`Duplicate representation name: ${endpoint.name}`);
    representations.set(endpoint.name, endpoint);
  }
  conversions.forEach(visit);
  const referenceNames = new Map<string, ReferenceDescriptor>();
  const references: Array<{
    name: string;
    from: string;
    field: string;
    to: string;
    key: string;
  }> = [];
  function addReference(subject: ReferenceDescriptor) {
    const existing = referenceNames.get(subject.name);
    if (existing === subject) return;
    if (existing) throw new Error(`Duplicate reference name: ${subject.name}`);
    referenceNames.set(subject.name, subject);
    [subject.from, subject.to].forEach(addRepresentation);
    references.push({
      name: subject.name,
      from: subject.from.name,
      field: subject.field,
      to: subject.to.name,
      key: subject.key,
    });
  }
  options.references?.forEach(addReference);
  const operationNames = new Set<string>();
  const operations = (options.operations ?? []).map((subject) => {
    if (operationNames.has(subject.name))
      throw new Error(`Duplicate operation name: ${subject.name}`);
    operationNames.add(subject.name);
    [subject.input, subject.output, ...subject.reads].forEach(
      addRepresentation,
    );
    subject.references.forEach(addReference);
    return {
      name: subject.name,
      input: subject.input.name,
      output: subject.output.name,
      reads: subject.reads.map(({ name }) => name),
      references: subject.references.map(({ name }) => name),
    };
  });
  const nodes = [...representations.keys()].map((name) => ({ name }));
  return { nodes, edges, dependencies, operations, references };
}
