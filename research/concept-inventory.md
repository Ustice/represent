# Concept inventory

> **Status: non-normative research notes**
>
> This document preserves candidate ideas, remembered design directions, and
> useful examples from early project discussions. It is not a specification,
> ADR, compatibility promise, or implementation plan. Nothing here is accepted
> merely because it appears in this file.
>
> Promote an idea into a design issue before turning it into normative clauses
> or implementation work. Concrete examples, counterexamples, independent
> review, and executable evidence remain required.

## Project thesis

Represent is intended to preserve semantic intent while allowing the same
application concepts to appear in many concrete forms.

The project may eventually let teams define domain data and operations once,
connect them through explicit relationships, and derive or coordinate:

- runtime validation;
- value conversion;
- external schemas and definitions;
- fixtures and generated examples;
- mocks and contract tests;
- property tests and law checks;
- adapter certification;
- architecture diagrams;
- path explanations;
- schema-change impact reports;
- CI review evidence.

The algebra should be the internal engine. The graph, diagnostics, testing
tools, and approachable terminology should be the ordinary developer experience.

## Public terminology candidates

Mathematical concepts may support the design without appearing front-and-center
in the public API.

| Approachable term   | Mathematical background or related idea  |
| ------------------- | ---------------------------------------- |
| representation      | object or interpretation                 |
| conversion          | morphism or mapping                      |
| equivalent          | isomorphism-like relationship            |
| lossless            | invertible in the claimed direction      |
| validated           | partial or fallible mapping              |
| projection          | intentionally information-losing mapping |
| round trip          | inverse or retraction law                |
| empty               | identity element                         |
| combine             | associative operation                    |
| preserves combine   | homomorphism law                         |
| preserves pipelines | composition or functoriality             |
| choice              | sum type                                 |
| record              | product type                             |

The vocabulary must remain honest. In particular, a projection should not be
called equivalent, and a validated parse should not be presented as a total
conversion.

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

- **projection**: intentionally loses information;
- **validated**: may reject source values;
- **lossless**: preserves enough information to reconstruct the source within
  the stated domain;
- **equivalent**: both representations round-trip under their stated equality
  and normalization rules.

These labels need precise future definitions. Composition should calculate the
resulting guarantee conservatively rather than preserve the strongest label
optimistically.

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

## Automated issue handling

Candidate automation should follow the repository's reviewed issue workflow
rather than allow an issue event to trigger unrestricted coding.

A conservative progression:

1. **Automated triage**
   - inspect the issue and repository authority;
   - check current phase;
   - classify the work;
   - identify missing prerequisites;
   - post a structured response;
   - recommend the next label or issue type.

2. **Design assistance**
   - only after an explicit human-applied trigger;
   - create a branch and draft PR;
   - update non-production design artifacts;
   - request independent review;
   - stop on ambiguity or blocker.

3. **Implementation assistance**
   - only when phase, accepted clauses, and semantic tests permit it;
   - create a bounded branch and draft PR;
   - never merge automatically at first;
   - return semantic discoveries to design instead of patching around them.

Potential labels include `agent:triage`, `agent:design`, `agent:implement`,
`agent:review`, and `agent:blocked`. These names are only candidates until
separately designed.

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

The Phase 0 prototype should stop after proving one complete vertical slice. It
should then undergo a replace, salvage, or promote review instead of expanding
indefinitely.

## Process principles remembered from discussion

- Assume replacement until proven otherwise.
- Specifications, semantic tests, ADRs, and recorded lessons are more durable
  than prototype code.
- Never duplicate semantics when one artifact can be derived from another.
- Concrete examples outrank elegant theory.
- Every abstraction should earn its existence through at least two independent
  examples.
- Prefer removing abstractions to adding speculative ones.
- A design blocker is evidence, not an inconvenience to patch around.
- TypeScript type sophistication must not destroy compiler performance or
  diagnostic readability.
- The graph and production behavior should come from the same definitions.
- Existing ecosystem tools should remain responsible for what they already do
  well.

## Questions to promote into future design issues

The following topics need bounded design work before they become specifications:

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
- What should the first automated issue-triage contract permit?

These questions are research inventory, not active blockers. Open a design issue
when one becomes the next bounded Phase -1 task.
