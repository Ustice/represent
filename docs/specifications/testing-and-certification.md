# Testing and certification specification

## Status and scope

Status: accepted. Owning design issue:
[#5](https://github.com/Ustice/represent/issues/5).

This specification defines the normative quality standard for Represent's
semantic tests and adapter-certification suites. It governs executable
specifications and engineering evidence, not a production testing API.

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** describe
requirement strength. A requirement applies when its subject exists; this
document does not require placeholder tests, adapters, or capabilities before
their owning design exists.

## Terms

- An **observable** is a result, diagnostic, emitted artifact, or declared state
  visible at the smallest supported boundary used by a consumer or adapter
  author.
- An **invariant** is a reviewed property that must hold for all values in its
  stated domain.
- An **oracle** decides whether an observed result satisfies the expected
  behavior, including the relevant equality notion.
- A **semantic test** evaluates an observable or invariant owned by a normative
  specification clause.
- A **discrimination check** runs a test or suite against a deliberately broken
  subject that violates one identified semantic obligation.
- A **certification profile** is an adapter-owned declaration of target-specific
  capabilities, contracts, fixtures, and oracles.
- A **certification suite** is a reusable collection of adapter contract tests
  and fixtures. A passing run is evidence for a stated adapter, profile, target,
  configuration, and suite version; it is not a universal claim about the
  adapter.
- A **semantic coverage unit** is a reviewed node, edge, path, law, or declared
  capability whose required behavior can be traced to executable evidence or an
  explicit gap.

Every executable test MUST be classified as semantic evidence, compile-time
contract evidence, engineering-workflow validation, or exploratory evidence.
Only the first three classifications may gate implementation, and each MUST cite
its owning normative clause, contract, or Phase -2 engineering rule. This
classification prevents small tests from bypassing the quality standard by being
described as trivial.

## Test quality rubric

### REP-TEST-001: Authority and traceability

Every test used as semantic or contract evidence MUST cite at least one owning
normative clause by stable identifier. Engineering-workflow validation MUST cite
its Phase -2 rule and acceptance criterion. Contextual clauses MUST be
distinguished from owning clauses. Exploratory evidence without accepted
authority MUST NOT become an implementation gate.

### REP-TEST-002: Observable semantic purpose

Every gate test or cohesive table-driven group MUST state the observable result
or declared invariant it evaluates, the relevant oracle or equality notion, and
a plausible regression it would detect. Executing code, increasing line
coverage, or proving that a declaration exists is not a semantic purpose.

### REP-TEST-003: Discriminating and refactoring-safe assertions

A gate test MUST be capable of failing when its cited obligation is violated,
and MUST continue to pass when private implementation details change without
changing that obligation. Reviewers MUST ask:

- Could the implementation be wrong while this test still passes?
- Could the implementation be correct after refactoring while this test fails?

If either answer is yes, the test MUST be revised, narrowed to a defensible
public contract, or recorded as a semantic coverage gap.

### REP-TEST-004: Static and runtime boundary

A runtime test MUST state why TypeScript's static checks do not already
guarantee the behavior. Compile-time contract tests MAY be used when
assignability, inference, or rejection is itself the public observable, but they
MUST identify the invalid or valid consumer program being distinguished. Runtime
tests MUST NOT duplicate a type-level guarantee without an additional runtime
obligation.

### REP-TEST-005: Execution boundary and diagnostics

A gate test MUST use the smallest execution boundary at which the owned behavior
is observable, even when that boundary crosses modules or an adapter. It MUST
NOT be made smaller by replacing the behavior with private helpers or mock
choreography. When diagnostics are part of the cited contract, the test MUST
assert the actionable semantic content, such as the clause, capability,
representation, relationship, path, expected and actual result, counterexample,
or reproduction data. It SHOULD avoid exact prose matching unless the prose is
itself a stable public artifact.

### REP-TEST-006: Prohibited default evidence

A test MUST NOT be accepted as semantic evidence when it only verifies any of
the following:

- source text contains a method, symbol, or string;
- a private helper was called;
- internal object structure matches a broad snapshot;
- a trivial getter, constructor, declaration, or re-export exists;
- arbitrary input does not throw without asserting a meaningful property;
- one mock calls another mock;
- a line, branch, or statement coverage number increased; or
- behavior TypeScript already guarantees without identifying a distinct runtime
  obligation.

An exception applies only when inspected text or an artifact is itself a
reviewed public output. It requires a written justification naming the owning
contract, and the test MUST assert only the contractual portion of that output.
Public interaction protocols are ordinary observable behavior asserted at their
public boundary; private calls, internal structure, and coverage metrics do not
qualify for this exception.

### REP-TEST-007: Semantic assertions and snapshots

Tests SHOULD prefer focused assertions that name the relevant fields,
relationships, ordering, diagnostics, or laws. A snapshot MAY be semantic
evidence only when it is a narrow, intentional projection of a reviewed public
output, nondeterministic data is excluded or normalized, important invariants
have focused assertions, and review can identify which semantic change each diff
represents.

Snapshots MUST NOT establish correctness merely by recording a large internal
object. Snapshot updates MUST be reviewed as changes to expected behavior, not
accepted solely because an implementation intentionally changed.

### REP-TEST-008: Test-case record

Every gate test or cohesive table-driven group MUST have a record containing:

| Field                      | Required content                                           |
| -------------------------- | ---------------------------------------------------------- |
| Classification             | Semantic, compile-time contract, or workflow evidence      |
| Owning authority           | Stable clauses, contracts, or Phase -2 rules               |
| Observable/invariant       | Behavior evaluated at the selected boundary                |
| Oracle/equality            | How expected and observed behavior are compared            |
| Regression caught          | A plausible incorrect implementation                       |
| Execution boundary         | The smallest sufficient consumer-visible boundary          |
| Static/runtime distinction | Runtime insufficiency or compile-time program and outcome  |
| Cases                      | Applicable examples, counterexamples, or generated domains |
| Discrimination             | Mutations or broken subjects, or why impractical           |
| Expected diagnostics       | Contractual content, or `None — reason`                    |
| Semantic coverage          | Nodes, edges, paths, laws, and capabilities covered        |

The record MAY be adjacent prose, structured test metadata, or a linked issue.
It MUST remain reviewable without consulting chat history. `None — reason` is
valid only when the field cannot apply to the cited authority, not because the
information is inconvenient to provide.

### REP-TEST-009: Gate outcome

The rubric is a quality gate, not a numeric score. A test is accepted as gating
evidence only when all applicable requirements pass and both review questions in
`REP-TEST-003` have negative answers. Incomplete evidence requires changes; an
unresolved semantic ambiguity is a specification gap or design blocker.

## Mutation and discrimination strategy

### REP-TEST-010: Risk-based discrimination

Each suite that guards a consequential guarantee MUST include discrimination
checks for the plausible defects relevant to that guarantee. Checks MAY use
mutated implementations, deliberately broken test doubles, malformed generated
artifacts, or controlled fixture variants. They SHOULD run at the same public
boundary as the semantic tests and MUST NOT require assertions about how the
defect was implemented.

Mutation selection is risk-based rather than a requirement to run every possible
mutation against every test. The test-case record MUST name selected mutations
and why they are relevant, or explain why mutation is impractical.

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

### REP-TEST-012: Mutation obligation matrix

A suite's discrimination evidence MUST map each required mutation to its
violated clause, discriminating fixture, killing test, and observed failure. A
named mutation without a killing test, or a test without a meaningful violated
obligation, is an explicit gap rather than completed evidence.

### REP-TEST-013: Surviving mutations

If a relevant baseline mutation survives, the affected suite MUST NOT claim
complete evidence for that obligation. Review MUST classify the survivor as:

- a missing or weak assertion;
- an invalid mutation that does not violate the cited clause;
- an undefined semantic boundary requiring specification work; or
- a tooling defect in the discrimination check.

The classification and resolution or explicit coverage gap MUST be recorded.
Mutation scores MAY be diagnostic data, but a percentage MUST NOT substitute for
obligation-level analysis.

### REP-TEST-014: Property-test evidence

A property test MUST state its quantified input domain, preconditions, equality
notion, generator partitions, and oracle. It MUST include nontrivial witnesses
for each material partition and MUST NOT pass vacuously because all useful cases
were discarded. Failures MUST preserve a reproducible seed or counterexample.
Shrinking MUST retain the property's domain and preconditions. Happy-path
examples alone MUST NOT establish a universally quantified law.

## Adapter certification

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

## Semantic coverage model

### REP-TEST-020: Coverage inventory

Each specification area MUST maintain a reviewable obligation matrix once
executable specifications exist. Every semantic coverage unit MUST link its
owning clause to passing evidence, an explicitly tracked gap, or
`Not applicable — reason`. Aggregate line coverage MUST NOT stand in for this
inventory.

### REP-TEST-021: Node and edge coverage

Node coverage records whether each in-scope representation, schema, operation,
adapter, or diagnostic category has its own declared invariants exercised. A
node is not covered merely because a path executed through it.

Edge coverage records whether each in-scope conversion, mapping, dependency, or
adapter translation exercises its declared success behavior, failure behavior,
and guarantees. Executing an edge without asserting its mapping and distinctions
does not cover it semantically.

### REP-TEST-022: Path coverage

Path coverage records only specification-significant multi-edge routes. It MUST
include the route's composition order, intermediate failure propagation, and
declared end-to-end guarantee. Exhaustive enumeration of all graph paths is not
required unless an owning clause requires it.

### REP-TEST-023: Law coverage

Law coverage records the quantified domain, preconditions, equality notion,
oracle, examples, counterexamples, generated partitions, and reproducibility
evidence for each declared law, such as identity, round trip, equivalence, or
preservation of composition. A named law without an executable oracle is an
uncovered or blocked obligation, not a passing one.

### REP-TEST-024: Capability coverage

Capability coverage records whether each declared capability is supported,
unsupported, or conditional for the subject under test. Supported and
conditional capabilities MUST link to contract tests and applicable
configuration. Certification MUST detect a falsely preserved or advertised
capability.

### REP-TEST-025: Coverage reporting

A semantic coverage report MUST present coverage by obligation and distinguish
covered, failed, gap, and not-applicable states. Certification reports also
distinguish skipped, unsupported, and harness-error states. Reports MAY
summarize counts, but MUST retain links to clauses, tests, discrimination
results, and certification declarations. They MUST NOT combine unlike units into
a percentage that implies interchangeable risk or exhaustive graph-path
coverage.

## Test-case template

Use this template in a test description, adjacent metadata, or a linked semantic
test issue:

```text
Test case: <behavioral name>
Classification: <semantic | compile-time contract | workflow validation>
Owning authority: <REP-AREA-NNN, contract, or Phase -2 rule>
Observable/invariant: <consumer-visible behavior>
Oracle/equality: <comparison and equality notion>
Regression caught: <plausible broken behavior>
Execution boundary: <smallest sufficient boundary>
Static/runtime distinction: <runtime insufficiency or compile-time consumer program and compiler outcome>
Cases: <applicable examples, counterexamples, or generated domains>
Discrimination: <mutation IDs or broken subjects, or impractical reason>
Expected diagnostics: <semantic content or None — reason>
Semantic coverage: <nodes, edges, paths, laws, capabilities>
```

## Review outcome

An independent test-quality reviewer must verify these clauses against issue #5
before this specification is accepted. The review record belongs on the issue
using the format in `docs/workflow.md`.
