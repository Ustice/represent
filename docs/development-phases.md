# Development phases

This phase model is established by
[ADR 0002: Development phases](decisions/0002-development-phases.md).

This document is the single authority for the current phase. The README badge
and summary must mirror it so the phase is visible at the repository entrypoint.
The governance test fails when those displays disagree.

## Development philosophy

Represent intentionally separates engineering, design, and implementation. Early
implementations are primarily vehicles for learning. The durable assets of the
project are:

- specifications;
- architectural decisions (ADRs);
- semantic tests;
- engineering workflows;
- documented lessons.

Implementation code is expected to evolve or be replaced as understanding
improves. Assume replacement until proven otherwise. Prototype implementations
exist to discover the correct abstractions, not to become production software.

## Phase -2 — Engineer the Engineering System

### Goal

Build the system used to engineer the library, including:

- repository structure;
- agent workflows;
- documentation;
- the ADR process;
- testing philosophy;
- the design review process;
- CI philosophy;
- issue templates;
- project conventions.

### Success criteria

A future ChatGPT or Codex session can continue the project with minimal
dependence on prior conversation. The repository, not chat history, is the
primary source of project knowledge.

No production code is permitted in this phase. Implementation is allowed only
when it is needed to validate engineering tooling or workflows.

## Phase -1 — Engineer the Design

**Current phase**

The project is currently in Phase -1.

### Goal

Produce a coherent semantic model before implementing it.

### Deliverables

- domain concepts;
- a glossary;
- architecture;
- specifications;
- executable semantic tests;
- adapter contracts;
- a graph model;
- documented open questions.

### Success criteria

The semantic model is internally consistent, independently reviewable,
executable as tests, and understandable without implementation.

Implementation may exist only to clarify, exercise, or make specifications
executable. It has no product or compatibility status.

## Phase 0 — Prototype

### Goal

Implement the smallest complete vertical slice. The prototype exists to test
whether the abstractions are pleasant, the graph provides real value, adapters
compose naturally, the testing story holds together, and the project's
assumptions survive contact with implementation.

### Expectations

Prototype code has no compatibility guarantees. Compatibility must not influence
design decisions during this phase. Assume that the implementation is
disposable.

### Promotion review

At the conclusion of Phase 0, conduct a formal architectural review. The review
must choose one of these outcomes:

- replace the implementation, which is the expected outcome;
- salvage selected components;
- promote the implementation into Phase 1.

The review records every prototype component or learned behavior with one
disposition: replace, salvage, or promote. For each item it links the
hypothesis, evidence, affected clauses and tests, unresolved risks, and
compatibility consequence. Salvage identifies the bounded parts retained and
treats all other parts as replaced. Promotion requires strong evidence that
rebuilding would not materially improve the design and independent architectural
approval. Nothing acquires compatibility status merely because it survived a
prototype.

## Phase 1 — Intentional Implementation

Begin the production implementation using what was learned from the prototype.
Compatibility expectations and API stability become meaningful in this phase.

## Project principles

### Engineer the engineering system first

A strong engineering process produces better software than premature
implementation.

### Specifications are more durable than implementations

Implementations may be replaced. Specifications, semantic tests, ADRs, and
documented lessons should survive.

### Prefer semantic coverage over line coverage

Success is measured by preserved behavior and declared guarantees, not by
executed lines.

### Every abstraction must earn its existence

Prefer concrete implementations until at least two independent use cases require
the abstraction.

### Treat design blockers as evidence

When a design blocker is discovered:

1. Stop implementing.
2. Record the blocker.
3. Update the specification.
4. Continue only after the design has been revised.

## Phase transitions

A phase transition requires an architectural review and an accepted ADR that
records the evidence for moving forward. The transition must update the current
phase in this document and in the README. Implementation code appearing in the
repository does not itself change the phase.

The architectural review and ADR use the evidence and acceptance formats in
[`docs/workflow.md`](workflow.md). Phase -2 additionally requires the
[`Phase -2 exit checklist`](phase-minus-2-exit-checklist.md).
