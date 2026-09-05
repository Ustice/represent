# Represent core

The API has five operations: `representation`, `conversion`, `codec`, `compose`,
and `graph`. See the [consuming model](../../examples/member-desk/src/model.ts)
for the complete working example.

A representation pairs a name with a parser. A conversion connects two
representations and a typed mapping. `convert(value)` checks the source type at
compile time; `run(input)` accepts external `unknown`. Both validate the source,
run the mapping, and validate the target. Failures identify the edge, stage,
representation, and underlying error.

`codec({ name, from, to, encode, decode })` declares two mappings with shared
endpoints. It returns `encode` and `decode` conversions named `name: encode`
and `name: decode`. Both support `convert` and `run`, composition, and graph
registration just like a standalone conversion:

```ts
const payload = memberExchange.encode.convert(member);
const restored = memberExchange.decode.run(incomingJson);
const publicRoute = compose(memberExchange.encode, toPublic);
const connections = graph([memberExchange.encode, memberExchange.decode]);
```

A codec does not assert that its directions are inverses. Either can fail or
normalize values; the Member desk codec restores dates but canonicalizes
timestamp spelling. Round-trip guarantees still require scoped evidence.

`compose(first, second)` explicitly connects edges sharing the same intermediate
representation object. Each edge runs its own parsers, including the
intermediate boundary on both sides; parser transformations must account for
that. `graph` returns names and directed edges from the registered conversions.
It rejects ambiguous duplicate names and does not choose routes or infer
guarantees.

This is a value-conversion experiment. Structural schema derivation, automatic
adapters, operation graphs, certification, and impact analysis are not
implemented.
