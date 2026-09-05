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

`text`, `dateValue`, `optional`, and `record` build parsers with inspectable,
framework-neutral structure:

```ts
const request = record("RSVP request", {
  memberId: text("Member reference", { nonempty: true }),
  eventId: text("Event reference", { nonempty: true }),
});
const model = graph([], { representations: [request] });
```

Text preserves whitespace; `nonempty` rejects only the empty string. `dateValue`
requires a finite JavaScript Date. `optional` accepts undefined, including a
missing record field, and otherwise delegates to its wrapped parser. `record`
uses the same field parsing and presence rules as `recordCodec`.

A representation may expose `structure`; custom parsers without it remain
opaque. Structure contains references to actual child representations at runtime
and their names in a serialized graph. Graph construction includes those
children without executing parsers. `presenceOf` reports required, optional, or
unknown; it never probes an opaque parser to guess whether it supplies defaults.

Record codecs expose structure for both endpoints. A source `validate` callback
marks the source record as refined; the target parser only checks its fields.
Consequently, a structurally valid API record can still fail decoding because of
a source constraint. Structure describes a parser contract, not conversion
success or an equivalence guarantee. Handwritten structural declarations must
match their parsers; the core does not prove that assertion.

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

`runBatch(operation, inputs, { context, advance })` runs an ordered list of
external inputs through an existing synchronous operation:

```ts
const result = runBatch(registerRsvpByEmail, requests, {
  context,
  advance: (current, rsvp) => ({
    ...current,
    rsvps: [...current.rsvps, rsvp],
  }),
});

for (const row of result.rows) {
  if (row.status === "accepted") useRsvp(row.value);
  else showProblem(row.index, row.error.stage, row.error.message);
}
```

`rows` contains one `BatchRow<Value>` per input, in order, with a zero-based
`index`. Accepted rows carry the validated output; rejected rows retain the
original `OperationError`, including its stage and cause. Input, perform, and
output failures are collected; later rows continue against the last accepted
context. `advance` is required and runs only after validated success. It returns
the context for the next row; `result.context` contains the final context.
Stateless consumers can explicitly return the same context.

Transition failures and unexpected errors outside an operation propagate. The
runner does not clone context, undo mutations, roll back effects, or persist
results. A preview requires a side-effect-free operation and transition.
Fieldwork uses immutable transitions, revalidates the reviewed selection against
current state and time, and saves accepted RSVPs in one consumer-owned write.
Batching adds no transaction or cross-tab concurrency guarantee and introduces
no additional graph node: the supplied operation keeps its existing metadata.

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
`graph(conversions, { operations, references, representations })` includes their
representations, operation input/output/read names, and reference field/key
endpoints. References used by operations are included automatically and shared
instances appear once. Operations may declare
`calls: [someConversion, someOperation]`; the graph recursively includes those
definitions and their dependencies without executing them. Conversions and
operations expose an explicit `kind` tag. Reusing the same called instance is
allowed; distinct instances with the same kind/name are rejected. Repeated
declarations of the same call emit one call link. Cycles in declared calls
terminate during graph construction and queries.

Calls are declared dependencies, not instrumentation: the body still calls
`convert` or `execute` normally. The declaration does not prove that a call
happens on every execution, enumerate every call, or enforce context/effects.
Declare direct reads and references; queries can reach a callee's requirements
through the call edge instead of copying its metadata. Reads are explicit
declarations, not verified or exhaustive dependency analysis; operation results
do not imply persistence or writes. The graph does not inspect function bodies
to discover which conversions or references they invoke.

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

`dependents(model, { kind, name })` explains which definitions depend on a
selected representation, conversion, operation, or reference:

```ts
const result = dependents(workspaceGraph, {
  kind: "conversion",
  name: dateTime.encode.name,
});
// dateTime.encode -> memberExchange.encode -> profileFor
const profile = result.dependents.find(
  ({ item }) => item.kind === "conversion" && item.name === profileFor.name,
);
```

`Graph` is the readonly TypeScript data shape returned by `graph`. `GraphItem`
identifies a definition by both kind and name; different kinds can share a name.
The result contains `source` and `dependents`. Each dependent has its `item`,
one shortest `path`, and `via`: every distinct immediate dependency link reached
by the query, including links reached along longer paths. A `DependencyLink`
records the `dependency`, `dependent`, and a structured `reason` (including the
field name where applicable). The source itself is excluded, including in
cycles.

`requirements(model, selection)` traces upstream with the same shortest-path,
identity, cycle, and ordering rules. Its result contains `source` and
`requirements`. Path links retain their dependency/dependent identities; the
sequence starts at the selection and follows its requirements. Both queries
exclude the source itself, including direct self calls. Self links remain
visible in `inspectGraph(model)`, which returns sorted `items` and deduplicated
`links` for consumers that need direct graph inspection. Each link is oriented
from dependency to dependent. A viewer may present natural input/output flow
separately; it must not confuse that flow with dependency traversal.

These are **definition dependencies**, traversed in the following directions:

| Dependency                     | Dependent         | Reason                                                   |
| ------------------------------ | ----------------- | -------------------------------------------------------- |
| Representation                 | Conversion        | Input or output contract                                 |
| Child representation           | Record or wrapper | Declared field or wrapped value                          |
| Child conversion               | Parent conversion | Field binding, optional wrapper, or explicit composition |
| Representation                 | Operation         | Input/output contract or declared read                   |
| Representation                 | Reference         | Source field or target key                               |
| Reference                      | Operation         | Declared reference use                                   |
| Called conversion or operation | Calling operation | Declared call                                            |

A conversion or operation does not make its output representation a dependent:
producing a value does not change the definition of its schema. For example,
changing the member encoder calls for reviewing the composed public-profile
conversion. It does not imply a changed Member API schema or a change to every
consumer of that schema. Changing the Member API definition itself does identify
both its encoders and decoders. Output representations can be displayed as
context, as Fieldwork does, without becoming dependency traversal edges.

Traversal is breadth-first, with links ordered lexically by their serialized
kind/name identities and reason. Reordering graph registration does not change
the selected paths or results. Parallel field bindings remain distinct;
identical links are deduplicated. Cycles terminate, and only one path per
dependent is materialized rather than enumerating every possible path. Unknown
selections, duplicate same-kind identities, and dangling graph links throw. A
known isolated definition returns no dependents. Queries do not mutate the
graph.

The graph includes only registered definitions and declared dependencies.
Register actual composed conversions to make those relationships visible. Opaque
mapping/parser bodies and undeclared calls inside operations are not inferred.
Fieldwork explicitly declares both encoders called by attendee export, and email
signup declares its call to the existing signup operation. Results do not prove
field-level impact, runtime value changes, persistence, or complete dependency
coverage.

This is a value-conversion experiment. Record codecs derive runtime parsers,
TypeScript record shapes, and neutral structural descriptions. Target-library
schemas and artifacts are not generated yet. Automatic adapters and
certification are not implemented. Definition dependency queries are available;
field-level impact analysis and guarantee composition remain unproven.
