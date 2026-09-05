# Design specifications

This directory owns normative, reviewable statements of Represent's observable
behavior and guarantees. Draft specifications are not accepted authority until
their required independent review is recorded.

Current specifications:

- [Conversion guarantees](conversions.md) is the accepted specification for
  directional, scoped losslessness and collision evidence for projection-related
  information loss.
- [Testing and certification](testing-and-certification.md) defines semantic
  test quality, discrimination checks, adapter certification, and semantic
  coverage for the engineering system.

Specifications should give clauses stable identifiers, define relevant terms and
equality notions, include examples and counterexamples, state expected
diagnostics, identify executable tests, and list unresolved questions. A
substantial specification requires a reviewer other than its sole author.

The [template](template.md) is an optional starting point. Keep review decisions
with the specification or link the relevant PR or issue discussion; no separate
acceptance form is required.

Implementation and tests should reference clause identifiers. If a needed
behavior has no clause, use examples to clarify it before treating it as
accepted behavior. Experiments remain subject to the current phase.
