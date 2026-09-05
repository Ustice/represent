# Work from feedback

2026-09-04: Jason requested a fresh, lightweight process and specifically asked
us to omit instructions that restate normal engineering practice.

Project guidance now contains only local context, decisions, and exceptions.
Phase gates, prescribed design/test/code sequencing, mandatory independent
review, contributor test rubrics, and issue/PR/decision templates are retired.
Process can grow from demonstrated need instead of anticipated failure.

This supersedes the procedures in ADRs
[0001](0001-engineer-the-system-first.md), [0002](0002-development-phases.md),
[0003](0003-enter-phase-minus-1.md), and
[0005](0005-simplify-project-workflow.md). The phase-consistency test is removed
because there is no current phase. Historical test clauses remain available to
interpret old evidence.

Conversion guarantees, the core/adapter boundary, and the contract for actual
adapter-certification claims are unchanged. The project remains experimental;
this change grants no release, compatibility, or unattended-automation status.
