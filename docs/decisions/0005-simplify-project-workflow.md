# ADR 0005: Simplify project workflow

- Status: accepted
- Date: 2026-09-04

## Context

Jason requested reducing or eliminating process written for a model that needed
more guidance. The repository repeats the same controls across agent guidance,
workflow, issue forms, PR and handoff templates, and test records. It also gives
a disabled automation design more space than the everyday development workflow.

## Decision

Use the short [working guide](../../AGENTS.md) and [workflow](../workflow.md).
Direct requests authorize scoped work. Track issues when useful, combine design,
tests, and implementation when coherent, and record a decision once where it
belongs. Independent review remains required for substantial design; mandatory
issue chains, role rosters, acceptance wording, and duplicate records are
removed.

This supersedes the procedural ceremony in
[ADR 0001](0001-engineer-the-system-first.md) and
[ADR 0002](0002-development-phases.md), while preserving the phase model, phase
check before implementation, specification ownership, neutral-core boundary, and
reviewed phase transitions. No phase transition occurs here.

[ADR 0004](0004-use-github-as-automation-control-plane.md) is retired as an
operating policy. Its [historical policy](../archive/agent-automation-policy.md)
and stable `REP-AUTO` clauses remain the contract for existing default-off
tooling and its evidence. Finishing that system is no longer a prerequisite or
assumed next step. No runtime behavior, activation, or GitHub setting changes.

`REP-TEST-001`, `002`, `004`, `006`, `008`, `010`, `012`, and `020` are revised
to let clear tests carry their evidence without mandatory metadata forms or a
separate matrix. Workflow tests refer to current engineering behavior rather
than a completed Phase -2. Behavioral assertions, discrimination, property-test
rigor, certification scope, and honest evidence reporting remain required.

## Consequences and review

One optional issue form and a short PR template replace the five specialized
forms and traceability tables. The separate handoff and testing-philosophy
documents are removed; the latter duplicated the testing specification.
Historical phase-exit evidence remains available but is no longer entrypoint
reading.

Two governance tests are retired because their contract was the superseded
inventory of forms and entrypoint links, not project behavior. Phase-summary
consistency and CI provisioning checks remain. Conversion guarantees and runtime
automation behavior are unchanged.

Independent process reviewer: accepted the final diff on 2026-09-04, with no
blocking findings or unresolved disagreements. Review confirmed preserved
historical clause meanings, consistent active guidance, and retained phase, CI,
behavioral, and certification obligations.

Validation: `pnpm check` passed on Node 26.5.0 and pnpm 11.13.0 (formatting,
lint, typecheck, and 91 tests). Relative Markdown file links resolve, and the
archived automation policy matches the original apart from its retirement banner
and line wrapping. Two superseded inventory tests were removed; no tests were
skipped.
