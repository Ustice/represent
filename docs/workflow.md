# Workflow

Use this loop after a design specification has been reviewed:

1. Select a specification clause.
2. Write or refine executable tests.
3. Implement the minimum behavior.
4. Run focused tests.
5. Run the full semantic suite.
6. Perform adversarial review.
7. Classify failures as:
   - implementation defect;
   - test defect;
   - specification ambiguity;
   - design blocker.

Only implementation defects and test defects may be fixed locally. A test defect
must be justified against the owning specification; it may not be declared
defective solely because implementation fails it.

Specification ambiguities return to specification review. Design blockers stop
implementation and trigger the protocol in `AGENTS.md`: preserve a minimal
demonstrating example, record the open question, update an ADR, and identify the
smallest decision required to resume.

At integration, run `pnpm check`, request a reviewer who did not solely author
the design, and hand off the guarantees changed, evidence collected, unresolved
questions, and next safe step.
