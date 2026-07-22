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

Use [`template.md`](template.md) for new specification areas and preserve the
review record in the repository or link the durable GitHub acceptance record.

Implementation and tests should reference clause identifiers. If a needed
behavior has no clause, refine the specification before coding it.
