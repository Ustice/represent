import type { Representation } from "./conversions.js";

export interface ReferenceDescriptor {
  readonly name: string;
  readonly from: Representation<unknown>;
  readonly field: string;
  readonly to: Representation<unknown>;
  readonly key: string;
}

type MatchingKey<Value, Key> = {
  [Field in keyof Value & string]: Value[Field] extends Key ? Field : never;
}[keyof Value & string];

export function reference<
  Source,
  Target,
  Field extends keyof Source & string,
>(definition: {
  name: string;
  from: Representation<Source>;
  field: Field;
  to: Representation<Target>;
  key: MatchingKey<NoInfer<Target>, NoInfer<Source[Field]>>;
}) {
  const { name, from, field, to, key } = definition;
  function resolve(source: Pick<Source, Field>, targets: readonly Target[]) {
    const matches = targets.filter((target) =>
      Object.is(source[field], target[key]),
    );
    const [match] = matches;
    if (matches.length > 1)
      throw new Error(
        `${name}: ambiguous ${to.name}.${key} for ${from.name}.${field}`,
      );
    return match;
  }
  return Object.freeze({ name, from, field, to, key, resolve });
}
