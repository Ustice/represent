# Testing philosophy

Testing is a design instrument, not a coverage scoreboard. Executable tests
should make specification clauses concrete and expose whether declared laws,
adapter contracts, and diagnostics survive realistic defects.

The normative requirements, test-case record, mutation catalog, certification
rules, and semantic coverage model are defined by
[`REP-TEST-001` through `REP-TEST-025`](specifications/testing-and-certification.md).
This document explains the intent behind those requirements.

## Standards

A good test:

- asserts observable behavior or a declared invariant;
- identifies a realistic regression it would catch;
- survives implementation-only refactoring;
- uses the smallest meaningful execution boundary;
- does not duplicate something TypeScript already guarantees;
- produces useful diagnostics.

Each gate test or cohesive table-driven group records its classification, owning
authority, observable or invariant, oracle, regression caught, execution
boundary, static/runtime distinction, cases, discrimination checks, expected
diagnostics, and semantic coverage units. The distinction explains why static
checks are insufficient for a runtime test or identifies the consumer program
and compiler outcome for a compile-time test. That record may live beside the
test or in a linked issue, but it must survive beyond chat history.

Coverage percentage is not a project goal. Semantic coverage is.

Tests must not merely check that a method or symbol name appears in source, that
a file contains a string, that a private helper was called, that implementation
structure matches a snapshot, that trivial getters or constructors exist, or
that arbitrary input does not throw without asserting a meaningful property,
that mocks call mocks, or that a coverage number increased. An exception exists
only when the inspected artifact is itself a reviewed public output.

Focused semantic assertions are the default. Snapshots are appropriate only for
narrow projections of reviewed public artifacts, with nondeterministic data
removed, important invariants asserted directly, and the meaning of a diff
visible to reviewers. A broad internal-object snapshot is not an oracle.

## Review questions

Every test must withstand both questions:

- Could the implementation be wrong while this test still passes?
- Could the implementation be correct after refactoring while this test fails?

## Mutation and adversarial checks

Where practical, validate important tests against deliberately broken
implementations. Useful mutations include dropping a mapped field, swapping
fields, collapsing null, undefined, and missing, using the wrong identity,
reversing composition order, falsely preserving a guarantee, and omitting
affected graph edges from impact analysis.

A surviving mutation is evidence of a missing assertion or undefined semantic
boundary. It is not an invitation to couple the test to private implementation
structure.

Adapter certification applies the same principle to a declared adapter profile,
target version, runtime, configuration, capability set, and suite revision. A
passing suite is scoped evidence, not a universal badge. Universal neutral-model
obligations remain separate from target-specific contract extensions owned by
the adapter.

Semantic coverage inventories nodes, edges, significant paths, laws, and
declared capabilities. Each unit links to evidence or an explicit gap. Counts
may summarize that inventory, but combining unlike obligations into one
percentage would hide rather than explain risk.

## Authority

Tests implement reviewed specification clauses. Implementation agents may not
rewrite valid tests merely to obtain green results. If a test appears wrong,
classify the failure and review the test against its specification before
changing either.
