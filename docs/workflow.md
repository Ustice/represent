# Workflow

GitHub issues are the traceable bridge from project intent to reviewed design,
semantic tests, implementation, and evidence. Chat history is not part of the
chain of authority.

Autonomous agent decision rights and execution are governed by the
[agent automation policy](agent-automation-policy.md).

## Traceability convention

Every design and implementation issue links to a project objective issue. Use
the following references wherever the artifacts exist:

| Artifact               | Reference format                                        |
| ---------------------- | ------------------------------------------------------- |
| Objective              | GitHub issue, for example `#2`                          |
| Design or blocker      | GitHub issue                                            |
| Normative behavior     | Stable specification clause, for example `REP-CONV-001` |
| Consequential decision | ADR number and link                                     |
| Executable guarantee   | Test path and test name                                 |
| Implementation         | Bounded issue and pull request                          |

Specification clause identifiers use `REP-<AREA>-NNN`, are unique across the
repository, and remain stable when headings move. Tests cite their owning clause
identifier in the test name or an adjacent description.

Semantic and contract tests also follow the test-case record in `REP-TEST-008`.
Reviews use the discrimination strategy and coverage model in
[`docs/specifications/testing-and-certification.md`](specifications/testing-and-certification.md).

Do not create placeholder artifacts merely to fill the chain. Write
`None — reason` when an artifact does not apply. A pull request reports the
complete chain in `.github/PULL_REQUEST_TEMPLATE.md` so reviewers can inspect
semantic impact without reconstructing it from changed files.

## Issue types

Use the smallest issue type that owns the current uncertainty:

- An **objective issue** describes a durable project outcome and evidence of
  progress. It may remain open across many design and implementation issues.
- A **design issue** owns one intended behavior or design question, examples and
  counterexamples, alternatives, semantic impact, and independent review. It
  produces or revises specification clauses and, for consequential choices,
  ADRs.
- An **implementation issue** owns bounded work against accepted clauses and
  semantic tests. It cannot invent behavior.
- A **design-blocker issue** stops active implementation and exposes the minimal
  example, alternatives, affected guarantees, and smallest decision needed to
  resume.

Keep design, tests, and implementation in one issue only when the work remains a
small reviewed unit with no stage boundary or independent scheduling value.
Split them when they need different reviewers, can proceed independently, have
different blockers, or when accepting design and accepting implementation are
meaningfully separate decisions. Even in one issue, design review must finish
before implementation begins. Separate test work when it can be reviewed or
scheduled independently; otherwise tests and implementation may share one
bounded implementation issue.

## Design lifecycle

1. State one intended behavior or design question and link its objective.
2. Link existing specifications, ADRs, constraints, and prior issues.
3. Record concrete examples, counterexamples, alternatives, and semantic impact.
4. Obtain review from someone other than the sole author of a substantial
   design.
5. Record unresolved disagreement in `research/open-questions.md` or the
   relevant ADR rather than hiding it in compromise wording.
6. Create or update stable specification clauses and any required ADR.
7. Derive executable semantic tests from the accepted clauses.

Before a test becomes an implementation gate, its author or test reviewer
records:

```text
Test case: <behavioral name>
Classification: <semantic | compile-time contract | workflow validation>
Owning authority: <REP-AREA-NNN, contract, or Phase -2 rule>
Observable/invariant: <consumer-visible behavior>
Oracle/equality: <comparison and equality notion>
Regression caught: <plausible broken behavior>
Execution boundary: <smallest sufficient boundary>
Static/runtime distinction: <runtime insufficiency or compile-time consumer program and compiler outcome>
Cases: <applicable examples, counterexamples, or generated domains>
Discrimination: <mutation IDs or broken subjects, or impractical reason>
Expected diagnostics: <semantic content or None — reason>
Semantic coverage: <nodes, edges, paths, laws, capabilities>
```

The record may live beside the test or in a linked semantic-test issue. A test
that cannot complete the record is exploratory evidence or a tracked semantic
coverage gap, not an implementation gate.

After review, the independent reviewer posts this acceptance record on the
design issue:

```text
Design review outcome
Reviewer: <person or focused agent role>
Outcome: Accepted | Changes requested | Blocked
Decision: <accepted decision or smallest requested change>
Specification clauses: <identifiers and links, or None — reason>
Semantic tests: <path and test name, linked test issue, or None — reason>
Unresolved disagreements: <links, or None — reason>
```

Only `Outcome: Accepted` makes the design ready for dependent implementation.
Later review supersedes an earlier record only when it links the earlier comment
and explains what changed. A design issue may close when its accepted decision
and review are recorded, its clauses have stable identifiers, its semantic tests
exist or are tracked in a linked test issue, and remaining questions are linked
explicitly.

## Implementation readiness and lifecycle

An implementation issue is ready only when:

- the current development phase permits the proposed implementation;
- a linked, independently reviewed design issue authorizes the behavior;
- accepted specification clauses with stable identifiers own every guarantee in
  scope;
- semantic tests derived from those clauses exist; and
- scope, non-goals, expected diagnostics, and closure evidence are explicit.

