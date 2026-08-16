# Conversion-guarantee executable evidence

## Scope and authority

This record covers issue [#21](https://github.com/Ustice/represent/issues/21)
and the accepted `REP-CONV-001` through `REP-CONV-007` clauses in
[`docs/specifications/conversions.md`](../specifications/conversions.md). It is
Phase -1 executable specification evidence only. The harness under
`tests/semantic/support/` is not a production API and has no compatibility
status.

Test quality is governed by `REP-TEST-001` through `REP-TEST-014`. The complete
`REP-TEST-008` records are adjacent to the cohesive semantic-example and
discrimination groups in `tests/semantic/conversion-guarantees.test.ts` so they
remain reviewable with the executable evidence.

## Evidence boundary

The test-only harness evaluates two accepted forms of evidence:

- directional losslessness over explicit source samples, a declared source
  domain and equality, a forward conversion, and a reverse witness; and
- a collision witness consisting of two source-distinct values with
  target-equivalent forward results, together with the single-valued,
  extensional, target-congruent recovery boundary.

Results expose only the bounded inference supported by the evidence. Rejections
carry the direction, domain, equality names, violated clause, reason, and the
recovered value or collision pair needed to reproduce the result. The examples
are finite acceptance evidence; they do not claim a universally quantified
property. No property-testing library or generated domain is used.

## Clause and case coverage

| Clauses                                        | Executable case                    | Observable oracle                                                |
| ---------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `REP-CONV-001`, `REP-CONV-004`                 | Derivable `fullName`               | Source round trip under equality over all source fields          |
| `REP-CONV-002`, `REP-CONV-006`                 | Off-image `guest` string           | Forward-image sources pass although the witness rejects `guest`  |
| `REP-CONV-001`, `REP-CONV-006`                 | Finite `Date` to canonical ISO     | Recovered epoch milliseconds equal the original                  |
| `REP-CONV-003`, `REP-CONV-006`                 | Two date spellings for one instant | Textually distinct sources have epoch-equivalent targets         |
| `REP-CONV-003`, `REP-CONV-004`, `REP-CONV-007` | Public-view projection             | Email-distinct sources have structurally equal public targets    |
| `REP-CONV-003`                                 | Hidden-provenance recovery         | Context-dependent recovery falls outside the collision boundary  |
| `REP-CONV-005`, `REP-CONV-007`                 | Identifier restored as `unknown`   | Source round trip fails with actionable recovered-value evidence |
| `REP-CONV-003`, `REP-CONV-007`                 | Distinguishable numeric pair       | Collision claim rejects with both source and target values       |

## Mutation obligation matrix

| Mutation                         | Violated clause                | Discriminating fixture                       | Killing test                                                    | Observed failure                                          |
| -------------------------------- | ------------------------------ | -------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| `FIELD_COUNT_AS_LOSS`            | `REP-CONV-004`                 | Derivable `fullName`                         | preserves a derivable `fullName` despite reducing shape         | Mutant rejects a supported round trip based on shape      |
| `OFF_IMAGE_RECOVERY_REQUIREMENT` | `REP-CONV-002`                 | Canonical user string plus off-image `guest` | limits recovery to the forward image                            | Mutant rejects because `guest` is not recoverable         |
| `WRONG_DATE_EQUALITY`            | `REP-CONV-001`                 | Reconstructed finite `Date`                  | preserves finite Dates under epoch-millisecond equality         | Object identity rejects epoch-equivalent Dates            |
| `INFER_OPPOSITE_DIRECTION`       | `REP-CONV-006`                 | Two textual date spellings for one instant   | demonstrates the opposite-direction Date-string collision       | Mutant reports lossless where a collision is demonstrated |
| `HIDDEN_PROVENANCE_RECOVERY`     | `REP-CONV-003`                 | One public view with two hidden originals    | excludes hidden-provenance recovery from the collision boundary | Mutant accepts recovery that varies with hidden context   |
| `FALSE_GUARANTEE`                | `REP-CONV-001`, `REP-CONV-005` | Identifier fabricated as `unknown`           | rejects a fabricated placeholder with actionable diagnostics    | Shape-only mutant accepts a failed source round trip      |

`FALSE_GUARANTEE` is the applicable baseline mutation from `REP-TEST-011`. The
other rows are domain-specific defects required by issue #21. The remaining
baseline catalog does not apply to this bounded behavior: there is no claimed
field-for-field mapping, nullish partition, combine identity, composed path, or
impact graph. All selected mutations are killed; no survivor or semantic
coverage gap is recorded.

## Validation and review state

- Focused semantic suite: 14 tests passed.
- TypeScript typecheck: passed.
- ESLint: passed.
- Full repository gate: passed on Node.js 26.5.0 and pnpm 11.13.0; 6 files and
  93 tests passed.
- Independent test-quality review: required before merge; not claimed by this
  authoring pass.

No specification clause, production package, stable API, adapter behavior, or
compatibility commitment changes in this evidence campaign.
