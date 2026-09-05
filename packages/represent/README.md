# Represent core

See the [member model](../../examples/member-desk/src/model.ts) and
[event model](../../examples/member-desk/src/events/model.ts) for working
examples of representations, codecs, composition, and graphing.

A representation pairs a name with a parser. A conversion connects two
representations and a typed mapping. `convert(value)` checks the source type at
compile time; `run(input)` accepts external `unknown`. Both validate the source,
run the mapping, and validate the target. Failures identify the edge, stage,
representation, and underlying error.

`codec({ name, from, to, encode, decode })` declares two mappings with shared
endpoints. It returns `encode` and `decode` conversions named `name: encode` and
`name: decode`. Both support `convert` and `run`, composition, and graph
registration just like a standalone conversion:

```ts
const payload = memberExchange.encode.convert(member);
const restored = memberExchange.decode.run(incomingJson);
const publicRoute = compose(memberExchange.encode, toPublic);
const connections = graph([memberExchange.encode, memberExchange.decode]);
```

A codec does not assert that its directions are inverses. Either can fail or
normalize values; the member codec restores dates but canonicalizes timestamp
spelling. Round-trip guarantees still require scoped evidence.

`recordCodec` assembles both record representations and their conversions from
field declarations. Use a representation for a field that keeps the same
representation, or a codec for a field that changes:

```ts
const eventExchange = recordCodec({
  name: "Event exchange",
  from: "Event",
  to: "Event API",
  fields: {
    title: eventTitle,
    startsAt: dateTime,
    endsAt: dateTime,
    rsvpBy: optionalCodec(dateTime),
  },
  validate(event) {
    if (event.endsAt <= event.startsAt)
      throw new Error("End must be after start");
  },
});
```

Field types infer the decoded and encoded record types, including optional keys.
Records reject unknown enumerable string keys and missing required values; field
failures include their path. Field declarations use string keys. The two
directions of a field codec must share opposite representation objects.
`validate` checks the decoded record before encoding and after decoding. Timing
rules and date formats remain consumer decisions.

`optionalCodec` passes `undefined` through without invoking the wrapped codec.
It does not add support for `null`. Records preserve an absent optional key
versus an explicitly present `undefined`; JSON serialization omits both. No
default value is invented. Parsers still run at each enclosing record and field
boundary, so normalization must tolerate repeated parsing, as with composition.

The record assembler has one internal type assertion after all fields have been
parsed or converted: TypeScript cannot express the key/value relationship
returned by `Object.fromEntries`. Consumers need no casts.

`compose(first, second)` explicitly connects edges sharing the same intermediate
representation object. Each edge runs its own parsers, including the
intermediate boundary on both sides; parser transformations must account for
that. `graph` returns names and directed edges from the registered conversions.
It rejects ambiguous duplicate names and does not choose routes or infer
guarantees.

This is a value-conversion experiment. Record codecs derive runtime parsers and
TypeScript record shapes, not target-library schemas or artifacts. Automatic
adapters, operation graphs, certification, and impact analysis are not
implemented. The graph describes record conversions; it does not yet expose
their field dependencies.
