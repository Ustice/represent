# Workflow

Use the smallest process that makes the change understandable and trustworthy.
Direct requests can start work; GitHub issues track work that needs a durable
home. Neither routine edits nor investigations need a chain of prerequisite
issues, labels, or approval comments.

## Make progress

1. Understand the outcome and read the relevant phase, specification, and code.
2. Make a small, coherent change. Use disposable examples or prototypes to learn
   within the current phase, and checkpoint useful progress.
3. Test the behavior, review the design, and update documentation affected by
   the change. Run `pnpm check` before handoff.
4. Explain what changed, why, and what the evidence establishes. Mention
   material gaps or the next decision only when there is one.

Design, tests, and implementation can evolve in one issue or pull request. Split
work when it can proceed independently or needs a separate decision. Do not
invent production behavior from an experiment: accepted specifications still own
the guarantees.

## Decisions and review

Routine implementation choices belong with the person doing the work.
Substantial designs need review by someone other than their sole author, such as
a focused agent. Record the decision and rationale in the relevant specification
or PR; use an ADR when a consequential architectural choice needs a lasting
explanation. No prescribed acceptance wording or duplicate review report is
required. Jason decides material tradeoffs, guarantee changes, and phase
transitions; agents should prepare a concrete recommendation and supporting
examples.

A conflict or undefined guarantee blocks only the dependent work. Preserve a
minimal example, alternatives, and the decision needed in the relevant issue or
[open questions](../research/open-questions.md). Continue independent work. An
issue, ADR, skipped test, and research entry are not all required for the same
blocker. Do not hide uncertainty in a workaround or rewrite a valid test to
pass.

## Evidence and integration

Tests should catch plausible defects and survive implementation refactoring.
Semantic tests cite their stable specification clauses; tooling tests explain
the behavior they protect. Let clear test names, fixtures, and assertions carry
that explanation. See the
[testing specification](specifications/testing-and-certification.md) for
discrimination checks and scoped adapter-certification claims.

Use a short PR description: outcome, relevant references, validation, and known
limitations. Follow the repository's configured GitHub protections; request
Jason's decision before merging unless he has already authorized it. A local
handoff uses the same information without a separate file or repeated checklist.

## Unattended automation

The previous custom automation system is retired from the active workflow. Its
[policy](agent-automation-policy.md) points to the historical contract used by
the existing default-off tooling. Ordinary interactive work does not use its
objective approvals, roles, or state machines. Adding unattended execution or
publication requires a separate explicit request and a review of the actual
capability and permissions.
