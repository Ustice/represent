# Continuity drill — 2026-07-15

## Method

An independent agent received only the repository and the seven questions now
preserved in `prompts/continuity-drill.md`. A separate adversarial reviewer
tested the candidate Phase -2 exit criteria. Neither reviewer edited files.

## Initial result

The agent correctly recovered the project purpose and boundaries, current Phase
-2 restrictions, design-blocker protocol, test-quality standard, unresolved
questions, and relevant ADRs. It proposed CI validation as the next bounded task
without inventing product semantics. Continuity therefore worked for ordinary
orientation but failed the Phase -2 exit gate because material governance
evidence was missing.

## Material gaps found

- No Phase -2 exit checklist or preserved continuity-drill prompt/result.
- CI philosophy and workflow were absent, and validation had not been
  demonstrated under Node 22.
- The README status was stale after acceptance of the testing specification.
- The testing specification declared itself accepted while its final section
  still described acceptance as future work.
- Architectural review, transition-ADR acceptance, prototype salvage/promotion,
  and non-PR handoff formats were incomplete.
- The PR handoff omitted files changed and the next safe step.
- Deferred research prompts looked like malformed active open-question records.
- `passWithNoTests` had no documented expiration condition.

## Remediation

This issue adds the missing formats, CI policy and workflow, explicit phase
authority, governance validation, README navigation, and acceptance record. The
post-remediation drill and architectural-review verdict are appended only after
independent reviewers inspect the complete diff.

## Post-remediation result

The independent repository-only continuation agent accepted the remediated
repository with `continuity succeeds` and no material gap. Under Node 22.23.1
and pnpm 11.13.0, `pnpm check` passed with one test file and four governance
tests. This acceptance covers continuity only; architectural review, PR CI, and
transition-ADR acceptance remain separate gates.

## Architectural review outcome

- Reviewer: Independent adversarial governance reviewer
- Outcome: Accepted
- Decision: Accept Phase -2 exit. The engineering system is sufficiently
  complete, repository-continuous, independently reviewable, and executable to
  enter Phase -1 after the pull request's Node 22 CI run passes and ADR 0003 is
  accepted. Phase -1 authorizes semantic design and specification evidence only;
  it does not authorize production packages, compatibility commitments, or a
  stable public API.
- Evidence reviewed: `docs/phase-minus-2-exit-checklist.md`, this drill record,
  `prompts/continuity-drill.md`, `docs/development-phases.md`,
  `docs/workflow.md`, `docs/ci.md`, ADR/specification/handoff formats, GitHub
  issue and PR templates, `.github/workflows/ci.yml`, the workflow validation
  test, Node 22.23.1 with pnpm 11.13.0 full local gate, GitHub YAML parsing,
  relative-link validation, and `git diff --check`.
- Affected ADR: ADR 0003 — Enter Phase -1
- Unresolved disagreements: None. The PR's Node 22 CI result remains an expected
  external transition precondition, not a material governance gap.

## Transition completion

[PR #8's Node 22 CI run](https://github.com/Ustice/represent/actions/runs/29470230680)
passed. With every checklist item complete, ADR 0003 was accepted and the
authoritative phase plus README summary moved together to Phase -1.
