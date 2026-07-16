# ADR 0003: Enter Phase -1

- Status: accepted
- Date: 2026-07-15
- Objective: [#2](https://github.com/Ustice/represent/issues/2)
- Owning issue: [#4](https://github.com/Ustice/represent/issues/4)

## Context

ADR 0001 requires the engineering system to precede semantic design, and ADR
0002 requires an architectural review plus an accepted ADR before a phase
transition. Issue #4 exercised the repository-only continuity drill and turned
every material gap into Phase -2 work.

The evidence is the
[`Phase -2 exit checklist`](../phase-minus-2-exit-checklist.md), the
[`continuity-drill record`](../../research/continuity-drill-2026-07-15.md), the
workflow validation test, the Node 22 local gate, and the pull request's Node 22
CI result. Each gate is now recorded and passing.

## Decision

Enter Phase -1 — Engineer the Design. Every exit-checklist item is complete.
Phase -1 authorizes reviewed semantic design and implementation only when it
clarifies, exercises, or makes specifications executable. It does not authorize
production packages, compatibility commitments, or a stable public API.

The first Phase -1 task must be a bounded design issue that selects one deferred
semantic question or another explicitly reviewed design objective. This ADR does
not choose that question or invent its answer.

## Alternatives considered

### Remain in Phase -2 indefinitely

Rejected after the continuity and validation evidence passes because Phase -2 is
a gate with explicit exit criteria, not a permanent preference for process work.
New engineering-system defects may still return work to that system without
erasing the phase transition.

### Enter Phase 0

Rejected because no coherent semantic model or executable product specification
exists. Skipping Phase -1 would violate ADR 0001 and ADR 0002.

### Select the first semantic design in this ADR

Rejected because the transition decision does not own product semantics. A
separate design issue and independent review must establish that priority.

## Consequences

Design specifications, examples, counterexamples, glossary work, and executable
semantic tests become the next measure of progress. Any executable code remains
non-product evidence used only to clarify or exercise specifications. Phase 0
and production implementation remain prohibited.

The README and authoritative current-phase declaration must change together when
this ADR is accepted. The governance test protects that synchronization.

## Review evidence

- Reviewer: Independent adversarial governance reviewer
- Outcome: accepted
- Evidence reviewed: `docs/phase-minus-2-exit-checklist.md`,
  `research/continuity-drill-2026-07-15.md`,
  `tests/governance/continuity.test.ts`, Node 22 local gate, and
  [PR #8 CI](https://github.com/Ustice/represent/actions/runs/29470230680)
- Unresolved disagreements: None
- Accepted on: 2026-07-15
