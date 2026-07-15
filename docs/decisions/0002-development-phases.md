# ADR 0002: Development phases

- Status: accepted
- Date: 2026-07-15

## Context

Software projects commonly call their earliest implementation "version zero,"
which can make code appear to be the project's first durable asset. For
Represent, premature implementation is especially risky: incidental API and type
choices could harden before the semantic model, guarantees, adapter boundaries,
and testing strategy have been reviewed.

Represent therefore needs explicit stages before a prototype. The stages must
make it clear which artifacts are durable, what implementation is allowed, and
when compatibility becomes a legitimate constraint.

## Decision

Adopt the development phases defined in
[`docs/development-phases.md`](../development-phases.md):

- Phase -2 engineers the engineering system. No production code is permitted;
  implementation may exist only to validate tooling or workflows.
- Phase -1 engineers the design. Implementation may exist only to clarify,
  exercise, or make specifications executable.
- Phase 0 builds the smallest complete vertical-slice prototype. Its
  implementation is assumed to be disposable and has no compatibility
  guarantees.
- Phase 1 begins intentional production implementation. Compatibility and API
  stability become meaningful constraints.

The project starts at Phase -2. Negative phase numbers are intentional: they
make engineering and semantic design explicit prerequisites to version-zero
implementation instead of treating them as informal preparation.

Every implementation task must begin by checking the current phase. A phase
transition requires an architectural review, an accepted ADR, and coordinated
updates to the README and development-phases document. The presence of code does
not imply that a transition occurred.

## Alternatives considered

### Start at Phase 0

Rejected because it would collapse engineering-system work, semantic design, and
prototyping into a single stage and obscure which constraints apply.

### Use release-oriented names

Names such as pre-alpha and alpha were rejected because they describe software
maturity, while the first two phases intentionally precede product software.

### Treat the phases as informal guidance

Rejected because implementation pressure could then bypass the design order. The
phase check is an explicit gate for implementation tasks.

## Consequences

The repository can make visible progress before it contains a library. Reviews
can reject implementation that is premature for the current phase without
implying that implementation is never valuable.

Prototype code receives no accidental compatibility status. Promotion from the
prototype requires evidence that rebuilding would not materially improve the
design; replacement remains the expected outcome.

Phase transitions require deliberate governance work, and the README and phase
document must remain synchronized. This adds process overhead in exchange for a
clear boundary between engineering, design, learning implementations, and
production commitments.
