# Design principles

## Universal meaning in the core

The core contains only concepts whose contracts can be stated independently of a
target framework. Adapter-specific meaning remains in plugins, including when
the core transports it as opaque metadata.

## Guarantees are explicit

Terms such as lossless, projection, validated, round trip, and equivalent must
correspond to documented and testable guarantees. Convenient naming must not
claim a stronger law than the system can verify.

## Composition earns its place

Relationships should compose only when their types, runtime behavior, and
diagnostics remain understandable. Algebra guides this work, but approachable
engineering language guides the public experience.

## Diagnostics are part of behavior

A failure should identify the relationship, path, and violated contract needed
to act. Type-level cleverness that produces unusable errors is a design cost,
not an automatic success.

## Specifications precede production code

Executable tests refine reviewed clauses; implementation satisfies those tests.
Ambiguity returns to design rather than being settled accidentally in code.

## Start with a vertical acceptance case

The User example should exercise meaningful differences across representations
before the project generalizes. It is an acceptance specification, not a reason
to hard-code one application's model.
