import { codec, type Codec } from "./conversions.js";
import { optional, nullable, list } from "./values.js";
import { setDependencies } from "./dependencies.js";
import type { ConversionDescriptor } from "./graph.js";

function verify(subject: {
  encode: ConversionDescriptor;
  decode: ConversionDescriptor;
}) {
  if (
    subject.encode.from !== subject.decode.to ||
    subject.encode.to !== subject.decode.from
  )
    throw new Error("Codec directions must share opposite endpoints");
}
export function optionalCodec<Source, Target>(subject: Codec<Source, Target>) {
  verify(subject);
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

export function nullableCodec<Source, Target>(subject: Codec<Source, Target>) {
  verify(subject);
  const result = codec({
    name: `Nullable ${subject.encode.from.name} ↔ ${subject.encode.to.name}`,
    from: nullable(subject.encode.from),
    to: nullable(subject.encode.to),
    encode: (value) => (value === null ? null : subject.encode.convert(value)),
    decode: (value) => (value === null ? null : subject.decode.convert(value)),
  });
  setDependencies(result.encode, [{ field: null, conversion: subject.encode }]);
  setDependencies(result.decode, [{ field: null, conversion: subject.decode }]);
  return result;
}
export function listCodec<Source, Target>(subject: Codec<Source, Target>) {
  verify(subject);
  const result = codec({
    name: `List ${subject.encode.from.name} ↔ ${subject.encode.to.name}`,
    from: list(subject.encode.from),
    to: list(subject.encode.to),
    encode: (values) =>
      values.map((value, index) =>
        mapElement(() => subject.encode.convert(value), index),
      ),
    decode: (values) =>
      values.map((value, index) =>
        mapElement(() => subject.decode.convert(value), index),
      ),
  });
  setDependencies(result.encode, [{ field: null, conversion: subject.encode }]);
  setDependencies(result.decode, [{ field: null, conversion: subject.decode }]);
  return result;
}
function mapElement<Value>(convert: () => Value, index: number) {
  try {
    return convert();
  } catch (cause) {
    throw new Error(
      `[${index}]: ${cause instanceof Error ? cause.message : "Conversion failed"}`,
      { cause },
    );
  }
}