For tooling used only to validate the engineering system in Phase -2, cite the
engineering rule and issue acceptance criteria in place of a product
specification clause, and cite workflow validation in place of a semantic test.
This exception does not authorize product behavior or waive independent review
of a substantial process design.

Phase -2 does not permit product implementation. Phase -1 permits implementation
only to clarify, exercise, or make specifications executable. Later work must
apply the phase rules in `docs/development-phases.md` rather than infer
permission from the existence of an implementation issue template.

After readiness is established:

1. Implement the minimum behavior required by the cited tests.
2. Run focused tests, then the full semantic suite and repository gate.
3. Perform adversarial review, including deliberately broken implementations
   where practical.
4. Classify failures as implementation defects, test defects, specification
   ambiguities, or design blockers.
5. Fix implementation defects locally. Change a test only after review shows
   that it conflicts with its specification, asserts the wrong observable
   behavior, or is itself defective; record that reason.
6. Return ambiguities to design and stop for design blockers. Do not patch
   around either one.

The adversarial review must report relevant baseline mutation results using the
obligation matrix in `REP-TEST-012`. A surviving mutation is classified as a
weak assertion, invalid mutation, undefined semantic boundary, or tooling
defect. It blocks a complete evidence claim until resolved or linked as an
explicit gap.

An implementation issue may close only when its pull request links the complete
traceability chain, cited clauses and semantic tests pass, focused and full
validation results are recorded, semantic impact and limitations are stated, and
no unlinked blocker or reviewer disagreement remains. The pull request uses
`Resolves #N` for the bounded implementation issue it completes; it links rather
than closes the longer-lived objective and design issues.

Normative specification changes and the implementation that depends on them must
not be accepted as one unreviewed step. If implementation reveals a needed
guarantee change, pause it and return to the design lifecycle. A combined pull
request is acceptable only when the normative change receives explicit
independent design approval before implementation approval.

## Design blockers

Design blockers stop implementation. Preserve the smallest failing or explicitly
skipped example and open the design-blocker issue first. Then link that issue
from `research/open-questions.md`, create or update an ADR with the alternatives
and affected guarantees, and add both links back to the issue. Work resumes only
after the smallest required decision is reviewed and the owning specification is
made unambiguous.

## Prototype learning

Phase 0 prototype work tests hypotheses; it does not create product-feature or
compatibility commitments. A design issue titled `Prototype learning:` owns the
hypothesis, evidence sought, observations, and conditions for stopping or
replacing the prototype. A linked implementation issue owns any bounded,
disposable prototype code that the accepted learning plan authorizes.

When a prototype reveals ambiguity or a new guarantee, open or return to a
design issue and feed the evidence back into Phase -1 specification review. Do
not promote prototype behavior into a specification merely because code exists.
Prototype completion means the learning and feedback links are recorded, not
that a feature shipped.

Before Phase 1, the promotion review inventories each prototype component and
learned behavior. Each receives exactly one disposition:

- **Replace:** discard the implementation while carrying reviewed evidence back
  to specifications and tests.
- **Salvage:** identify the bounded parts retained, justify them independently,
  and treat everything else as replaced.
- **Promote:** link strong evidence that rebuilding would not materially improve
  the design and state the compatibility commitment that begins.

The record links hypotheses, affected clauses, semantic tests, mutation or
certification evidence, unresolved risks, and the independent architectural
review. Code presence or test passage alone is not promotion evidence.

## Architectural and phase-transition review

An architectural review is accepted only when a reviewer other than the sole
author of the substantial change records:

```text
Architectural review outcome
Reviewer: <person or independent agent role>
Outcome: Accepted | Changes requested | Blocked
Decision: <bounded decision or smallest requested change>
Evidence reviewed: <exit checklist, clauses, tests, drills, and validation>
Affected ADR: <number and link>
Unresolved disagreements: <links, or None — reason>
```

A phase-transition ADR remains proposed until this record exists. It links every
applicable exit criterion, the validation runtime, deviations, and remaining
limitations. Acceptance updates the authoritative phase declaration and its
README summary together; a governance test verifies they remain synchronized.

## Adapter-certification evidence

Adapter-certification evidence identifies the adapter, certification profile,
target and runtime versions, semantic configuration, declared capabilities,
suite revision, input domains, and every pass, fail, skip, unsupported, gap, or
harness-error result. Certification remains scoped to that declaration and
separates universal obligations from target-owned extensions.

A claimed capability cannot pass certification by being omitted or marked
unsupported. A harness error is not a semantic failure, but it prevents a
passing result. Substantial certification profiles and test strategies require
independent test-quality review in addition to the design review that owns their
semantic contracts.

## Integration and handoff

At integration, run the repository validation gate, request a reviewer who did
not solely author the design, and use the pull request template to report the
traceability chain, guarantees changed, evidence collected, unresolved
questions, deviations, and next safe step. For work without a pull request, use
[`docs/handoff.md`](handoff.md). Every handoff also inventories the
intentionally changed files.
