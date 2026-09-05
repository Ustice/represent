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

`operation({ name, input, output, perform })` validates a synchronous command
against an explicit context:

```ts
const signup = registerRsvp.execute(
  { memberId, eventId },
  {
    members,
    events,
    rsvps,
    now: new Date(),
  },
);
```

`execute` checks the input and context types; `run` accepts external `unknown`
input. Both parse input, invoke `perform`, and parse the result. The context is
trusted and is not parsed by the core. `OperationError` identifies the operation
and input/perform/output stage, retaining the underlying cause. The consumer
owns clock selection, domain rules, missing-reference policy, and persistence.
Operations provide no transaction, rollback, concurrency, or purity guarantee.

A `reference` names a field-to-key relationship and resolves it against
supplied, trusted records:

```ts
const rsvpMember = reference({
  name: "RSVP member",
  from: rsvpExchange.encode.from,
  field: "memberId",
  to: member,
  key: "id",
});
const attendee = rsvpMember.resolve(rsvp, savedMembers);
```

The target key must have a type assignable to the source field type. Resolution
uses `Object.is`, returns `undefined` for no match, and throws for multiple
matches. It accepts a source containing the reference field; other source fields
are unnecessary for lookup. It does not parse, fetch, coerce, or persist
records. The caller decides what a missing reference means.

Operations can declare `reads: [member, event, rsvp]` and
`references: [rsvpMember, rsvpEvent]`. These arrays are copied at construction.
`graph(conversions, { operations, references })` includes their representations,
operation input/output/read names, and reference field/key endpoints. References
used by operations are included automatically and shared instances appear once.
Reads are explicit declarations, not verified or exhaustive dependency analysis;
operation results do not imply persistence or writes. The graph does not inspect
function bodies to discover which conversions or references they invoke.

`compose(first, second)` explicitly connects edges sharing the same intermediate
representation object. Each edge runs its own parsers, including the
intermediate boundary on both sides; parser transformations must account for
that. `graph` returns names and directed edges from the registered conversions
and their transitive conversion dependencies. Its `dependencies` array records
`parent`, `field`, and `conversion`: record bindings have a field name; optional
wrappers and explicit composition use `null`. Composition dependencies retain
execution order. Shared conversion instances appear once, with all their
bindings preserved. Describing the graph does not execute parsers or mappings.

Graph roots must have unique names. Dependencies can reuse an existing instance;
distinct objects with conflicting names are rejected, including representation
names. Create and reuse a field codec (including an optional wrapper) when it
appears in several places. The graph does not inspect mapping function bodies,
choose routes, infer relationships from IDs, or infer guarantees.

This is a value-conversion experiment. Record codecs derive runtime parsers and
TypeScript record shapes, not target-library schemas or artifacts. Automatic
adapters, certification, and impact analysis are not implemented. Conversion
dependencies, declared operation reads, and explicit references are visible;
field-level operation dependencies and guarantee composition remain unproven.
