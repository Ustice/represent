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

## Testing standards

A good test asserts observable behavior or a declared invariant, names a
realistic regression, survives implementation-only refactoring, uses the
smallest meaningful execution boundary, avoids duplicating TypeScript's static
guarantees, and produces useful diagnostics. Coverage percentage is not a goal;
semantic coverage is.

Where practical, validate important tests against deliberately broken
implementations: dropped or swapped fields, collapsed null and missing values,
wrong identity values, reversed composition order, and omitted impact-analysis
edges.

Prohibited test patterns include tests that only check:

- that a method, symbol, or string appears in source;
- that a private helper was called;
- that implementation structure matches a snapshot;
- that trivial getters or constructors exist;
- that arbitrary input does not throw without a meaningful property;
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
