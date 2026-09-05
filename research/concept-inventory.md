# Design possibilities

Open product ideas to explore, not settled contracts or an implementation plan.
The [architecture](../docs/architecture.md), [glossary](../docs/glossary.md),
and [conversion specification](../docs/specifications/conversions.md) describe
the current boundaries and vocabulary.

## Domain schemas and representations

Candidate model:

- A domain schema expresses application meaning without assuming Prisma,
  GraphQL, CSV, or another target.
- A representation describes one concrete schema or value shape related to the
  domain concept.
- A representation may expose independent capabilities, such as:
  - structural schema information;
  - Standard Schema validation;
  - value encoding and decoding;
  - equality or normalization;
  - example and arbitrary generation;
  - combine and empty behavior;
  - adapter-owned metadata.
- Standard Schema is a likely validation interoperability capability, not the
  universal structural core.
- The neutral structural model must remain inspectable so schema mappings,
  diagrams, impact analysis, and generated tests can operate on it.

Possible domain constructs include:

- scalar concepts such as string, UUID, email, timestamp, decimal, and
  identifier;
- records or objects;
- choices, enumerations, and discriminated unions;
- arrays and other collections;
- optional and nullable values as distinct concepts;
- entities, generated fields, read-only fields, and views;
- relations, where a future design proves that they belong in the neutral model;
- opaque extension metadata owned and interpreted only by adapters.

Adapters should infer ordinary cases and require explicit strategies where
target semantics diverge. Unsupported constructs should produce actionable
diagnostics rather than silent approximation.

## Schema mappings

Schema relationships may be composable programs over the neutral model rather
than unrelated generators.

Candidate schema transformations include:

- select or omit fields;
- rename fields;
- make fields optional;
- make fields nullable;
- derive create, update, output, public, and export views;
- flatten or nest structures;
- attach target-specific strategies;
- map domain primitives to target primitives;
- map records, choices, collections, and wrappers compositionally.

A schema adapter may provide both:

1. a mapping from neutral schema concepts into a target artifact or builder API;
   and
2. corresponding runtime value mappings.

This allows a timestamp, for example, to map coherently to:

- a GraphQL scalar and an ISO string;
- a Prisma `DateTime` field and JavaScript `Date`;
- a CSV column and formatted text.

The core should provide traversal, composition, diagnostics, and plugin
contracts. Existing target libraries remain responsible for their own generation
and runtime behavior.

## Value conversions

Candidate conversion strengths:

- **projection**: restricts the view; information loss depends on the source
  domain and equality, not field count alone;
- **validated**: may reject source values;
- **lossless**: preserves enough information to reconstruct the source within
  the stated domain;
- **equivalent**: both representations round-trip under their stated equality
  and normalization rules.

The conversion specification defines directional losslessness and projection
loss. Validated conversions, equivalence, and guarantee composition remain open
design questions.

A conversion may declare which behavior it preserves, including:

- empty values;
- combination or concatenation;
- normalization;
- ordering;
- identity;
- composition;
- domain or target round trips.

The library cannot generally prove user-written laws through TypeScript.
Evidence may come from:

- library combinators that preserve guarantees by construction;
- explicit declarations;
- property-based tests;
- deliberately broken implementations;
- adapter certification.

## Representation graph

Representations and conversions naturally form an executable directed graph.

Possible graph capabilities:

- find an explicit conversion path;
- compose the path into a runnable converter;
- explain each intermediate transformation;
- display validation and information-loss boundaries;
- reject ambiguous paths or require a selected policy;
- prefer stronger, safer, or cheaper paths when a reviewed policy exists;
- retain provenance for derived edges;
- detect cycles that claim unsupported round-trip behavior;
- compare direct and indirect paths;
- expose disconnected or dead representations;
- identify duplicate mappings and architectural drift.

The graph may distinguish:

- schema nodes and schema-derivation edges;
- value representations and conversion edges;
- operations and operation mappings;
- artifacts emitted by adapters;
- tests, fixtures, guarantees, and dependencies associated with nodes and edges.

The visualization should be executable documentation rather than an
independently maintained diagram.

## Graph visualization and data lineage

A developer should be able to inspect a node or edge and see information such
as:

- kind of representation;
- fields added, removed, renamed, flattened, or synthesized;
- validation boundaries;
- declared guarantees;
- invertibility and normalization rules;
- adapter ownership;
- affected operations and tests;
- data classifications such as public, internal, personal, or secret;
- downstream paths through which sensitive data may flow.

