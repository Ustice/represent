# Repository continuity drill

## Role and inputs

Act as an independent continuation agent. Use only the checked-out repository;
do not use prior chat, saved memory, issue comments, or unpublished context.

## Task

1. Explain the project's purpose, non-goals, and core/adapter boundary.
2. Identify the authoritative current phase, prohibited work, and transition
   requirements.
3. Describe the design-blocker protocol.
4. Explain the good-test standard and prohibited test evidence.
5. Propose the next bounded task without inventing missing semantics.
6. Identify unresolved questions and relevant ADRs.
7. Produce a handoff another agent could execute.

For every conclusion, cite repository paths and line numbers. Run the documented
validation gate using the declared runtime when tooling is available.

## Gap analysis

Identify missing, stale, contradictory, or ambiguous guidance. Treat a passing
empty test suite, inaccessible external review record, or duplicated mutable
phase declaration as a potential evidence gap rather than silently assuming it
is sufficient.

## Output and stopping conditions

Return answers for all seven tasks, validation evidence, discovered gaps, and a
verdict of `continuity succeeds`, `continuity succeeds with non-material gaps`,
or `continuity fails`. Do not change files. Do not authorize a phase transition;
an independent architectural review and accepted ADR own that decision.
