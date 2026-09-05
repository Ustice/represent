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
TypeScript record shapes, and neutral structural descriptions. The experimental
[JSON Schema adapter](../json-schema/) derives supported JSON contracts and
rejects opaque or unexpressible constraints. A scoped JSON acceptance
certification profile is available in
[Sensor Bench](../../examples/sensor-bench/); it does not certify other adapters
or profiles. Definition dependency queries are available; field-level impact
analysis and guarantee composition remain unproven.

`compareSchemas(beforeGraph, afterGraph)` compares declared representation
structure by name. It returns `changes` (added, removed, or changed) with before
and after shapes and direct field bindings, plus `unverified` opaque/refined
representations with one entry per name and all applicable `reasons` from either
snapshot, including additions and removals. Null shapes mean absent or opaque;
`kind` distinguishes addition and removal. Graph and field registration order do
not create differences; renaming a definition is a removal plus addition. A
changed child constraint is reported on the child; use dependency paths to see
the enclosing records.

```ts
const comparison = compareSchemas(before, after);
for (const change of comparison.changes) {
  if (change.kind !== "removed") {
    const affected = dependents(after, {
      kind: "representation",
      name: change.representation,
    });
  }
}
```

Inspect both snapshots' dependents when reviewing a change, including removed
relationships. Equal declarations do not prove equal parser behavior. Comparison
does not inspect conversion/operation bodies or graph-link changes and does not
classify compatibility, data migration needs, or runtime breakage. Fieldwork's
Change preview compares real required/optional attendance-note parsers and JSON
contracts against examples, alongside dependencies from both model snapshots.

`tracePath([first, second], input, { snapshot })` executes an explicit sequence
and records its boundary values. Adjacent endpoints must be the same
representation object, as with `compose`; a disconnected or empty path fails
before execution. Each listed conversion runs once, using its ordinary parser
and mapping behavior. A failed step retains the actual error and stops the path,
with preceding steps still available.

```ts
const trace = tracePath(
  [eventExchange.decode, eventExchange.encode],
  incomingJson,
  { snapshot: (value: unknown) => structuredClone(value) },
);
```

The caller chooses snapshots because domain values need not be JSON or
cloneable. Capture independent values if later conversions might mutate earlier
results. The result retains `initial`, per-step `output` snapshots, and a final
`output` snapshot on success. Its `value` is the live final result, typed as
`unknown` because inspection accepts dynamic paths; snapshot types remain
inferred. Snapshot failures propagate separately from conversion failures.
Tracing runs real mappings and does not undo their effects; it is not a dry run.
Nested field conversions and composed conversions retain their normal execution
but are not expanded into additional trace steps.

A trace reports one execution, not a losslessness guarantee. Fieldwork's
Conversion playground compares JSON values without depending on object key
order, then separately checks named domain equality. It shows timestamp/title
normalization, intermediate Date versus string types, and fields omitted by a
public projection. Those observations apply to the supplied example and stated
comparison only.

`asyncOperation` has the same input/output, context, reads, references, and
calls model as `operation`, with asynchronous work in `perform`. Its `run` and
`execute` always return promises. Input validation happens first; output
validation happens after the work resolves. Rejections retain the same
input/perform/output stages and original causes as synchronous operation
failures. Parsers remain synchronous. Graph construction can describe either
operation without executing it.

```ts
const lookupEvent = asyncOperation({
  name: "Look up event",
  input: eventLookup,
  output: eventExchange.encode.to,
  reads: [eventExchange.encode.from],
  calls: [eventExchange.encode],
  async perform({ id }, store: EventStore) {
    const event = (await store.load()).find((event) => event.id === id);
    if (!event) throw new Error("Event not found");
    return eventExchange.encode.convert(event);
  },
});
const payload = await lookupEvent.run({ id: "evt_01" }, eventStore);
```

The context supplies resources and any cancellation policy. Represent does not
add transactions, retries, or cancellation implicitly. `runBatch` remains a
synchronous operation helper.

`numberValue(name, { min, max, integer })` accepts finite JavaScript numbers,
with optional inclusive bounds and an integer constraint. Bounds must be finite
and ordered. It does not coerce strings or promise safe-integer precision.
`booleanValue(name)` accepts only true and false.