Possible outputs include:

- JSON graph data;
- Mermaid or Graphviz diagrams;
- interactive HTML;
- IDE navigation;
- PR impact summaries;
- architecture documentation.

## Operations

A domain operation may be represented as structured behavior rather than only a
function.

Candidate operation information includes:

- name and description;
- input schema;
- output schema;
- explicit error or result choice;
- context requirements;
- declared effects;
- executable implementation when one exists;
- authorization or policy requirements;
- observability metadata.

An operation might then be represented through adapters as:

- a GraphQL resolver or field contract;
- a tRPC procedure;
- an HTTP handler;
- a service or class method;
- a command-line command;
- a queue or event handler.

The core should not implement those frameworks. Adapter plugins should translate
the operation contract into the target's wrappers, builders, or generated
definitions.

GraphQL deserves special caution because resolver behavior includes parent
values, arguments, context, selection sets, nested field resolution, null
propagation, batching, subscriptions, and directives. A first adapter should
likely generate contracts and wrappers rather than arbitrary resolver business
logic.

## Operation mappings and operation transformations

Two related higher-order ideas should remain distinct:

1. **Representing an operation in another system**
   - domain operation to tRPC procedure;
   - domain operation to GraphQL resolver contract;
   - domain operation to service method.

2. **Transforming one operation into another**
   - require authentication;
   - add authorization;
   - wrap in a transaction;
   - add retries or caching;
   - add tracing and audit logging;
   - normalize inputs;
   - redact outputs;
   - expand the error set or context requirements.

A lawful operation adapter should preserve meaningful operation composition.
Public documentation may describe this as preserving operation pipelines rather
than requiring category-theory vocabulary.

Error mappings are likely to be a major adapter concern. The same domain error
choice may become:

- a GraphQL result union or execution error;
- a tRPC error code;
- an HTTP status and body;
- a typed `Result` from a service method.

## Plugin and adapter system

The core should be a typed intermediate representation and plugin system, not a
universal replacement for ecosystem tools.

Candidate plugin capabilities:

- schema target;
- value target;
- operation target;
- validation provider;
- fixture or arbitrary provider;
- visualization decorator;
- certification profile;
- import or export support.

A plugin may implement only the capabilities that make sense.

Examples:

- Standard Schema plugin: validation capability;
- Prisma plugin: schema fragments, mappings, and value relationships;
- GraphQL SDL plugin: emitted SDL and resolver contracts;
- Pothos or Nexus plugin: builder definitions;
- tRPC plugin: operation mappings;
- CSV plugin: layouts and value codecs;
- Mermaid plugin: visualization;
- fast-check plugin: property generators.

The core may preserve opaque plugin metadata but must not interpret
target-specific meaning.

## Fixtures and examples

Fixtures should describe one conceptual value across representations instead of
being independently maintained factories.

Possible API behavior:

- create a deterministic domain example from a seed;
- derive fixtures along valid graph paths;
- request the fixture as Prisma, GraphQL, CSV, or another representation;
- retain provenance showing where values were synthesized, removed, normalized,
  or renamed;
- refuse reverse derivation through a lossy projection;
- generate readable examples separately from broad arbitrary values.

Useful distinctions:

- **example**: deterministic and readable;
- **fixture**: representation-specific valid test data;
- **arbitrary**: generated data for quantified properties;
- **invalid case**: a targeted violation of one schema or conversion obligation.

## Mocks and contract tests

Structured operations could derive typed mock behavior such as:

- successful output;
- each declared error case;
- a sequence of outcomes;
- a user-supplied typed implementation;
- adapter-shaped resolver or procedure mocks.

One behavioral contract could run against multiple surfaces:

- direct domain execution;
- GraphQL execution;
- tRPC caller;
- service method;
- HTTP harness.

The same contract should test whether adapters preserve the intended operation
behavior.

## CRUD and stateful testing

Entity-like schemas and operations may support reusable CRUD contracts,
including:

- create then read returns an equivalent value;
- generated fields are populated;
- updates alter only permitted fields;
- omitted update fields remain unchanged;
- delete makes future reads fail in the declared way;
- uniqueness constraints reject duplicates;
- optional and nullable values remain distinct;
- identifiers remain stable across representations.

More advanced stateful property testing could generate command sequences and
compare:

- an in-memory reference model;
- the real implementation or adapter harness.

This may reveal bugs that isolated tests miss, such as stale writes, invalid
transitions, and inconsistent projections after mutation.

## Boundary-case generation

