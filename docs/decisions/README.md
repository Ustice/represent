# Architecture decision records

ADRs record consequential decisions, their context, alternatives, and effects.
They explain why; normative behavior belongs in specifications.

Use sequential filenames such as `0002-short-title.md`. A proposed or blocked
decision should state its status and the smallest decision needed for progress.
Do not rewrite past decisions invisibly: supersede them with a new ADR and link
both directions.

Use [`template.md`](template.md). An accepted ADR records its objective and
issue traceability, reviewer identity or role, review outcome, evidence
reviewed, unresolved disagreement, and acceptance date. `Status: accepted` is
invalid without that review record. Phase-transition ADRs additionally link the
architectural review and every applicable exit criterion.
