import {
  codec,
  representation,
  type Codec,
  type Representation,
} from "./conversions.js";
import { setDependencies } from "./dependencies.js";

interface FieldCodec {
  readonly encode: {
    readonly name: string;
    readonly from: Representation<unknown>;
    readonly to: Representation<unknown>;
    readonly run: (input: unknown) => unknown;
  };
  readonly decode: {
    readonly name: string;
    readonly from: Representation<unknown>;
    readonly to: Representation<unknown>;
    readonly run: (input: unknown) => unknown;
  };
}
type Field = Representation<unknown> | FieldCodec;
type Direction = "encode" | "decode";
type FieldValue<F, D extends Direction> =
  F extends Representation<infer Value>
    ? Value
    : F extends FieldCodec
      ? ReturnType<F[D]["run"]>
      : never;
type RecordValue<Fields, D extends Direction> = {
  [
    Key in keyof Fields as undefined extends FieldValue<Fields[Key], D>
      ? never
      : Key
  ]: FieldValue<Fields[Key], D>;
} & {
  [
    Key in keyof Fields as undefined extends FieldValue<Fields[Key], D>
      ? Key
      : never
  ]?: FieldValue<Fields[Key], D>;
};

function mapFields<Fields extends Record<string, Field>, D extends Direction>(
  fields: Fields,
  input: unknown,
  direction: D,
  convert: boolean,
): RecordValue<Fields, D> {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    throw new Error("Expected a record");
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(fields, key))
      throw new Error(`Unexpected field: ${key}`);
  }
  const entries = Object.entries(fields).flatMap(([key, field]) => {
    const present = Object.hasOwn(input, key);
    const value: unknown = present ? Reflect.get(input, key) : undefined;
    try {
      const result =
        "parse" in field
          ? field.parse(value)
          : convert
            ? field[direction].run(value)
            : field[direction].to.parse(value);
      return present || result !== undefined ? [[key, result]] : [];
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Invalid value";
      throw new Error(`${key}: ${detail}`, { cause });
    }
  });
  // Each declared key has been parsed by its representation or converted by
  // its codec. Object.fromEntries cannot express this key/value relationship.
  return Object.fromEntries(entries) as RecordValue<Fields, D>;
}

export function recordCodec<
  const Fields extends Record<string, Field>,
>(definition: {
  name: string;
  from: string;
  to: string;
  fields: Fields;
  validate?: (value: NoInfer<RecordValue<Fields, "decode">>) => void;
}) {
  const { name, from, to, validate } = definition;
  const fields: Fields = { ...definition.fields };
  Object.freeze(fields);
  if (Object.getOwnPropertySymbols(fields).length)
    throw new Error("Record fields must have string keys");
  for (const [key, field] of Object.entries(fields)) {
    if (
      !("parse" in field) &&
      (field.encode.from !== field.decode.to ||
        field.encode.to !== field.decode.from)
    ) {
      throw new Error(`${key}: codec directions must share opposite endpoints`);
    }
  }
  const source = representation({
    name: from,
    parse(input: unknown) {
      const value = mapFields(fields, input, "decode", false);
      validate?.(value);
      return value;
    },
  });
  const target = representation({
    name: to,
    parse: (input: unknown) => mapFields(fields, input, "encode", false),
  });
  const result = codec({
    name,
    from: source,
    to: target,
    encode: (value) => mapFields(fields, value, "encode", true),
    decode: (value) => mapFields(fields, value, "decode", true),
  });
  for (const direction of ["encode", "decode"] as const) {
    setDependencies(
      result[direction],
      Object.entries(fields).flatMap(([key, field]) =>
        "parse" in field ? [] : [{ field: key, conversion: field[direction] }],
      ),
    );
  }
  return result;
}

export function optionalCodec<Source, Target>(subject: Codec<Source, Target>) {
  function optional<Value>(value: Representation<Value>) {
    return representation({
      name: `${value.name} (optional)`,
      parse: (input: unknown) =>
        input === undefined ? undefined : value.parse(input),
    });
  }
  const result = codec({
    name: `Optional ${subject.encode.from.name} ↔ ${subject.encode.to.name}`,
    from: optional(subject.encode.from),
    to: optional(subject.encode.to),
    encode: (value) =>
      value === undefined ? undefined : subject.encode.convert(value),
    decode: (value) =>
      value === undefined ? undefined : subject.decode.convert(value),
  });
  setDependencies(result.encode, [{ field: null, conversion: subject.encode }]);
  setDependencies(result.decode, [{ field: null, conversion: subject.decode }]);
  return result;
}
