# Glossary

This glossary records working language, not settled API names. Normative
definitions belong in future specifications.

**Adapter**: A plugin that translates Represent's neutral model into artifacts
or wrappers for another system without replacing that system.

**Combine**: An approachable term for an associative way of joining compatible
values or operations.

**Conversion**: A structured transformation from one representation to another,
with explicit guarantees and diagnostics.

**Domain schema**: A description of application-level data and constraints,
independent of a particular storage or transport system.

**Empty**: An approachable term for an identity value used with a combine
operation.

**Equivalent**: A declared relationship whose exact laws must be specified;
never a synonym for vaguely similar.

**Lossless**: A conversion guarantee indicating that specified information is
preserved. The relevant information and reverse-path law must be explicit.

**Neutral structural model**: The target-independent intermediate description
understood by the core.

**Operation**: Domain behavior with described inputs, outputs, and possibly
effects or guarantees.

**Projection**: A deliberately lossy view that omits or coarsens declared
information.

**Representation**: One concrete shape or interpretation of a domain concept.

**Round trip**: A composition of forward and reverse conversions with an
explicit equality or equivalence expectation.

**Semantic graph**: The connected model of schemas, representations,
conversions, operations, guarantees, and adapter artifacts.

**Validated**: A guarantee that a value has passed a declared validation
boundary and carries the meaning defined by that boundary.
