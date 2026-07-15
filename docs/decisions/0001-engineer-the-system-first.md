# ADR 0001: Engineer the system first

- Status: accepted
- Date: 2026-07-15

## Context

Represent's usefulness depends on precise relationships and guarantees across
schemas, values, operations, adapters, and tests. Implementing attractive APIs
before those semantics are reviewed would let incidental code choices become an
unexamined design.

## Decision

Engineer the repository, specification ownership, testing rules, agent roles,
review process, blocker protocol, and reference acceptance case before
implementing the library. Next, write and adversarially review design
specifications. Build executable specifications and adapter certification tools
before the smallest conforming core.

No production package or schema, representation, or conversion API is created by
this bootstrap.

## Consequences

Early progress is measured by clarity, executable guarantees, useful
diagnostics, and surfaced disagreement rather than exported symbols. The project
may spend longer in design, but implementation should be constrained by reviewed
behavior rather than conversation memory or local convenience.

When implementation exposes an undefined semantic choice, work stops and the
decision returns to specifications and ADRs. This makes design blockers visible
instead of embedding workarounds in the core.
