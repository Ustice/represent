# Agent guide

## Project intent

Represent will be a framework-neutral TypeScript toolkit for describing domain
schemas, multiple representations of the same data, structured conversions,
operations, and a graph of their relationships. From that graph it should
eventually derive adapters, diagnostics, fixtures, mocks, property and contract
tests, adapter certification, impact analysis, documentation, and architecture
visualization.

Algebra is the internal foundation; ordinary APIs and documentation use
approachable terms such as representation, conversion, lossless, projection,
validated, round trip, combine, empty, preserves composition, and equivalent.
Mathematical terminology belongs in architecture or advanced documentation when
it clarifies a guarantee. It must not be required for ordinary use.

## Architectural boundaries

The core owns a neutral intermediate representation, composition machinery,
graph structures, contracts and guarantees, diagnostics, testing tools, and
plugin interfaces. It may carry opaque adapter metadata but must not interpret
it. Target-specific semantics must not leak into the universal core.

Adapters translate the neutral model into artifacts or runtime wrappers owned by
existing libraries. Represent does not replace Prisma's generators, migrations,
or runtime; a GraphQL server; Standard Schema; tRPC; or any other integrated
system.

## Current phase gate

Before every implementation task, read the authoritative current-phase
declaration in [`docs/development-phases.md`](docs/development-phases.md) and
verify that its required README summary agrees. State how the proposed
implementation is permitted by that phase before writing code. If it is not
permitted, stop and identify the phase transition or design decision required to
proceed.

The phase rules are:

- Phase -2: no production code. Implementation is allowed only when needed to
  validate engineering tooling or workflows.
- Phase -1: implementation exists only to clarify, exercise, or make
  specifications executable. It has no product or compatibility status.
- Phase 0: implement the smallest complete vertical slice and assume it is
  disposable. Compatibility must not constrain the design.
- Phase 1 and later: production implementation begins, and compatibility and API
  stability become meaningful constraints.

Changing the current phase requires an architectural review, an accepted ADR,
and an update to both the README and the development-phases document. Do not
infer a phase transition from the presence of implementation code.

## Development order

1. Engineer the engineering system.
2. Write and adversarially review design specifications.
3. Build executable test specifications and adapter certification tools.
4. Implement the smallest core that satisfies those specifications.
5. Iterate until a design blocker appears.
6. When blocked, update specifications and decisions before implementation
   resumes.

Do not optimize for producing library code quickly. No production package should
be created until reviewed specifications justify it.

## Specification ownership

Documents under `docs/specifications/` own normative behavior. ADRs explain why
important choices were made; architecture and principle documents constrain the
solution space; examples supply acceptance cases. If these sources conflict,
stop and record the conflict rather than choosing silently. Implementation and
tests must cite the applicable specification clause once clauses exist.

Changing an implementation does not authorize changing its specification or a
valid test. Never weaken a guarantee silently. Never rewrite a test merely to
make an implementation pass. A test may change only when review establishes that
it conflicts with the specification, asserts the wrong observable behavior, or
is itself defective; record the reason with the change.

## Issue and pull request workflow

Use GitHub issues to preserve the chain from objective to design, specification
clause, ADR, semantic test, implementation issue, and pull request. Follow
[`docs/workflow.md`](docs/workflow.md) and use the forms under
`.github/ISSUE_TEMPLATE/`.

Before implementation begins, verify that the issue links an independently
reviewed design, accepted clauses with stable identifiers, and semantic tests
derived from those clauses. Phase -2 tooling may instead cite the governing
engineering rule, issue acceptance criteria, and workflow validation. If any
required link is missing or ambiguous, return to design work. Do not let
implementation and its test changes silently redefine the owning specification.

Pull requests must report semantic impact and validation evidence using
`.github/PULL_REQUEST_TEMPLATE.md`. Changed files alone are not an adequate
handoff. Prototype discoveries return to design review; code presence does not
grant product or compatibility status.

## Testing standards

A test must follow
[`docs/specifications/testing-and-certification.md`](docs/specifications/testing-and-certification.md).
A good test asserts observable behavior or a declared invariant, names a
realistic regression, survives implementation-only refactoring, uses the
smallest meaningful execution boundary, avoids duplicating TypeScript's static
guarantees, and produces useful diagnostics. Coverage percentage is not a goal;
semantic coverage is.

Where practical, validate important tests against deliberately broken
implementations: dropped or swapped fields, collapsed null and missing values,
wrong identity values, reversed composition order, falsely preserved guarantees,
and omitted impact-analysis edges. A relevant surviving mutation blocks a
complete evidence claim until it is classified and resolved or tracked as a
semantic coverage gap.

Every gate test or cohesive table-driven group records its classification,
owning authority, observable or invariant, oracle, regression caught, smallest
sufficient execution boundary, static/runtime distinction, cases, discrimination
checks, expected diagnostics, and semantic coverage units. The static/runtime
distinction explains TypeScript's insufficiency for a runtime test or identifies
the consumer program and compiler outcome for a compile-time test. Adapter
certification must scope results to the declared adapter, profile, target,
runtime, configuration, capabilities, and suite revision.

Prohibited test patterns include tests that only check:

- that a method, symbol, or string appears in source;
- that a private helper was called;
- that implementation structure matches a snapshot;
- that trivial getters or constructors exist;
- that arbitrary input does not throw without a meaningful property;
- that mocks call other mocks;
- that a coverage number increased;
- behavior already guaranteed by TypeScript alone.

Every test review asks:

- Could the implementation be wrong while this test still passes?
- Could the implementation be correct after refactoring while this test fails?

## Design blocker protocol

Implementation stops when specification clauses conflict, a required invariant
cannot be expressed, an adapter requires target semantics in the core, a law
cannot be tested without invented semantics, a change weakens a guarantee,
ordinary consumer code needs unsafe casts, types harm useful diagnostics, or
multiple valid conversion paths have undefined consistency semantics.

When blocked:

1. Do not add a workaround.
2. Add the smallest failing or explicitly skipped example that demonstrates the
   problem.
3. Record it in `research/open-questions.md`.
4. Create or update an ADR describing alternatives.
5. State the smallest decision required to resume.

Unresolved reviewer disagreements must be recorded in
`research/open-questions.md` or the relevant ADR. Do not erase disagreement by
writing ambiguous consensus language.

## Agent roles and collaboration

Use focused agents when independent expertise or adversarial review improves the
work. Suggested roles are:

- lead/integration agent;
- specification agent;
- algebraic consistency reviewer;
- TypeScript API reviewer;
- adapter feasibility reviewer;
- test-quality reviewer;
- skeptical application-developer reviewer;
- adversarial reviewer.

Roles may be combined for small tasks, but no agent may author a substantial
design and be its only reviewer. The lead owns integration, reconciles evidence,
and records unresolved disagreement rather than forcing agreement.

## Validation and handoff

Use Node.js 22 and pnpm. Before handoff run:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm check
```

A concise handoff states the specification clauses affected, files changed,
commands run and results, guarantees added or changed, unresolved questions, and
the smallest safe next step. It must call out skipped tests, blockers, unsafe
casts, and deviations explicitly.
