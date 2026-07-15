# Testing philosophy

Testing is a design instrument, not a coverage scoreboard. Executable tests
should make specification clauses concrete and expose whether declared laws,
adapter contracts, and diagnostics survive realistic defects.

## Standards

A good test:

- asserts observable behavior or a declared invariant;
- identifies a realistic regression it would catch;
- survives implementation-only refactoring;
- uses the smallest meaningful execution boundary;
- does not duplicate something TypeScript already guarantees;
- produces useful diagnostics.

Coverage percentage is not a project goal. Semantic coverage is.

Tests must not merely check that a method or symbol name appears in source, that
a file contains a string, that a private helper was called, that implementation
structure matches a snapshot, that trivial getters or constructors exist, or
that arbitrary input does not throw without asserting a meaningful property.

## Review questions

Every test must withstand both questions:

- Could the implementation be wrong while this test still passes?
- Could the implementation be correct after refactoring while this test fails?

## Mutation and adversarial checks

Where practical, validate important tests against deliberately broken
implementations. Useful mutations include dropping a mapped field, swapping
fields, collapsing null and missing, using the wrong identity, reversing
composition order, and omitting affected graph edges from impact analysis.

A surviving mutation is evidence of a missing assertion or undefined semantic
boundary. It is not an invitation to couple the test to private implementation
structure.

## Authority

Tests implement reviewed specification clauses. Implementation agents may not
rewrite valid tests merely to obtain green results. If a test appears wrong,
classify the failure and review the test against its specification before
changing either.