`nullable(value)` accepts null or delegates to the wrapped parser. It retains
that parser's missing-field behavior: `nullable(optional(value))` accepts both
null and undefined, while `nullable(numberValue("Reading"))` requires a field.
`presenceOf` follows live nullable wrappers; for a serialized graph, pass a name
resolver as its second argument. Opaque leaves and unresolved/cyclic nullable
chains remain unknown.

`list(value)` parses an ordered array, including empty arrays, and reports
element indexes on failure. Every index is visited; a sparse hole is passed as
undefined to the element parser. Extra non-index array properties are not
retained. `listCodec(codec)` and `nullableCodec(codec)` lift both conversion
directions, retain their graph dependencies, and require opposite shared
endpoints, as does `optionalCodec`. Null bypasses the inner nullable codec; list
conversions preserve order. Ordinary validation still runs at each enclosing
boundary.

See [Sensor Bench](../../examples/sensor-bench/README.md) for an independent CLI
that composes these declarations into telemetry parsing, temperature conversion,
summary output, a wire contract, and a graph. Schema comparison uses explicit
structural comparisons, including numeric constraints and collection references.

`findRoutes(conversions, { from, to, limits? })` discovers simple paths between
**distinct representation objects** without executing conversions. Supply the
runtime conversions explicitly; graph dependencies do not implicitly register
executable edges. Cycles and repeated representations are excluded. For round
trips, use an explicit `tracePath` instead.

```ts
const search = findRoutes(registeredConversions, {
  from: fahrenheit,
  to: celsius,
});
const selection = selectRoute(search); // requires a unique route
// Or: selectRoute(search, fewestSteps), or a named consumer policy.
if (selection.status === "selected") {
  const result = tracePath(selection.route, input, {
    snapshot: (value: unknown) => structuredClone(value),
  });
}
```

`selectRoute` reports `selected`, `ambiguous`, `none`, or `incomplete`. Its
`candidates` retain every discovered route and the policy's score. The default
`uniqueRoute` policy is also exported. A named `RoutePolicy` supplies
`score(route)`: lower finite numbers are preferred and null excludes a route.
Equal best scores remain ambiguous. The built-in `fewestSteps` policy counts
registered conversion steps; a composed conversion is one step. Neither policy
scores nor path lengths imply equivalent results, purity, or losslessness.
Discovery does not validate any input value.

Default limits are 8 steps per path, 32 returned routes, and 2048 search states.
Each limit must be a positive safe integer. Routes are ordered breadth-first,
then by conversion name. `complete: true` means all simple paths in the supplied
registry were considered. `stoppedBy` identifies limits that prevented
finishing; this is conservative when a pruned branch would eventually revisit a
node. Selection refuses to choose from an incomplete search, even if only one
route was found. Increase the relevant limits or narrow the explicit registry.
Duplicate names for distinct representations or conversions are rejected as in
`graph`; passing the same conversion twice is also a duplicate registration.

Sensor Bench's `route` command demonstrates two direct Fahrenheit-to-Celsius
paths: reported precision and an unrounded calculation. Both the default policy
and `fewestSteps` leave them ambiguous. A named precision policy selects a path,
then the existing tracer shows the actual result for the supplied value.

`compareAcceptance({ before, after, samples, copy })` runs two synchronous
representation parsers on labeled values and reports directional evidence:

```ts
const evidence = compareAcceptance({
  before: currentRequest,
  after: proposedRequest,
  samples: [{ label: "Existing request", value: incomingJson }],
  copy: (value: unknown) => structuredClone(value),
});
```

Each sample retains its index, label, captured input, and accepted value or
actual rejection error from each parser. `beforeToAfter` checks samples accepted
by the current parser against the proposed parser; `afterToBefore` reverses that
direction. Each result contains `tested` (source-accepted sample count),
`witnesses` (counterexample indexes), and a status: `counterexamples`,
`no-counterexamples`, or `unexercised`. Invalid samples that neither parser
accepts provide no directional evidence. Empty evidence never becomes a passing
compatibility verdict.

The required `copy` function must preserve values and create independent copies.
It captures input, isolates both parser inputs, and captures accepted outputs.
Copying errors propagate outside parser-rejection handling. Parsers really run;
copies do not isolate effects outside their supplied values. Acceptance evidence
does not compare normalized output values or establish equivalence, purity,
operation success, or universal compatibility.

Fieldwork's editable Change preview combines this API with `compareSchemas`,
generated contracts, dependency queries, and an explicit migration traced
through ordinary conversions. A migration's source and output both retain
validation; structural comparison alone never invents a migration.
