# Phase -2 exit checklist

This checklist is the required evidence gate for leaving Phase -2. The
authoritative phase remains in `docs/development-phases.md`; completing this
document does not itself change phases.

## Required evidence

- [x] Project intent, non-goals, and the core/adapter boundary are discoverable
      in `README.md`, `docs/vision.md`, `docs/architecture.md`, and
      `research/rejected-designs.md`.
- [x] `docs/development-phases.md` is the single current-phase authority and the
      README exposes its synchronized summary.
- [x] `AGENTS.md` defines focused roles and prohibits sole-author review of a
      substantial design.
- [x] ADR, specification, issue, blocker, architectural-review, pull-request,
      and handoff formats exist.
- [x] `REP-TEST-001` through `REP-TEST-025` reject implementation-detail,
      source-inspection, vacuous, and coverage-only tests except when a reviewed
      public artifact is itself the observable.
- [x] Node 22, pnpm 11, local validation commands, CI philosophy, and the CI
      workflow are documented.
- [x] The objective-to-issue-to-clause-to-test-to-implementation-to-PR chain is
      defined in `docs/workflow.md` and the GitHub forms.
- [x] Prototype replace, salvage, and promote dispositions require explicit
      evidence and independent review.
- [x] The repository-only continuity drill has a reusable prompt and recorded
      result.
- [ ] The full local gate passes on Node 22 and the PR's Node 22 CI run passes.
      Local evidence: Node 22.23.1 and pnpm 11.13.0, one test file and four
      governance tests passed. PR CI remains pending.
- [x] An independent post-remediation continuity drill finds no material gap.
      The repository-only continuation reviewer recorded `continuity succeeds`.
- [x] An independent architectural review accepts Phase -2 exit. The adversarial
      governance reviewer accepted exit subject only to the expected PR CI
      precondition.
- [ ] A phase-transition ADR is accepted and updates the authoritative phase and
      README summary together.

## Evidence rules

Checkboxes link to repository artifacts or recorded command output. External
issue or pull-request evidence must use a durable URL. A criterion is incomplete
when evidence exists only in chat history, when validation used an unsupported
runtime, or when a reviewer cannot reproduce the conclusion from the repository.

New material gaps return the checklist to Phase -2 work. The transition ADR may
be drafted while review proceeds but remains proposed until every checkbox is
complete.
