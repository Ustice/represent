# Represent core

The first API has four operations: `representation`, `conversion`, `compose`,
and `graph`. See the [consuming model](../../examples/member-desk/src/model.ts)
for the complete working example.

A representation pairs a name with a parser. A conversion connects two
representations and a typed mapping. `convert(value)` checks the source type at
compile time; `run(input)` accepts external `unknown`. Both validate the source,
run the mapping, and validate the target. Failures identify the edge, stage,
representation, and underlying error.

`compose(first, second)` explicitly connects edges sharing the same intermediate
representation object. Each edge runs its own parsers, including the
intermediate boundary on both sides; parser transformations must account for
that. `graph` returns names and directed edges from the registered conversions.
It rejects ambiguous duplicate names and does not choose routes or infer
guarantees.

This is a value-conversion experiment. Structural schema derivation, automatic
adapters, operation graphs, certification, and impact analysis are not
implemented.
