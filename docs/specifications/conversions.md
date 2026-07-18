# Conversion guarantees

## Status and scope

Status: accepted. Owning design issue:
[#17](https://github.com/Ustice/represent/issues/17). `REP-CONV-001` through
`REP-CONV-007` were accepted at exact commit
[`02fb190`](https://github.com/Ustice/represent/commit/02fb190c7e3cc2d003baddc18d708d616f270ac7)
and merged in [pull request #18](https://github.com/Ustice/represent/pull/18).

## Review record

- Reviewers: independent algebraic-consistency reviewer; independent skeptical
  application-developer and terminology reviewer.
- Outcome: Accepted.
- Clauses reviewed: `REP-CONV-001` through `REP-CONV-007`.
- Exact reviewed commit:
  [`02fb190c7e3cc2d003baddc18d708d616f270ac7`](https://github.com/Ustice/represent/commit/02fb190c7e3cc2d003baddc18d708d616f270ac7).
- Evidence:
  [independent review record](https://github.com/Ustice/represent/issues/17#issuecomment-5009728811)
  and
  [exact-commit Review Agent approval](https://github.com/Ustice/represent/pull/18#pullrequestreview-4727593025).
- Unresolved disagreements: None recorded.

This specification defines the evidence needed to describe one direction of a
conversion as lossless and to demonstrate information loss through a projection.
It governs declarations and consumer inferences, not a TypeScript API or
implementation representation.

Partial and fallible conversions, multi-edge composition, path selection,
adapter-specific behavior, and a complete conversion taxonomy are out of scope.

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** describe
requirement strength.

## Terms

- A **conversion direction** is one transformation from a source representation
  to a target representation. The opposite direction is a separate conversion
  direction.
- A **declared source domain** is the set of source values covered by a
  guarantee. It may be narrower than every value inhabiting the source
  representation.
- A **source equality** is the declared rule for deciding when two values in the
  source domain count as the same for a guarantee. It MUST be an equivalence
  relation on that domain. Exact value equality is one possible source equality;
  application-defined equivalence is another.
- A **target equality** is the declared rule for deciding when two forward
  results are observably the same for a collision claim. It MUST be an
  equivalence relation over the target results considered by that claim. Exact
  target equality is one possible target equality. A source round-trip
  losslessness claim does not otherwise require a target equality.
- The **forward image** is the set of target values actually produced by a
  conversion for values in its declared source domain.
- A **reverse witness** is recovery behavior defined for every value in the
  forward image. It may have a wider input domain, but that is not required by a
  directional losslessness claim.
- A **projection** is a conversion intended to expose a restricted or coarsened
  view. Projection describes the conversion's intent; it does not by itself
  prove information loss for every domain or source equality.
- A **collision witness** is a pair of source values that are distinct under the
  declared source equality but produce equivalent target values under the target
  equality declared for that collision claim.

In the clauses below, `f` is a conversion from source `A` to target `B`, `D` is
its declared source domain, `r` is its reverse witness, and `a1 ≡A a2` means
that the declared source equality treats `a1` and `a2` as the same. `b1 ≡B b2`
means that the target equality declared for a collision claim treats `b1` and
`b2` as the same.

## Normative clauses

### REP-CONV-001: Losslessness is directional and scoped

A conversion direction MUST be described as lossless only together with its
declared source domain, source equality, and reverse witness. For every source
value `a` in that domain, the forward result MUST be accepted by the witness,
the recovered value MUST be in the declared source domain, and the source round
trip MUST hold:

```text
r(f(a)) ≡A a
```

The guarantee applies only to that conversion direction, domain, and source
equality. Changing any of them creates a different claim requiring its own
evidence.

### REP-CONV-002: The witness obligation ends at the forward image

A reverse witness for directional losslessness MUST recover every target value
in the forward image. It MUST NOT be required, solely by that claim, to accept
target values outside the forward image, preserve arbitrary target values, or
establish the target-to-source direction as lossless.

Any guarantee for arbitrary target inputs, a target-side round trip, or the
opposite conversion direction MUST be declared and evidenced separately.

### REP-CONV-003: A collision demonstrates information loss

A projection or other conversion has demonstrated information loss for a
declared source domain, source equality, and target equality when a collision
witness exists:

```text
a1 ∈ D
a2 ∈ D
a1 ≢A a2
f(a1) ≡B f(a2)
```

The collision impossibility applies to a reverse witness that is:

- **single-valued**: each target input produces one recovered source-equivalence
  class;
- **extensional**: recovery depends only on the target value, not hidden
  provenance, mutable state, time, randomness, or execution history; and
- **congruent with the declared target equality**: when `b1 ≡B b2`, then
  `r(b1) ≡A r(b2)`.

No such reverse witness can satisfy `REP-CONV-001` for both source values under
the same scope. The collision therefore prohibits a losslessness claim whose
recovery respects that declared target observation. A proposed recovery that
distinguishes target-equivalent values through hidden or unmodeled information
does not refute the collision; it changes the target observation or relies on
information outside the target representation and requires a separate claim.

This clause proves loss only for the stated scope. It does not imply that every
source value is affected, that the target value is invalid, or that the same
conversion loses information under a narrower domain, coarser source equality,
or finer target equality.

### REP-CONV-004: Shape is not evidence of information loss

Removing a field, reducing field count, changing representation shape, or
calling a conversion a projection MUST NOT by itself establish information loss.
Omitted information may be derivable from retained information, or the declared
source equality may intentionally disregard it.

A claim of projection-related information loss MUST identify a collision witness
under its declared source domain, source equality, and target equality. A
transformation without either the round-trip evidence in `REP-CONV-001` or the
collision evidence in `REP-CONV-003` remains unclassified with respect to these
guarantees until its scope or evidence is made sufficient.

### REP-CONV-005: Recovery must reproduce source information

A constant, default, current time, generated identifier, or other fabricated
reverse value is a valid losslessness witness only when the recovered value is
source-equivalent to the original for every value in the declared source domain.
Producing a source-shaped value is not sufficient.

### REP-CONV-006: Consumer inferences are bounded

From a directional losslessness declaration, a consumer MAY infer only that a
value in the declared source domain can travel forward and then through the
declared reverse witness to recover a source-equivalent value.

A consumer MUST NOT infer from that declaration alone:

- exact structural or textual identity of the recovered source;
- recovery of source values outside the declared domain;
- behavior for target values outside the forward image;
- a target-side round trip or losslessness in the opposite direction;
- preservation under another source equality; or
- preservation when the conversion is composed with other conversions.

From a collision witness, a consumer MAY infer that the forward target does not
retain enough observable information to distinguish that source pair under the
declared source and target equalities, and that no single-valued, extensional,
congruent reverse witness can recover both. A consumer MUST NOT infer which
field or operation caused the collision, that the runtime containers are
identical, or that recovery using information outside the declared target
observation is impossible without separate evidence.

### REP-CONV-007: Guarantee evidence and diagnostics

Evidence for a directional losslessness claim MUST exercise the declared source
domain, source equality, forward conversion, and reverse witness. Evidence for
projection-related information loss MUST preserve the two distinct source values
and their target-equivalent forward results as a reproducible counterexample. It
MUST identify the target equality and state that the collision conclusion ranges
only over recovery behavior required to be single-valued, extensional, and
congruent with that equality. Evidence evaluating a concrete reverse witness
MUST verify those conditions before using the collision impossibility argument.

When a tool rejects or disproves either claim, its diagnostic MUST identify the
conversion direction, declared source domain, source equality, violated clause,
and recovered value or collision witness needed to reproduce the failure. A
collision diagnostic MUST also identify the declared target equality and the
target-equivalent forward results.

## Examples and counterexamples

### Dropped but derivable field

Let the source contain `givenName`, `familyName`, and `fullName`. Narrow the
source domain to values where `fullName` is the canonical concatenation of the
other two fields, and use equality over all three fields. A forward conversion
may omit `fullName`; a reverse witness may reconstruct it canonically.

This conversion is lossless in that direction for the narrowed domain when the
source round trip holds. The smaller target shape does not prove loss. If the
domain also allowed two unequal `fullName` spellings with identical retained
fields, those values would instead supply a collision witness under equality
over all three source fields and structural target equality over the retained
fields.

### Forward-image-only recovery

Suppose the target representation permits many strings, but the forward
conversion emits only canonical strings beginning with `user:`. Its reverse
witness must recover every emitted canonical string. Directional losslessness
does not require that witness to accept `guest`, an arbitrary target value that
the forward conversion never emits.

### Directional `Date` conversion

For valid finite JavaScript `Date` values, declare source equality as equality
of epoch milliseconds. Converting a date to its canonical ISO string and
recovering that string as a date is lossless in the Date-to-string direction
when the recovered epoch milliseconds match.

The opposite claim does not follow. Over a source domain of parseable date
strings with textual equality, the strings `2026-07-17T00:00:00.000Z` and
`2026-07-16T20:00:00-04:00` denote the same instant and therefore produce the
same result under target equality by epoch milliseconds. They are a collision
witness, so string-to-Date is not lossless for that domain, source equality, and
target observation. A reverse witness congruent with epoch-millisecond target
equality cannot recover both original spellings under textual source equality.

### Public-view collision

Consider two source users that differ only in an email address included by
source equality. A public-view projection that omits email produces the same
target user for both under structural target equality over the exposed fields.
The pair demonstrates information loss for that source domain, source equality,
and target equality. A reverse witness congruent with the structural target
equality cannot recover which email was present. This does not imply that every
public-view field is lossy or that a domain which equates those two source users
would have the same result.

### Placeholder reverse value

Consider a conversion that drops a source identifier and a reverse-shaped
operation that inserts the constant identifier `unknown`. Any original source
whose identifier is not source-equivalent to `unknown` fails the required source
round trip. The placeholder creates a source-shaped result but is not a
losslessness witness.

## Acceptance examples for executable specifications

| Case                                              | Expected classification                                          | Oracle                                                                                                        | Plausible defect distinguished                                            |
| ------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Canonically derivable `fullName`                  | Lossless for the consistent source domain                        | Source round trip under equality over all source fields                                                       | Field removal is treated as automatic proof of loss                       |
| Arbitrary target string outside the forward image | No obligation from the source-direction claim                    | Membership in the declared forward image                                                                      | Reverse witness is incorrectly required to cover all target values        |
| Canonical `Date` to ISO string                    | Lossless for valid finite dates under epoch-millisecond equality | Recovered epoch milliseconds equal original                                                                   | Textual or object identity is used as the source oracle                   |
| Differently spelled strings denoting one instant  | Collision under textual source equality                          | Distinct strings produce Dates equal by epoch millisecond; recovery is congruent with that target equality    | Opposite-direction losslessness is inferred from the Date-to-string claim |
| Two users differing only in omitted email         | Projection-related information loss                              | Source-unequal pair produces structurally equal public views; recovery is congruent with that target equality | Hidden provenance is treated as part of the public view                   |
| Dropped identifier restored as `unknown`          | Not a valid reverse witness                                      | Recovered source is not source-equivalent to original                                                         | Any source-shaped reverse output is accepted                              |

These records are acceptance inputs for a later semantic-test issue. They are
not executable evidence and MUST NOT gate implementation until they satisfy the
test-case record and discrimination requirements in `REP-TEST-008` through
`REP-TEST-014`.

## Executable evidence

None — this design issue produces reviewed clauses and acceptance examples;
executable semantic tests require a separately linked issue after acceptance.

## Unresolved questions

None within this issue's bounded scope. Broader equality selection, fallible
conversions, guarantee composition, and multiple-path consistency remain
deferred in [`research/open-questions.md`](../../research/open-questions.md).
