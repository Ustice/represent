## Purpose

<!-- State the outcome, not only the files changed. Use "Resolves #N" only for the bounded issue this PR completes. -->

## Traceability

| Artifact                | Reference                                    |
| ----------------------- | -------------------------------------------- |
| Objective issue         | <!-- #2 -->                                  |
| Design or blocker issue | <!-- #123 -->                                |
| Specification clauses   | <!-- REP-CONV-001 -->                        |
| ADRs                    | <!-- ADR-0003 or None — reason -->           |
| Semantic tests          | <!-- path :: test name, or None — reason --> |
| Implementation issue    | <!-- #456 or None — reason -->               |

## Semantic impact

<!-- List guarantees added, changed, removed, or confirmed unchanged. Identify affected representations, conversions, diagnostics, adapter boundaries, and downstream graph relationships. -->

## Evidence

<!-- Report focused checks, the full validation gate, independent review, relevant mutation/discrimination results, and semantic coverage units. Adapter certification must identify the adapter, profile, target, runtime, configuration, capabilities, suite revision, input domains, and all obligation results. -->

## Remaining limitations or disagreements

<!-- Link open questions and blockers. Write "None — reason" only when none are known. -->

## Files changed

<!-- Group the intentionally changed files by purpose. -->

## Next safe step

<!-- State the smallest action a future contributor can take without inventing missing authority or semantics. -->

## Review safeguards

<!-- Mark each item complete or explain why it does not apply above. -->

- [ ] I checked the current development phase and this change is permitted.
- [ ] Normative specification changes completed independent design review before
      implementation relied on them.
- [ ] Tests cite owning clauses and assert observable behavior or declared
      invariants.
- [ ] Gate tests record their oracle, regression, boundary, static/runtime
      distinction, discrimination checks, and semantic coverage units.
- [ ] Relevant surviving mutations and skipped certification obligations are
      classified and linked as explicit gaps.
- [ ] I did not weaken a guarantee or rewrite a valid test to make
      implementation pass.
- [ ] Discovered ambiguities and blockers were reported upward instead of
      patched around.
- [ ] I listed skipped tests, unsafe casts, deviations, and remaining
      limitations above.
