# Adapter certification

This contract defines Represent's adapter-certification claims. It does not
prescribe contributor workflow or require a certification system before product
implementation.

The former universal test rubric and coverage-reporting procedure are
[historical reference](../archive/testing-and-certification.md), including
`REP-TEST-001`–`010`, `012`–`013`, and `020`–`025`. Existing citations retain
their historical meaning.

## Adapter-certification contract

These clauses apply to certification claims. A profile declares the adapter's
capabilities, contracts, fixtures, and oracles. MUST and MUST NOT state required
behavior; SHOULD and MAY state recommendations and options.

### REP-TEST-011: Baseline mutation obligations

The semantic test system MUST be able to represent this baseline catalog when
the corresponding behavior exists. Each required mutation MUST map to a named
test and a discriminating fixture; symmetric or vacuous fixtures are not valid
evidence.

| ID                    | Deliberate defect                    | Required discriminator                                     |
| --------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `DROP_FIELD`          | Drop a structurally mapped field     | Assert the full intended public mapping                    |
| `SWAP_FIELDS`         | Swap two compatible mapped fields    | Use distinct asymmetric sentinel values                    |
| `COLLAPSE_NULLISH`    | Merge null, undefined, and missing   | Exercise an explicit three-way presence/value partition    |
| `WRONG_EMPTY`         | Use an incorrect empty or identity   | Check left and right identity with nontrivial samples      |
| `REVERSE_COMPOSITION` | Apply relationships in reverse order | Use noncommuting transformations                           |
| `FALSE_GUARANTEE`     | Falsely report a preserved guarantee | Supply a negative witness that must reject the claim       |
| `OMIT_IMPACT_EDGE`    | Omit a downstream impact dependency  | Expect a deep descendant and an unrelated negative control |

A future specification MAY add domain-specific mutations. It MUST state the
violated clause and expected observable failure.

### REP-TEST-014: Property-test evidence

A property test MUST state its quantified input domain, preconditions, equality
notion, generator partitions, and oracle. It MUST include nontrivial witnesses
for each material partition and MUST NOT pass vacuously because all useful cases
were discarded. Failures MUST preserve a reproducible seed or counterexample.
Shrinking MUST retain the property's domain and preconditions. Happy-path
examples alone MUST NOT establish a universally quantified law.

### REP-TEST-015: Certification declaration

An adapter-certification run MUST identify:

- the adapter name and version or immutable revision;
- the certification profile name and version or immutable revision;
- the external target and runtime versions;
- configuration that changes semantics;
- the declared capabilities and guarantees under test;
- the certification-suite version or immutable revision;
- the fixture or generated-input domains used; and
- pass, fail, skip, unsupported, gap, and harness-error results with reasons.

A result applies only to that declaration. It MUST NOT imply support for
undeclared capabilities, configurations, or target versions.

### REP-TEST-016: Universal adapter obligations

Every adapter-certification suite MUST test the universal obligations applicable
to its declaration:

- translation preserves the neutral meaning claimed by the adapter;
- unsupported neutral constructs are rejected with actionable diagnostics rather
  than silently approximated;
- declared conversions and guarantees remain distinguishable;
- round trips or composition laws are tested only when the adapter declares
  them;
- null, missing, validation failure, and ordering distinctions are preserved
  when the owning specifications require them; and
- emitted artifacts or runtime wrappers conform to their declared public
  boundary.

The suite MUST include relevant baseline discrimination checks from
`REP-TEST-011`.

### REP-TEST-017: Target-owned obligations

Target-specific semantics, capability claims, fixtures, oracles, and metadata
interpretation MUST be owned by the adapter's certification profile. The
universal core MAY orchestrate profile cases and preserve opaque metadata, but
MUST NOT interpret target semantics. Universal and target-owned results MUST
remain distinguishable in the certification report.

### REP-TEST-018: Runner and property-tool neutrality

Represent's test tooling MAY provide fixtures, suite definitions, generators, or
functions that register assertions with a host environment. It MUST NOT own the
test runner's CLI, worker lifecycle, scheduling, or general-purpose reporting.
The contract MUST remain usable from Vitest and MUST permit pluggable
property-testing tools without making one such tool the source of semantic
truth.

Tool-specific shrinking, seeding, and reporting MAY be integrated. Failures MUST
satisfy the reproducibility requirement in `REP-TEST-014`.

### REP-TEST-019: Certification outcome

Certification MUST fail when an applicable required obligation fails, a required
discrimination check survives, or a claimed capability is unsupported. Skipped
obligations MUST include a reason and MUST NOT be reported as passed. Optional
unclaimed capabilities MAY be unsupported without failing unrelated obligations.
Harness errors MUST be distinct from semantic failures and MUST prevent a
passing certification result.
