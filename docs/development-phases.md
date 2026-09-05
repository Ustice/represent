# Development phases

This document owns the current phase; the README badge and summary must agree.
The phase model comes from [ADR 0002](decisions/0002-development-phases.md).

## Phase -1 — Engineer the Design

**Current phase**

The project is currently in Phase -1.

Develop the semantic model, specifications, and executable examples. Code may
clarify, exercise, or make specifications executable; it has no product or
compatibility status. Engineering tooling is also permitted. No production
package or stable public API is authorized by this phase.

The design should be internally consistent, independently reviewable, executable
as tests, and understandable without relying on an implementation.

## Other phases

| Phase                                | Purpose                                                                                                           | Implementation status                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| -2 — Engineer the Engineering System | Establish the repository and working practices. Completed; see [ADR 0003](decisions/0003-enter-phase-minus-1.md). | Tooling to validate engineering workflows only; no production code. |
| 0 — Prototype                        | Exercise the smallest complete vertical slice.                                                                    | Disposable; compatibility must not constrain design.                |
| 1 — Intentional Implementation       | Build production software from the reviewed design and prototype evidence.                                        | Compatibility and API stability become meaningful commitments.      |

## Changing phase

A phase transition requires Jason's decision, an independent architectural
review, and an accepted ADR explaining the evidence. Update this declaration and
the README together. The presence of code does not change the phase.

Before Phase 1, review the prototype and decide what to replace, salvage, or
promote. Replacement is the default; retaining code requires evidence that
rebuilding would not materially improve the design. Record retained scope,
remaining risks, and the compatibility commitments being introduced.