The structural schema can generate targeted semantic partitions rather than
random noise.

Candidate partitions include:

- missing, `undefined`, `null`, and present;
- empty, minimum, maximum, and over-maximum strings;
- empty, singleton, and many-element collections;
- each choice or union variant;
- generated and read-only fields;
- valid and invalid identifier formats;
- ordering and normalization boundaries;
- flattening and nesting conflicts.

A representation-aware test system should make target differences visible. For
example, missing may map differently to GraphQL omission, Prisma `undefined`,
CSV empty cells, and absent JSON properties.

## Semantic tests and law checks

Testing is intended to define and protect semantics rather than chase line
coverage.

Candidate generated checks include:

- domain round trips;
- representation round trips under normalization;
- preservation of empty and combine behavior;
- agreement between direct and composed paths;
- rejection of false guarantee claims;
- fixture validity against representation schemas;
- adapter handling of unsupported neutral constructs;
- consistency between generated schema artifacts and runtime mappings.

Important properties should be tested against deliberately broken subjects,
including:

- dropped fields;
- swapped fields;
- collapsed nullish states;
- wrong empty values;
- reversed composition;
- falsely preserved guarantees;
- missing impact dependencies.

The testing utilities should eventually be used to build and certify Represent
itself.

## Adapter certification

Third-party adapters may be certified against reusable core obligations plus
adapter-owned target profiles.

A certification declaration should remain scoped to:

- adapter version or revision;
- profile version or revision;
- external target and runtime versions;
- relevant configuration;
- claimed capabilities;
- suite revision;
- fixture and arbitrary domains.

Certification should distinguish:

- pass;
- fail;
- skip with reason;
- unsupported;
- semantic gap;
- harness error.

A passing certification is evidence for the declared combination, not a
universal badge.

## Impact analysis

Impact reporting may be one of the project's strongest practical features.

Given a schema, representation, guarantee, adapter, or operation change, the
graph could report:

- directly changed nodes and edges;
- downstream representations;
- affected conversions and paths;
- affected operations;
- fixtures and generators requiring regeneration;
- semantic tests and certification obligations;
- generated artifacts;
- places where explicit mapping decisions are required;
- unrelated nodes confirmed unaffected.

Example shape:

```text
Changed
  Domain.User.email: required -> optional

Affected
  Domain -> CSV conversion
  GraphQL CreateUserInput
  Prisma create mapping
  User fixture generator
  Domain/CSV round-trip property

Unaffected
  User.id
  User.createdAt
  Public.User projection

Review required
  CSV encoding for missing email
```

Impact should be derived from the semantic graph, not maintained as a separate
dependency system.

## CI and review integration

Possible future CI outputs:

- representation graph coverage by obligation;
- changed semantic nodes and edges;
- affected tests and adapter profiles;
- newly untested paths;
- conflicting conversion paths;
- changed guarantees;
- review-required decisions;
- a machine-readable impact artifact and a concise PR comment.

A PR report should explain semantic impact rather than only list files changed.

## Initial vertical slice

The first prototype should remain deliberately small and awkward enough to
expose real design problems.

Candidate `User` concept:

- `id`;
- `email`;
- `displayName`;
- `status`;
- `createdAt`.

Candidate representations:

- domain user;
- Prisma user;
- GraphQL user;
- public user projection;
- CSV user export.

Important differences to exercise:

- `Date` versus ISO string;
- field renaming;
- generated fields;
- optional versus nullable;
- dropped private fields;
- CSV headers and document composition;
- one reversible relationship;
- one validated relationship;
- one lossy projection;
- direct and indirect paths;
- a schema change with a meaningful impact report.

## Open design questions

- What is the smallest neutral schema vocabulary?
- Are entities and relations universal concepts or adapter strategies?
- What precisely distinguishes projection, validated, lossless, and equivalent?
- How are equality and normalization attached to representations?
- How are conversion guarantees composed?
- When may the graph choose a path automatically?
- How are conflicting paths detected and compared?
- Which algebraic structures belong on a representation, an operation, or a
  selected behavior?
- How do schema mappings and value mappings stay synchronized?
- What is the minimal operation model?
- How are errors, context requirements, and effects represented?
- What belongs in operation mappings versus operation transformations?
- What plugin capabilities are universal enough for the core?
- How should graph provenance and derived edges be represented?
- What is the minimum useful impact-report model?
- What testing APIs can remain runner-neutral?
- How should fixtures preserve provenance and reject impossible reverse
  derivations?
