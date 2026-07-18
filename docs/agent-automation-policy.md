> Design reviews accepted this draft. Autonomous capability remains disabled until the required gates are implemented and accepted.

## Purpose

Define, review, and land the durable human decision-rights and autonomous agent
execution policy for Represent. The bounded engineering objective is to specify
the authorization, identity isolation, state, review, publication, security,
and recovery controls needed for a least-privilege Issues-only approval pilot;
it does not build or enable that pilot. The policy minimizes maintainer
attention by reserving genuine project decisions for Jason while allowing
future agents to perform routine work within explicitly approved objectives.

This is Phase -1 engineering-system design. It does not define Represent
product semantics, authorize production implementation, or grant authority by
itself.

## Publication plan

This full review draft intentionally exceeds GitHub's issue-body limit and is
not the text to paste into #9. If accepted, the exact normative design will land
through an independently reviewed pull request as
`docs/agent-automation-policy.md`. Issue #9 will then become a concise design
record containing the bounded objective, review/acceptance outcome, exact policy
commit and document link, unresolved risks, dependency order, and implementation
gate status. Until that PR lands, this `/tmp` draft remains review material only.

## Objective

Relates to the product north star in #2, but is independently bounded by the
engineering-system objective above. If #2 does not durably own that objective,
acceptance creates a follow-up objective issue for automation governance and
links this design and its policy artifact to it before implementation intake.

That durable objective is accepted by one explicit route: after the policy lands
on `main`, Jason either (a) in a foreground manual bootstrap session creates an
exact whole-body GitHub comment authenticated as user ID `35118` using
REP-WORKFLOW-006 ASCII/LF, case, whitespace, and canonical-value rules:

```text
REPRESENT BOOTSTRAP OBJECTIVE v1
repository_id=<canonical-decimal>
issue_id=<canonical-decimal>
objective_digest=<64-lowercase-hex>
policy_commit_sha=<40-lowercase-hex>
```

`objective_digest` is the standard SHA-256/RFC 8785 digest with domain
`represent-bootstrap-objective-v1` of a closed
`represent.bootstrap-objective/1` snapshot containing schema/domain,
repository/issue IDs, objective, scope, success criteria, exclusions, and exact
policy commit SHA under REP-WORKFLOW-005 bounds.

The genesis ceremony binds the GitHub-assigned comment ID. Alternatively, once
the autonomous intake exists, Jason approves the objective's canonical packet
through REP-WORKFLOW-006. Creating, labelling, or linking the issue alone is not
acceptance. The manual comment is evidence for this one genesis objective and
is not reusable autonomous authority.

The repository should support an agentic operating model in which Jason chooses
or approves bounded objectives and agents execute them autonomously until they
reach a genuine decision boundary.

## Authority model

The stable clauses below are proposed. Accepting #9 accepts the design, not an
operational authority grant. Acceptance must produce
`docs/agent-automation-policy.md`; authority begins only after that normative
artifact receives independent review, lands on `main`, and the applicable
capability gate is separately accepted. Until then no autonomous runtime is
approved or enabled.

### REP-WORKFLOW-000 — Applicability and manual bootstrap

The exclusive webhook protocol, autonomous execution gates, workload isolation,
and separate merge-controller requirements govern authority exercised by an
**autonomous runtime**: a machine process permitted to initiate or continue
mutating work without Jason directing each operation.

They do not prohibit Jason-directed interactive work, the current manual Codex
session, ordinary GitHub review/approval, repository administration, or Jason's
manual merges and recovery actions under the repository ruleset. Jason may use
those manual paths to create App/bootstrap infrastructure, accept and land this
policy, configure security controls, or perform recovery. Each manual action is
bounded to that human-directed operation. It never becomes a reusable approval,
credential, standing packet, reviewer attestation, merge claim, or autonomous
runtime authority, and its credentials remain unavailable to runtimes.

A manual interactive session is foreground work initiated by Jason for one
stated bounded objective. It is nonrecurring, nonscheduled, and terminates at an
explicit handoff or when Jason leaves the live session. Agents may perform
subordinate steps only while that session is live and Jason remains the
initiating principal. No credential, queue item, lease, timer, webhook callback,
background job, retry, or continuation token from the session may survive the
handoff or initiate later work. Continuing after handoff requires a new live
Jason instruction or separately activated autonomous authority.

### REP-WORKFLOW-001 — Sources of authority

For product behavior, only accepted specification clauses and accepted recorded
decisions are authoritative. Tests, implementations, examples, issue labels,
pull requests, comments, agent output, and historical behavior are evidence;
they do not create or change product authority.

For engineering workflow, the accepted repository workflow, phase policy,
accepted ADRs, and accepted clauses in this policy are authoritative. If two
authoritative sources conflict, execution stops and creates a decision packet.
An agent must not resolve the conflict by silently choosing one source.

### REP-WORKFLOW-002 — Human decision rights

Jason retains authority over:

- approving, rejecting, reprioritizing, revoking, or superseding bounded
  objectives;
- product semantics and consumer-visible guarantees;
- architectural boundaries and materially different architectural tradeoffs;
- phase transitions and compatibility policy;
- introducing, weakening, replacing, or removing guarantees;
- accepting material unresolved risk or policy exceptions; and
- choosing among viable alternatives with materially different consequences.

Agents may research, recommend, and prepare packets for these decisions, but may
not decide them on Jason's behalf.

### REP-WORKFLOW-003 — Agent execution rights

Within a validly approved objective, agents may autonomously decompose work,
order dependencies, research, plan, create child issues, create branches and
pull requests, edit authorized artifacts, validate, request independent review,
address findings, publish evidence, and—only after the merge capability is
separately enabled—request an eligible merge.

Agents must obey the current phase and accepted authority. They must not expand
the objective, invent product semantics, weaken a guarantee or valid test, or
accept material risk.

### REP-WORKFLOW-004 — Proposals do not authorize execution

Agents may publicly propose objectives, ordinary suspected bugs, design
questions, and opportunities. Proposals remain inert until an exact approval
packet is validly approved. Labels describe workflow state only and never grant
authority.

Security defects, suspected vulnerabilities, credentials, exploit details, and
other information whose publication could increase risk must not be proposed or
discussed publicly. They use the private security channel in
REP-WORKFLOW-019.

## Approval protocol

### REP-WORKFLOW-005 — Canonical approval packet

The durable state service—not GitHub—owns immutable canonical packet snapshots.
GitHub is the human-readable public projection. A projection mismatch fails
closed and is repaired from, never imported over, the canonical snapshot.

Schema `represent.decision-packet/1` is a closed JSON object with exactly these
members and types:

- `schema`: string, exactly `represent.decision-packet/1`;
- `domain`: string, exactly `represent-decision-packet-v1`;
- `repository_id` and `issue_id`: canonical unsigned decimal strings matching
  `^[1-9][0-9]{0,19}$`; `repository_id` is exactly `1301857052`;
- `packet_id`: lowercase RFC 4122 UUID string;
- `revision`: JSON integer in `1..2147483647`;
- `previous_digest`: `null` for revision 1, otherwise a 64-character lowercase
  hexadecimal string naming revision `revision - 1`;
- `objective`: nonempty UTF-8 string of at most 4,096 bytes;
- `scope`, `success_criteria`, `explicit_exclusions`, `authority`, `risks`, and
  `decision_boundaries`: arrays of 1..100 nonempty UTF-8 strings, each at most
  2,048 bytes; `explicit_exclusions` and `risks` may be empty;
- `priority`: `null`, an integer in `-2147483648..2147483647`, or the string
  `agent-ordered`;
- `standing_authority_packet_id`: `null` or lowercase UUID string;
- `created_at`: UTC RFC 3339 timestamp exactly `YYYY-MM-DDTHH:mm:ssZ`;
- `created_by`: closed object `{ "kind": "github-app", "app_id": "<decimal>" }`;
  and
- `digest`: a 64-character lowercase hexadecimal string.

Input must be UTF-8 I-JSON and parse as one JSON object. Duplicate keys, unknown
members at any level, byte-order marks, lone surrogates, non-I-JSON numbers,
invalid types, and input over 128 KiB are rejected before canonicalization.
Strings are preserved as supplied; visually equivalent Unicode is not silently
normalized. RFC 8785 then defines canonical serialization.

The digest is lowercase hexadecimal SHA-256 over ASCII
`represent-decision-packet-v1`, one zero byte, and the UTF-8 RFC 8785 canonical
JSON of the packet with only the `digest` member omitted. The state service
recomputes it. Revision 1 has no predecessor; each later revision must increase
by exactly one and bind `previous_digest` to the immediately preceding immutable
snapshot.

For each packet ID, one atomic pointer record contains
`current_authority_revision` and `pending_successor_revision`, each null or the
exact `(revision, digest, state_version)` tuple. A proposed revision can appear
only in `pending_successor_revision`; an approved/executing authority can appear
only in `current_authority_revision`. At most one of each exists. A cancelled,
revoked, superseded, completed, or otherwise terminal revision can never occupy
either pointer. Pointer changes and lifecycle/fence changes are one transaction.

Mutable issue numbers, names, URLs, branches, labels, and displayed usernames
are never identity inputs. Editing public text cannot mutate a snapshot.

### REP-WORKFLOW-006 — Exclusive approval input

An approval that grants authority to an autonomous runtime is valid only from a
GitHub `issue_comment.created` webhook delivery
that meets every condition below:

- the receiver verifies `X-Hub-Signature-256` over the exact raw request body
  using the configured webhook secret before parsing or processing it;
- the delivery has a previously unseen `X-GitHub-Delivery` UUID;
- the event repository ID is exactly `1301857052` and is not a fork;
- the event issue immutable ID equals the packet's `issue_id` and the comment
  belongs to that issue;
- `sender.id` and `comment.user.id` both equal Jason's immutable GitHub user ID
  `35118`, and their account types are `User`;
- the exact whole comment body matches the command grammar below;
- `APPROVE` and `CANCEL` reference the exact
  `pending_successor_revision`; `REVOKE` references the exact
  `current_authority_revision`; the referenced snapshot is canonical and the
  pointer/state version remains unchanged through CAS; and
- the receiver records the verified raw delivery before emitting authority.

The approval body is ASCII, uses exactly LF separators, contains no leading or
trailing whitespace and no trailing LF, and is case-sensitive:

```text
REPRESENT APPROVE v1
repository_id=<canonical-decimal>
issue_id=<canonical-decimal>
packet_id=<lowercase-uuid>
revision=<canonical-positive-decimal>
digest=<64-lowercase-hex>
```

Revocation uses the identical grammar with first line `REPRESENT REVOKE v1`.
Cancellation uses first line `REPRESENT CANCEL v1`. `CANCEL` terminally marks
the exact pending proposal cancelled and clears `pending_successor_revision`
without changing current authority. `REVOKE` terminally marks and fences the
exact current authority revoked and clears `current_authority_revision`; it
never targets a proposal. `APPROVE` atomically moves the exact pending tuple to
`current_authority_revision`, supersedes/clears the prior authority when one
exists, and clears `pending_successor_revision`. Using the wrong pointer, stale
state version, or lifecycle fails closed.
No extra, reordered, duplicated, blank, tab-containing, CRLF, or non-ASCII line
is accepted. The command does not contain its own comment ID. The receiver binds
the GitHub-assigned immutable `comment.id` and delivery ID from the verified
webhook envelope to the parsed command when recording the event.

Webhook parsing must preserve the raw numeric token for every GitHub identifier
before general JSON materialization. IDs are accepted only as unsigned base-10
integer tokens and converted losslessly to the canonical decimal-string form;
floating/exponent/negative/quoted forms are rejected. Implementations may use
BigInt or a lossless JSON parser but must never round through IEEE-754 `number`.
The receiver verifies equality using canonical decimal strings, including IDs
larger than `9007199254740991` and up to the schema's 20-digit limit.

Edited comments, `issue_comment.edited`, reactions, labels, reviews, issue body
text, email replies, Codex conversation text, API polling results, replayed
payloads, and approval-like text from any machine identity are never approval.
A GitHub conversation may prepare the packet, but only this webhook event can
unlock execution. The trust decision is deliberate: any correctly signed GitHub
webhook event authenticated by GitHub as user ID `35118` and exactly bound as
above is Jason's approval. The receiver does not claim it can distinguish
browser, PAT, OAuth, or other user-credential provenance. Compromise or misuse
of any Jason GitHub credential capable of creating the comment is therefore an
approval-system compromise. No second human-held key or signature is required.

Structural non-possession is a hard activation prerequisite: no autonomous
runtime may possess or reach Jason's PAT, OAuth token, SSH key, browser/session
credential, cookie, GitHub App user access token, `gh` credential store, or an
IPC/API proxy that can act with them.

### REP-WORKFLOW-007 — Delivery journal and replay resistance

Before acting, the receiver rejects raw bodies over 1 MiB, then stores the exact
accepted raw bytes, normalized lower-case header names with exact values for the
event/signature/delivery headers, UTC receipt time, verification result,
immutable GitHub IDs, monotonic 64-bit sequence, prior-record hash, and active
verification-key version. Journal metadata is closed I-JSON serialized with RFC
8785. Exact metadata schema `represent.journal-metadata/1` has: `schema`;
`domain`=`represent-journal-metadata-v1`; decimal-string `journal_id`;
`record_type` (`genesis`, `webhook`, `configuration`, `state-transition`,
`outbox`, `review`, `merge`, `security`, or `checkpoint`); UTC `received_at`;
`source` (`github-webhook`, `state-service`, `security-admin`, `broker`,
`reviewer`, `checkpoint-verifier`, or `genesis-ceremony`); closed nullable
`webhook` with exact ASCII `x_github_event`, `x_github_delivery`,
`x_hub_signature_256`, and nullable action plus decimal-string nullable
repository/issue/comment/sender IDs; `verification` (`valid`, `invalid`, or
`not-applicable`); nullable ASCII `actor_identity`; ASCII `body_media_type`;
integer `body_length` in 0..1,048,576; `detail_digest` as lowercase 64-hex; and
integer `signing_registry_version`. Unknown/duplicate members fail. Non-webhook
records require `webhook=null`; webhook records require every webhook member.

Cryptographic framing is exact. `U32(x)` and `U64(x)` are unsigned big-endian
4- and 8-byte integers; `FRAME(bytes)` is `U32(byte_length) || bytes`. SHA-256
values inside crypto preimages are raw 32-byte values; JSON displays them only
as 64-character lowercase hex. Sequence is `U64`, starts at 1, and never wraps.
For sequence 1, `prior_hash` is 32 zero bytes. Define:

```text
raw_body_hash = SHA256(raw_body_bytes)
record_preimage = FRAME(ASCII("represent-journal-record-v1"))
                || U64(sequence)
                || FRAME(prior_record_hash_raw32)
                || FRAME(raw_body_hash_raw32)
                || FRAME(rfc8785_metadata_utf8)
record_hash = SHA256(record_preimage)
signature_preimage = FRAME(ASCII("represent-journal-signature-v1"))
                   || FRAME(record_hash_raw32)
```

An Ed25519 key signs `signature_preimage`. The closed signature envelope has
exact members: `schema`=`represent.journal-signature/1`, decimal-string
`journal_id`, decimal-string `sequence`, lowercase-hex `record_hash`,
`algorithm`=`Ed25519`, ASCII `key_id` (1..128 bytes), integer `key_version`, UTC
seconds `signed_at`, integer `registry_version`, lowercase-hex `registry_digest`, and unpadded base64url
`signature` decoding to exactly 64 bytes.

The independently administered journal key registry is the
`represent.key-registry/1` `journal` registry in REP-WORKFLOW-025. Rotation introduces a new
version before use; ordinary revocation rejects signatures at or after its
effective time, while compromise revocation states a last-trusted time and
invalidates later records pending recovery.

The journal is append-only/WORM storage under a principal outside receiver,
author, reviewer, executor, and merge-controller write/admin authority. It
publishes signed external checkpoints of `(journal_id, sequence, record_hash)`
to a second administrative domain at least hourly and before emitting approval
or autonomous merge authority. The independent checkpoint verifier validates
the offline-signed registry, envelope, Ed25519 signature, exact framing, chain,
and WORM position before signing/publishing its own checkpoint. Startup and
continuous verification reject gaps, duplicate
sequences, invalid signatures, broken chains, rollback behind a checkpoint, or
truncation. Security records and checkpoints are retained for at least the
longer of seven years or the repository's adopted audit-retention policy;
deletion requires Jason-controlled security administration and an audit event.
Readers are limited to the verifier and designated security auditor; only the
journal service appends; no automation role administers it.

Checkpoint schema `represent.journal-checkpoint/1` is closed canonical I-JSON
with decimal-string journal ID/sequence, record-hash hex, registry version/digest,
UTC `checked_at`, verifier key ID/version, algorithm `Ed25519`, and unpadded
base64url 64-byte signature. It signs the same exact `FRAME(domain) ||
FRAME(rfc8785_without_signature)` construction using domain
`represent-journal-checkpoint-v1`; its public key is held in a distinct
REP-WORKFLOW-025 `checkpoint-verifier` registry. A checkpoint is valid only after the
verifier has independently read the WORM record at that sequence and replayed
the complete chain since the last checkpoint.

Webhook secrets live only in receiver secret storage. Rotation uses distinct
versioned old/new secrets with a bounded dual-accept window of at most 24 hours;
verification records which version matched, new configuration is tested before
cutover, the old secret is revoked at window end, and events matching neither or
both unexpectedly fail closed and alert privately.

`X-GitHub-Delivery` is the primary delivery deduplication key. The immutable
comment ID plus repository ID, issue ID, packet ID, revision, digest, and event
action form the semantic idempotency key. A repeated delivery or semantically
duplicate comment records a duplicate result but emits no second approval or
side effect. Conflicting reuse fails closed and alerts through the private
security channel.

### REP-WORKFLOW-008 — Approval state transition

Approval recording CASes the exact `pending_successor_revision` tuple and pointer
record version. With no current authority, it clears pending and installs the
tuple as `current_authority_revision=approved`. With current authority, the same
transaction marks the old authority superseded, installs the successor as the
new current authority, clears pending, and opens the successor fence. The
approval comment/delivery/journal reference commit in that transaction before
work is scheduled. A crash before commit has no authority; retry converges on
the single pointer swap. CANCEL and REVOKE perform the distinct pointer-guarded
transactions in REP-WORKFLOW-006.

## Scope changes, revocation, and materiality

### REP-WORKFLOW-009 — Material-change rule

A change is material and requires a new packet revision and approval if it
changes any packet field other than execution-only metadata, or if it changes
any of the following observable dimensions:

- in-scope or excluded repositories, packages, artifacts, users, integrations,
  or externally visible behavior;
- success criteria or governing authority;
- a product guarantee, architecture boundary, compatibility commitment, phase,
  permission, credential boundary, security assumption, or accepted risk;
- data read, written, retained, disclosed, or deleted;
- irreversible or externally visible effects;
- the class of failures tolerated; or
- the maximum consequence of a plausible failure.

A change is non-material only when every approved observable above is unchanged
and it merely reorders work, decomposes tasks, substitutes an equivalent tool,
retries an idempotent action, improves internal diagnostics, or changes an
implementation detail that accepted authority deliberately leaves open. If
classification is uncertain or reviewers disagree, the change is material and
execution pauses for a decision.

The only execution-only metadata exempt from packet revision is: scheduler run
ID, worker lease/fence token, attempt count, queue/lease timestamps, internal
task-decomposition links, an equivalent tool/version chosen within approved
constraints, progress percentage, safe diagnostic references, and
idempotency/outbox reconciliation status. It lives outside the packet and
cannot change packet observables.

Examples: swapping two independent validation tasks is non-material. Adding a
package or data source, changing an externally visible error, accepting a
skipped required check, expanding permission, raising the risk ceiling, or
changing retention is material. Replacing a formatter is non-material only if
scope, artifacts, gates, and compatibility remain identical. Retrying a timeout
is non-material only where operation-specific reconciliation permits it.

### REP-WORKFLOW-010 — Revocation and supersession

Jason may revoke an uncompleted approval using the same authenticated webhook
path and exact packet binding required for approval. A newer approved revision
supersedes the older one. An arbitrary public proposal never pauses authorized
work. Only the authorized state service, after detecting and durably recording
that active execution crossed or must cross a material boundary, may create a
successor proposal and atomically move the old revision to
`paused-material-change`. That state blocks publication and merge pending
resolution. The old approved revision remains the authority while paused; merely
creating the successor does not supersede it. Only exact successor approval
atomically supersedes the old revision, approves the successor, and opens a new
fence generation.

A newer proposal may supersede an older still-unapproved proposal only by one
CAS that terminally supersedes the old pending tuple and replaces
`pending_successor_revision`; it cannot change `current_authority_revision`.
Cancelling a successor terminally clears the pending pointer and leaves the old
approved revision and its pause fence unchanged. A cancelled revision cannot be
reinserted into either pointer. There is no separate reject command. To resume the old
revision, a decision context must list a `rollback-and-resume-old` option; exact
`DECIDE v1` selection plus state-service proof that every material attempted
change was safely rolled back CASes the old exact predecessor state/version into
a new open generation. Otherwise pause continues.

Revocation stops new actions, cancels queued actions, and directs active work to
the nearest safe idempotent stopping point. Existing evidence remains immutable.
If work already merged, the system records a corrective objective rather than
rewriting history.

### REP-WORKFLOW-011 — Revocation/merge linearization

For an autonomous candidate head SHA, the autonomous merge controller and approval-state service use a
single atomic compare-and-swap transaction (or a formally equivalent serializable
operation) as the linearization point. The merge claim includes repository ID,
pull request immutable ID, packet ID, revision, digest, and exact head SHA.

- If revocation or supersession commits first, the merge claim fails closed.
- Before egress accepts a merge request, a merge claim is cancellable and
  revocation may win the CAS. Once the broker durably accepts the exact request
  for emission, the claim becomes non-expiring `merge-request-in-flight`;
  revocation becomes `revocation-pending` and cannot cancel that accepted
  request, nor can a kill switch recall it.
- A conclusive GitHub response records `merged` with immutable merge commit ID
  or `merge-failed` followed by revocation. An ambiguous response or timeout
  moves to `merge-unknown/reconciliation-required`. It never expires, releases,
  or retries automatically. A separately authorized reconciliation reads the
  exact pull request and audit evidence until it proves merged or unmerged;
  only then may it finalize the pending revocation. If merged, corrective
  follow-up is created where required.

This ordering must be observable in the journal and deterministic under
concurrent delivery.

## Review and merge separation

### REP-WORKFLOW-012 — Immutable review subject

Independent review binds to repository ID, pull request immutable ID, packet ID,
revision, digest, and the exact immutable head commit SHA. Any head change makes
prior acceptance stale. Reviewer evidence states the reviewer run ID, authority
snapshot SHA, checks performed, findings, result, and cryptographic attestation.

Reviewer attestations must be unforgeable by the authoring executor: they are
signed by a reviewer-specific key or workload identity unavailable to authoring
runs and verified against an allow-listed reviewer identity. A shared GitHub App
display identity is not proof of independent review.

Attestation schema `represent.review-attestation/1` is a closed I-JSON object
under REP-WORKFLOW-005 parsing and string bounds. Its exact members are:
`schema`; `domain`=`represent-review-attestation-v1`; decimal-string
`repository_id` and `pull_request_id`; UUID `packet_id`; integer
`packet_revision`; `packet_digest`; `head_sha` (40 lowercase hex); closed
`authority_snapshot` with 40-lowercase-hex `commit_sha` and `tree_sha` naming the
exact Git commit and root tree reviewed; ASCII `reviewer_identity` (1..128);
UUID `run_id` and `nonce`; UTC-seconds `issued_at` and `expires_at`; `result`
equal to `accepted` or `rejected`; arrays `findings` and `checks`; lowercase-hex
`findings_digest` and `checks_digest`; `algorithm`=`Ed25519`; ASCII `key_id`
(1..128); integer `key_version`; integer `registry_version`;
`registry_digest`; and unpadded base64url `signature` decoding to 64 bytes.

`findings` has at most 200 closed objects with UUID `finding_id`, `severity`
(`info`, `warning`, or `blocking`), `summary` (1..2,048 bytes), `authority_id`
(1..128 ASCII), `disposition` (`open`, `resolved`, or `accepted-risk`), and
`risk_acceptance` equal to null or a closed object containing prior human
risk decision's `decision_context_id`, `context_digest`, `resolution_digest`,
`selected_option_id`, exact `finding_id`, and `consequence_digest`.
`risk_acceptance` is required only for `accepted-risk`, and the state service
must resolve those hashes to a valid typed REP-WORKFLOW-016 context plus exact
`DECIDE v1` resolution whose selected listed option carries the identical
`accepts_risk` pair. No prose, summary, recommendation, or packet title can
satisfy the binding; it is null for other dispositions. An
`accepted` attestation has no `open` blocking finding or unapproved accepted
risk. `checks` has 1..100 closed objects with ASCII `check_id` and
`publisher_identity`, exact `subject_sha`, `conclusion` (`success` or `failure`),
UTC `completed_at`, and lowercase-hex `evidence_digest`. `findings_digest` is
SHA-256 over ASCII `represent-review-findings-v1`, zero byte, and RFC 8785 of the
complete findings array. `checks_digest` uses domain
`represent-review-checks-v1` and the complete checks array. Array order is
significant and IDs are unique.

The signature covers ASCII `represent-review-attestation-v1`, zero byte, and
the RFC 8785 object with only `signature` omitted. Unknown/duplicate fields and
noncanonical values fail. Packet/head/authority binding plus a one-use nonce
ledger prevents replay. `expires_at` is after issuance and at most 24 hours
later. At receipt, `issued_at` may be no more than five minutes in the future;
receipt must precede expiry, using journal receipt time rather than worker time.

The independently administered reviewer registry is the
`represent.key-registry/1` `reviewer` registry in REP-WORKFLOW-025. Attestations bind the exact registry version and
digest. Rotation overlaps for at most 24 hours. Ordinary revocation rejects an
attestation issued at/after its effective time; compromise revocation rejects
all attestations after the declared last-trusted time and pauses affected work
until re-review. Verification rejects expired, revoked, unknown, skewed, or
reused keys/nonces. Reviewer workers
cannot access author, state-service, check-publisher, or merge credentials. The
protected-check publisher independently verifies the envelope and publishes a
check for the exact SHA; author/reviewer workloads cannot forge or overwrite
that check.

### REP-WORKFLOW-013 — Separate autonomous merge controller

For autonomous merge, the authoring executor and reviewer have no direct credential path intended for
merge, bypass, rules/check administration, or merge-controller modification. A
separate controller alone may request merge and cannot author changes or create
reviewer attestations. It accepts only a current approval, eligible immutable
head SHA, valid independent review, and current green required checks.

GitHub Contents write is broader than merge and permission scopes alone cannot
enforce this separation. Before enablement, the final merge-controller issue
must independently review either (a) an egress/API broker holding the GitHub
credential and accepting only the exact merge endpoint for immutable repository
ID, pull-request ID, and expected head SHA, with no generic request forwarding,
or (b) another mechanism proven to provide equivalent restriction. Until that
detailed credential and endpoint design is accepted, this policy claims no
permission-level isolation and autonomous merge remains disabled.

Autonomous merge remains disabled until repository rulesets are verified to
require the complete validation and independent-review checks, apply to the
default branch, disallow force pushes and deletion, and provide no bypass to any
author, reviewer, executor, installation, or ordinary maintainer automation.
The merge controller may have only the narrow bypass/merge capability strictly
required after an explicit security review; absent that accepted design it must
obey all rules with no bypass.

Jason retains the ordinary manual merge and manual recovery path allowed by the
repository ruleset. A manual merge is a discrete human action, is journalled or
linked into the public audit record, and does not create controller authority or
waive checks, review, exact-head binding, or other ruleset requirements.

### REP-WORKFLOW-014 — Merge eligibility

An autonomous merge is eligible only when:

- it remains within a currently approved objective or standing maintenance
  authority;
- every changed artifact is permitted by the current phase;
- accepted specifications and decisions authorize all product behavior;
- traceability and semantic evidence are complete;
- all required checks are green for the exact head SHA;
- a separate reviewer attestation accepts that exact head SHA;
- no unresolved blocker, material decision, revocation, or supersession exists;
- repository rules and least privilege satisfy REP-WORKFLOW-013; and
- the merge claim in REP-WORKFLOW-011 succeeds.

Tests support this determination as evidence; passing tests never supply missing
product authority.

## Standing maintenance and decisions

### REP-WORKFLOW-015 — Standing maintenance authority

Standing maintenance is not implicit. Jason must separately approve a
canonical `represent.standing-authority/1` packet. It is a closed I-JSON object
using REP-WORKFLOW-005 parsing, ID, time, revision-chain, RFC 8785, and digest
rules, with digest domain `represent-standing-authority-v1`. Its exact members
are: `schema`, `domain`, `repository_id`, `issue_id`, UUID `packet_id` (also the
standing-authority identifier used by the approval grammar), integer `revision`,
nullable `previous_digest`, array `path_prefixes`,
array `regression_classes` containing only `accepted-product-regression` or
`accepted-engineering-system-regression`, array `permitted_effects` containing
only `create-issue`, `write-issue-comment`, `create-owned-ref`,
`update-owned-ref`, `create-pull-request`, `update-pull-request`,
`modify-in-scope-files`, `run-secretless-validation`, or `request-eligible-merge`,
array `exclusions`, `risk_ceiling` exactly `low-reversible`,
`data_ceiling` exactly `public-repository-only`, arrays
`required_validation_ids` and `required_review_ids`, `priority` as defined by
REP-WORKFLOW-005, UTC-seconds `starts_at` and `expires_at`, integer
`reapproval_cadence_days` in 1..90, `created_at`, `created_by`, and `digest`.
All arrays except `exclusions` contain 1..100 unique values; `exclusions`
contains 0..100 closed objects with `type` equal to `path-prefix`,
`regression-class`, or `effect` and a typed `value` valid for the corresponding
field. There is no free-form exclusion used for enforcement.

A repository path prefix is ASCII POSIX text of 1..1,024 bytes, has no leading
or trailing `/`, and consists of `/`-separated segments matching
`[A-Za-z0-9._-]+`; segments `.` and `..`, empty segments, backslash, control
bytes, and percent/Unicode aliases are invalid. Prefix `p` matches only path
exactly `p` or beginning `p/`; raw string-prefix matching is forbidden. Scope
first requires a positive segment-aware `path_prefixes` match, then rejects any
matching typed exclusion. String byte bounds otherwise match
REP-WORKFLOW-005. `expires_at` must be
after `starts_at`, no later than the cadence after approval, and no more than 90
days after approval.

The standing packet therefore names repository/package scope,
eligible regression classes, permitted effects, explicit exclusions, maximum
risk and data-impact ceiling, validation/review requirements, priority rule,
start/expiry timestamps, and reapproval cadence. It
always excludes security defects, credential/permission changes, destructive
data operations, guarantees without accepted authority, phase changes, and
architecture changes. Expiry immediately prevents new intake or merge.

A standing revision has terminal lifecycle state `expired`. At the earliest of
`expires_at` or the approved reapproval-cadence deadline, the time authority
atomically CASes that exact `current_authority_revision` to `expired`, clears the
current pointer, increments the packet fence, and sets orthogonal fence mode
`standing-expired`. The new generation rejects every not-yet-broker-accepted
child, outbox mutation, review eligibility, and merge request. Each request
already durably accepted by the broker remains only in the in-flight/
revocation-pending reconciliation path and cannot be retried. `expired` is
terminal and cannot re-enter either revision pointer; continuing maintenance
requires a newly approved standing revision.

Under a current standing packet, agents may autonomously repair a confirmed
regression only when expected
behavior is established by accepted specifications or decisions (or, for
engineering-system behavior, accepted workflow authority), the failure is
reproducible, the repair is narrow and reversible, discriminating evidence
demonstrates restoration, no valid guarantee or test is weakened, independent
review accepts the exact head SHA, and all required gates pass.

A test alone does not establish expected product behavior. Undefined or disputed
behavior, materially different fixes, expanded scope, changed guarantees, or
accepted residual risk require a decision packet. Ordinary confirmed
regressions may be proposed publicly; security defects follow
REP-WORKFLOW-019.

### REP-WORKFLOW-016 — Decision queue and interruption

Non-urgent decisions are batched. Each decision uses a closed
`represent.decision-context/1` object under REP-WORKFLOW-005 parsing/bounds and
digest rules, with domain `represent-decision-context-v1`. Exact members are:
`schema`, `domain`, `repository_id`, `issue_id`, UUID `decision_context_id`,
bound `packet_id`, integer `packet_revision`, `packet_digest`, UUID
`work_item_id`, `decision`, `needed_now`, nullable closed `risk_finding` with UUID
`finding_id` and `consequence_digest`, array `options` of 2..10 closed objects
having ASCII `option_id` (1..64), `summary`, nonempty arrays `consequences` and
`risks`, `reversibility` equal to `reversible`, `costly`, or `irreversible`, and
nullable closed `accepts_risk` with exact `finding_id` and
`consequence_digest`;
`recommended_option_id`, nonempty `recommendation_reason`, nonempty array
`evidence`, arrays of UUIDs `affected_work_item_ids` and
`safe_parallel_work_item_ids`, nonempty array `resume_conditions`,
`created_at`, `created_by`, and `digest`. Option IDs are unique and the
recommendation must reference one. The digest uses the same framing with this
schema's domain separator.

Every `option_id`, `recommended_option_id`, and later `selected_option_id` must
match exactly `[a-z][a-z0-9_-]{0,63}`. When `risk_finding` is non-null, its
`consequence_digest` is SHA-256 over ASCII
`represent-risk-consequence-v1`, zero byte, and RFC 8785 of the exact complete
`consequences` array in every option that accepts that finding. An accepting option's
`accepts_risk` must exactly equal the context's pair; nonaccepting options use
null. With `risk_finding=null`, every option uses `accepts_risk=null`.

`decision`, `needed_now`, `recommendation_reason`, option summaries,
consequences, risks, evidence, and resume conditions use the
REP-WORKFLOW-005 string limit. Evidence and resume conditions contain 1..100
items; affected work contains 1..100 unique UUIDs including `work_item_id`; safe
parallel work contains 0..100 unique UUIDs disjoint from affected work.

Selection produces a closed `represent.decision-resolution/1` durable object
under the same parsing/bounds rules and digest domain
`represent-decision-resolution-v1`. Exact members are: `schema`, `domain`,
`repository_id`, `issue_id`, `packet_id`, integer `packet_revision`,
`packet_digest`, `decision_context_id`, `context_digest`, `work_item_id`, ASCII
`selected_option_id`, decimal-string `github_comment_id`, UUID `delivery_id`, UTC
`resolved_at`, and `digest`. The state service derives work item and selected
option from the immutable context, binds the GitHub-assigned comment/delivery
from the verified envelope, and computes the standard domain-separated digest
with only `digest` omitted.

An autonomous decision is valid only from the REP-WORKFLOW-006 signed
`issue_comment.created` path and this exact case-sensitive ASCII/LF whole body,
with no leading/trailing whitespace or trailing LF:

```text
REPRESENT DECIDE v1
repository_id=<canonical-decimal>
issue_id=<canonical-decimal>
packet_id=<lowercase-uuid>
revision=<canonical-positive-decimal>
digest=<64-lowercase-hex>
decision_context_id=<lowercase-uuid>
context_digest=<64-lowercase-hex>
selected_option_id=<value-matching-[a-z][a-z0-9_-]{0,63}>
```

No `REJECT` or `DEFER` command exists. If either outcome is meaningful, it must
be a listed option with explicit consequences and resume conditions; otherwise
no command leaves the item queued. The receiver CASes the exact current packet,
context, unresolved work-item state/version, and fence generation to one
resolution. A stale/replayed delivery, repeated same resolution, or second
selection emits no second transition; an exact duplicate is idempotently linked,
while a different option for an already resolved context is a conflict and
fails closed. The work item resumes only after the selected option's recorded
resume conditions and any required successor packet approval are satisfied.

The public decision packet states the exact decision,
why it is needed, viable options, recommendation, evidence, consequences,
reversibility, affected work, safe parallel work, and resume condition.
`ready-for-human` is discovery state, not authority.

Immediate private interruption is reserved for credible security exposure, risk
of data loss/corruption/integrity failure, serious public-service failure,
irreconcilable authority conflict, an entirely blocked active objective, or
delay likely to cause material harm or substantial wasted work.

## Identity, permissions, and security

### REP-WORKFLOW-017 — No personal credential fallback

No automation component may receive, discover, read, proxy, or fall back to
Jason's PAT, OAuth token, SSH key, browser/session credential, cookie, `gh`
credential store, or GitHub App user access token. Missing App credentials cause
a closed failure. This is enforced with isolated workload and OS principals,
role-specific secret-store ACLs, and separate short-lived credentials. Runtime
filesystems mount no interactive home directory, keychain, SSH agent, browser
profile, `gh` configuration, App keys belonging to another role, or host IPC.
Network policy blocks user-credential proxies and generic host services.

Activation requires negative integration tests showing that the runtime cannot
read, list, inherit, mount, request through IPC, or use a deliberately present
personal credential or cross-role App key. The current interactive Codex
environment is explicitly excluded from every autonomous runtime.

GitHub App registration ownership, permission/subscription changes, webhook URL
and secret configuration/rotation, private-key creation/rotation/revocation,
installation administration, and broker trust configuration belong to a
Jason-controlled security principal outside every autonomous runtime. Runtimes
may request a change but cannot apply it. Every configuration read/change records
the authenticated administrator, before/after digest, reason, and time in the
journal and emits an authenticated private alert; an unjournaled change disables
the affected gate.

### REP-WORKFLOW-018 — Repository and fork scope

All first-stage automation is restricted by immutable repository ID
`1301857052`. Repository name transfer or rename does not broaden scope. Events
originating from forks are untrusted input and cannot carry approval, reviewer
attestation, authority, or secrets. Trusted orchestration never checks out a PR
head, executes repository workflows, resolves submodules, downloads LFS objects,
or consumes build artifacts from untrusted code.

If untrusted code must be inspected or tested, a secretless disposable worker
with no privileged network or repository write token fetches the API-verified
exact head SHA from the recorded immutable head repository ID. It disables
submodules, hooks, credential helpers, workflow execution, and artifact reuse;
uses read-only source plus bounded scratch storage; and destroys the worker
after exporting only allow-listed, size-bounded, digest/provenance-labelled test
results to quarantine. A trusted verifier parses quarantined results as data.
`pull_request_target` and equivalent base-context execution never run or source
untrusted code. Changes to workflow files receive no privileged execution until
merged through the trusted path. Any future multi-repository scope requires a
newly approved design and immutable allow-list.

### REP-WORKFLOW-019 — Private security channel prerequisite

No autonomous workflow may be enabled until Jason controls a tested private
security intake and alert channel that is inaccessible to public issue readers
and untrusted agents. The channel must support confidential reporting, immediate
revocation/kill-switch requests, and durable restricted evidence. Public issues
receive only a minimal non-exploitable status. After disclosure becomes safe, a
sanitized public record links an opaque restricted-record ID, dates, resolution,
and affected public decisions without exposing secrets or exploit detail.

Submit access is limited to Jason, designated reporters, and authenticated
automation that can only create a new sealed report. Read access is limited to
Jason and named security responders. Administrative access—membership,
retention, export, and deletion—is limited to a Jason-controlled security
principal outside autonomous runtimes. Submitters cannot list/read reports;
responders cannot silently change ACLs. Kill-switch alerts are authenticated,
signed by the broker/state service, delivered over at least two configured
paths, and tested for receipt and spoof rejection.

### REP-WORKFLOW-020 — Capability rollout and kill switch

Capabilities are ordered and independently gated; rollout is not monotonic and
any stage may be rolled back without preserving later capability. The order is:

1. observe/read and journal only;
2. receive and verify approval events without scheduling work;
3. write/update decision and state comments through the Issues-only App;
4. schedule non-mutating validation;
5. author branches and pull requests with a separate authoring identity;
6. accept reviewer attestations from a separate reviewer identity; and
7. enable the separate merge controller last.

Each stage has a named Jason-controlled gate owner, versioned evidence packet,
independent security/maintainer acceptance, default-off configuration, explicit
permissions, rollback procedure, and rollback acceptance test. A later stage
cannot activate while an earlier dependency is disabled or stale. Gate state is
durable outside executors and reverified on every operation.

A global kill switch and narrower per-capability/installation switches are
controlled by Jason outside executor authority. The credential/API broker
enforces them both when minting tokens and immediately before every mutating
egress operation; workers cannot hold reusable credentials that bypass the
broker. Activation, denial, rollback, and use while disabled are journaled and
alerted. A switch blocks queued/not-yet-accepted operations, but cannot recall a
request already durably accepted by an external system or a merge request in
`merge-request-in-flight`; those enter bounded reconciliation. Tests run before
each expansion and recurrently.

Compromise response disables affected capabilities, revokes App installation
tokens/keys and webhook secrets, suspends the installation when necessary,
preserves the external journal, rotates credentials from a trusted environment,
audits actions since the last trusted checkpoint, invalidates untrusted
approvals/reviews/merge claims, restores from verified state, and requires Jason
to explicitly re-enable capabilities. Automation cannot attest to its own
recovery.

### REP-WORKFLOW-021 — Mutable bootstrap evidence

Observed on 2026-07-17: the GitHub App `represent-decision-agent` exists and is installed only on
`Ustice/represent`. Its current permissions are Metadata read and Issues
read/write. OAuth, device flow, and webhook delivery are disabled.

The same dated inspection showed repository ID `1301857052` is
public and its default branch is `main`. Active ruleset `Protect main` (ID
`19132384`) targets `refs/heads/main`: it requires a pull request, one approval,
dismissal of stale approvals, resolved review threads, and the strict required
`validate` check from GitHub Actions integration ID `15368`; it blocks deletion
and non-fast-forward updates. Its bypass actor list is empty and GitHub reports
`current_user_can_bypass: never`.

These controls are necessary bootstrap evidence, not autonomous-merge
authority. Merge capability remains disabled until the separate merge-controller
identity and capability, exact-head and revocation protocol, permission
isolation, required reviewer attestations, and full validation scenarios are
implemented and independently accepted.

This is bootstrap evidence only. The installation has no approval-verification,
authoring, reviewing, Actions, contents, pull-request, or merge authority. A
webhook may be enabled only after REP-WORKFLOW-006, REP-WORKFLOW-007,
REP-WORKFLOW-017, REP-WORKFLOW-019, and the applicable rollout gates are
implemented and accepted. These facts are mutable and must be live-reverified by
immutable App/installation/repository/ruleset IDs at each capability gate and
before relevant use.

No autonomous runtime is approved or enabled. The current interactive OS
principal can access Jason's personal `gh` credentials and the App private key;
therefore this interactive Codex environment is not eligible as an autonomous
runtime. Activation requires the isolation and negative tests in
REP-WORKFLOW-017, a separate secret store, and removal of all interactive-home,
keychain, `gh`, App-key, and IPC paths from the workload.

## Audit, idempotency, and state

### REP-WORKFLOW-022 — Durable audit record

Every run records trigger and delivery IDs; raw-event journal reference; App
installation and workload identity; author, reviewer, and controller run IDs;
packet ID/revision/digest; repository and issue immutable IDs; authority snapshot
and exact subject/head SHA; actions attempted and reconciled; artifacts;
validation and attestation outcomes; state transitions; stop/retry/revocation/
supersession/merge results; deviations; and unresolved risk.

Public records contain safe traceability. Security-sensitive evidence remains in
the restricted journal and is referenced publicly only as allowed by
REP-WORKFLOW-019.

### REP-WORKFLOW-023 — Idempotency and convergence

Every logical operation has a stable key derived from immutable resource IDs,
packet revision/digest, operation kind, and where relevant exact head SHA.
Every mutation uses a transactional outbox: commit intent and key, let the
broker perform only that typed operation, reconcile by immutable IDs and remote
state, then mark complete. At-least-once delivery is assumed.

Operation-specific rules are:

- issues, comments, pull requests, and blockers carry a signed invisible marker.
  Marker schema `represent.operation-marker/1` is closed I-JSON with exact
  members: `schema`; `domain`=`represent-operation-marker-v1`;
  `operation_key`; decimal-string `repository_id`; UUID `packet_id`; integer
  `packet_revision`; `packet_digest`; UUID `work_item_id`; `operation_kind`
  (`create` or `update`); `resource_type` (`issue`, `issue-comment`,
  `pull-request`, or `blocker`); ASCII `logical_resource_id` (1..128);
  `content_digest`; closed `actor` with decimal-string `app_id` and
  `installation_id` plus ASCII `workload_identity` (1..128); integer
  `registry_version`; `registry_digest`; `algorithm`=`Ed25519`; ASCII `key_id`
  (1..128); integer `key_version`; UTC `created_at`; and unpadded base64url
  `signature` decoding to 64 bytes. Digests/operation key are lowercase 64-hex.

  `operation_key` is SHA-256 over ASCII `represent-operation-key-v1`, zero byte,
  and RFC 8785 of the closed tuple `{repository_id, packet_id,
  packet_revision, packet_digest, work_item_id, operation_kind, resource_type,
  logical_resource_id}`. Content digest is SHA-256 of the exact UTF-8 projected
  body after removing the one terminal marker and normalizing no bytes. The
  signature covers ASCII `represent-operation-marker-v1`, zero byte, and RFC
  8785 marker with only `signature` omitted. GitHub encoding is exactly terminal
  `<!-- represent-operation-marker-v1:<unpadded-base64url-canonical-json> -->`.

  The marker registry is the `represent.key-registry/1` `operation-marker`
  registry in REP-WORKFLOW-025. Rotation overlap is at most 24 hours. Verification
  uses journal receipt time; expired/unknown/revoked keys fail, and compromise
  quarantines every marker after last-trusted time pending authenticated
  reconciliation. Reconciliation requires both the
  immutable GitHub author/App identity expected by the operation registry and a
  valid marker/content digest; wrong author, invalid/colliding marker, or content
  mismatch fails closed;
- issues and blockers reconcile by recorded GitHub ID first and bounded search
  for authenticated matching markers second;
- comments update the one recorded comment ID when permitted, otherwise append
  one versioned successor linked to its predecessor;
- refs are created with exact ref name and expected SHA; `already_exists`
  succeeds only if SHA matches, otherwise it is a conflict;
- pull requests reconcile by immutable head repository ID, exact head ref/SHA,
  base repository/ref, and marker before creation;
- attestations use the one-use nonce and subject ledger; a second distinct
  envelope for the same reviewer/subject is a conflict unless it explicitly
  supersedes a rejected prior envelope; and
- merge follows REP-WORKFLOW-011 and is never automatically retried after an
  accepted request.

GitHub does not guarantee physical exactly-once creation for every timeout race.
If reconciliation discovers physical duplicates, it uses the durable outbox CAS
mapping—not visible order—to identify an already-recorded canonical resource.
If no unique mapping exists, it quarantines every candidate and requires
authenticated reconciliation; it never adopts the earliest resource merely
because its marker is visible. Noncanonical duplicates are retained and linked
after resolution. Execution never continues while identity/content conflicts
remain.
Leases are expiring and fenced before external acceptance; stale holders cannot
publish after a newer fence, revision, revocation, or head SHA.

### REP-WORKFLOW-024 — State model and CAS transitions

The service maintains three distinct aggregates. Every transition is an atomic
CAS over the aggregate key, lifecycle state/version, both revision pointers, and packet fence
generation. Failure leaves state unchanged and journals the conflict. One packet
may own many concurrent work items and pull requests.

**Packet/objective lifecycle.** Key: `(repository_id, packet_id, revision,
digest)`.

| From | Authenticated trigger and guard | To |
| --- | --- | --- |
| pointers null | state service stores valid revision 1 | pending points to `proposed`; current null |
| pending `proposed` | exact pending `CANCEL v1` | pending revision `cancelled`; pending pointer null; current unchanged |
| pending `proposed`, current null | exact pending approval | pending clears; current points to `approved` |
| pending `proposed` | valid newer chained proposal CAS | old pending `superseded`; pending replaced; current unchanged |
| current `approved` | scheduler opens at least one child under current fence | same current tuple `executing` |
| current `approved` or `executing`, pending null | state service detects material boundary and stores chained successor | current remains authoritative `paused-material-change`; pending points to successor `proposed` |
| paused current plus pending successor | exact pending `CANCEL v1` | successor `cancelled`; pending null; current/pause unchanged |
| paused current plus pending successor | exact pending approval | atomically old current `superseded`; pending becomes current `approved`; pending null; new open fence |
| paused current, pending null after cancellation | exact DECIDE rollback option and proved safe rollback | current exact predecessor state/version; new open fence |
| current `approved`, `executing`, or `paused-material-change` | exact current `REVOKE v1` | current revision `revoked`; current pointer null; pending unchanged but inert |
| current standing `approved`, `executing`, or `paused-material-change` | expiry/cadence time CAS | current revision `expired`; current pointer null; `standing-expired` fence; pending unchanged but inert |
| current `executing` | all children terminal, success criteria proven | revision `completed`; current pointer null |
| any | invalid schema/signature/binding | unchanged; attempt `validation-failed` |

**Work-item lifecycle.** Key: `(repository_id, packet_id, revision, digest,
work_item_id)`, where `work_item_id` is an immutable lowercase UUID assigned
before scheduling. Parent/child edges name immutable work-item IDs; sibling
items may run concurrently.

| From | Authenticated trigger and guard | To |
| --- | --- | --- |
| none | authorized decomposition under open current packet fence | `queued` |
| `queued` | fenced lease and stage gates pass | `active` |
| `active` | non-material decision context emitted | `decision-queued` |
| `active` or `decision-queued` | blocker recorded | `blocked` |
| `decision-queued` or `blocked` | exact accepted resolution and same/open successor fence | `active` |
| `active` | work evidence complete; owned PRs terminal as required | `completed` |
| `queued`, `active`, `decision-queued`, or `blocked` | parent packet fence changes to revoked/superseded/standing-expired | `fenced` |
| any nonterminal | unrecoverable validation failure | `failed` |

**Per-PR review/merge lifecycle.** Key: `(repository_id,
pull_request_immutable_id, packet_id, revision, digest, head_sha)`. A new head
SHA creates a new subject version and makes earlier review/eligibility stale.

| From | Authenticated trigger and guard | To |
| --- | --- | --- |
| none | PR identity/head bound to authorized work item | `drafting` |
| `drafting` | exact head and authority snapshot ready | `reviewing` |
| `reviewing` | rejection/check failure | `changes-required` |
| `changes-required` | new exact head subject created | prior `stale`; new `drafting` |
| `reviewing` | valid attestation/protected checks for same subject | `merge-eligible` |
| `merge-eligible` | packet fence wins before broker acceptance | `fenced` |
| `merge-eligible` | controller CAS and broker acceptance win | `merge-request-in-flight` |
| `merge-request-in-flight` | packet revoke/supersede/standing-expired fence arrives | `revocation-pending` |
| `merge-request-in-flight` or `revocation-pending` | conclusive success | `merged` |
| `merge-request-in-flight` or `revocation-pending` | conclusive failure | `merge-failed` then `fenced` if parent fenced |
| `merge-request-in-flight` or `revocation-pending` | ambiguous result | `merge-unknown/reconciliation-required` |
| `merge-unknown/reconciliation-required` | separately authorized proof | `merged` or `merge-failed`/`fenced` |

Pause and security are orthogonal packet fence records, not lifecycle states.
The fence is `(packet key, generation, mode, predecessor_state,
predecessor_version)`, with mode `open`, `paused`, `paused-security`, `revoked`,
`superseded`, or `standing-expired`. Pause/kill-switch/standing expiry increments generation and blocks every new
child/outbox/broker action. Resume is permitted only for `paused` or
`paused-security`, after its gate, and CASes the exact recorded predecessor
state/version into a new open generation; it never resumes `revoked` or
`superseded` or `standing-expired`.

Revocation/supersession atomically changes the packet lifecycle and fence
generation in one state-service transaction before scheduling any child
transition. Every child operation includes that generation and therefore
stops on mismatch. Each PR already accepted by the merge broker independently
reconciles under `revocation-pending`; all not-yet-accepted sibling PRs and work
items fence immediately. Thus one accepted merge can reconcile while other
children stop, without collapsing the packet into one PR state. Labels may
mirror these aggregates but never cause transitions.

### REP-WORKFLOW-025 — Manual genesis and trust roots

Before the first autonomous capability, Jason performs one foreground manual
genesis ceremony under REP-WORKFLOW-000. It inventories the pre-journal App,
installation, repository, ruleset, webhook-disabled state, administrators, and
planned trust roots without pretending those earlier acts were journalled.

Every configuration digest below identifies a closed canonical
`represent.configuration-snapshot/1` object with exact members `schema`,
`domain`=`represent-configuration-snapshot-v1`, `kind`, decimal-string
`repository_id`, UTC `captured_at`, closed `payload`, and `digest`. `kind` and
its only permitted payload members are:

- `app-registration`: decimal `app_id`/`owner_id`, ASCII `slug`, booleans
  `public`, `oauth_enabled`, `device_flow_enabled`, `webhook_active`, closed
  permission map (`metadata`, `issues`, `contents`, `pull_requests`, `actions`,
  `checks`, each `none`/`read`/`write`), and unique sorted event enum array;
- `installation`: decimal `installation_id`/`app_id`/`account_id`,
  `account_type` (`User` or `Organization`), `repository_selection`=`selected`, unique sorted
  decimal repository IDs, nullable suspension timestamp, and the same permission
  map;
- `ruleset`: decimal `ruleset_id`, ASCII name, `enforcement`=`active`, exact
  target/include/exclude refs, sorted decimal bypass actor IDs, closed pull
  request rule (minimum approvals, stale-dismissal and thread-resolution
  booleans), sorted required checks with ASCII context, decimal integration ID,
  and strict boolean, plus deletion/non-fast-forward booleans;
- `webhook`: boolean active, lowercase-hex URL digest, `content_type`=`json`,
  ASCII secret-version ID, and unique sorted subscribed event enums;
- `broker`: ASCII broker ID, decimal repository ID, sorted allowed endpoint
  enums, sorted role identities, kill-switch-store digest, network-policy digest,
  and boolean generic-forwarding-disabled;
- `journal`: decimal journal ID, ASCII WORM store ID, integer retention days,
  append/read/admin principal arrays, journal-registry digest, integer maximum
  body bytes, and checkpoint-destination digest; and
- `checkpoint-policy`: integer maximum interval seconds, booleans
  before-approval and before-autonomous-merge, checkpoint-verifier registry
  digest, destination digest, and integer retention days.

Both App and webhook event arrays contain only `issues`, `issue_comment`,
`pull_request`, `pull_request_review`, `check_run`, `check_suite`, `push`,
`workflow_run`, `installation`, or `installation_repositories`. Broker endpoint
enums are only `issue-read`, `issue-create`, `issue-comment-create`,
`issue-comment-update`, `ref-create`, `owned-ref-update`,
`pull-request-create`, `pull-request-update`, `check-publish`, or
`pull-request-merge`; generic URLs/methods are not representable. Ruleset field
names are exactly `ruleset_id`, `name`, `enforcement`, `target`, `include_refs`,
`exclude_refs`, `bypass_actor_ids`, `pull_request_rule`, `required_checks`,
`block_deletion`, and `block_non_fast_forward`, with `target=branch` and refs
using the standing clause's ASCII path character discipline plus optional
literal `refs/heads/` prefix.

All ASCII strings are 1..256 bytes; arrays are unique, lexicographically sorted,
and bounded to 100; unknown/duplicate payload members fail. Snapshot digest is
`SHA256(FRAME(ASCII("represent-configuration-snapshot-v1")) ||
FRAME(ASCII(kind)) || FRAME(RFC8785(snapshot without digest)))`, with the
result displayed as lowercase hex. Thus each kind has an explicit domain frame
and cannot be substituted for another.

For the current bootstrap/genesis, the installation snapshot must bind
`account_type=User` and `account_id=35118`, the immutable owner identity for
`Ustice`. Either an Organization account type or any other account ID blocks
genesis verification and activation.

The ceremony creates a closed I-JSON `represent.genesis-manifest/1` with exact
members: `schema`; `domain`=`represent-genesis-manifest-v1`; UUID `genesis_id`;
decimal-string `repository_id`, `app_id`, `installation_id`, and `journal_id`;
ASCII `app_slug`; lowercase-hex digests for `app_registration_config`,
`installation_config`, `repository_ruleset_config`, `webhook_config`,
`broker_config`, `journal_config`, `checkpoint_policy`, `journal_key_registry`,
`reviewer_key_registry`, `operation_marker_key_registry`, and
`checkpoint_verifier_registry`; array `administrators` of 1..20 closed objects
with `role` (`security-admin`, `journal-admin`, `root-custodian`, or
`recovery-admin`), `principal_type` (`github-user` or `offline-principal`), and
ASCII `principal_id`; array `initial_capability_gates` of every REP-WORKFLOW-020
stage with boolean `enabled` (all false except journal observation); UTC
`created_at`; closed `automation_objective` with decimal-string issue ID and
acceptance comment ID, objective digest, policy commit SHA, and UTC acceptance
time; `offline_root_key_id`; `offline_root_public_key` as unpadded
base64url raw 32-byte Ed25519 key; `algorithm`=`Ed25519`; `manifest_digest`; and
closed `root_signature`. Unknown/duplicate fields fail.

`manifest_digest` is SHA-256 over ASCII `represent-genesis-manifest-v1`, zero
byte, and RFC 8785 manifest with `manifest_digest` and `root_signature` omitted.
`root_signature` uses closed schema `represent.root-signature/1` with domain
`represent-offline-root-signature-v1`, ASCII `subject_schema`, lowercase-hex
`subject_digest`, `root_key_id`, UTC `signed_at`, algorithm `Ed25519`, and
unpadded base64url 64-byte `signature`. It signs `FRAME(domain) ||
FRAME(subject_schema) || FRAME(subject_digest_raw32)`. Here it binds the genesis
schema and manifest digest. Jason verifies and pins the offline-root key
ID, public key, and manifest digest in the public bootstrap record and a second
independently controlled offline record. Root custody is outside all runtimes.

Every journal, reviewer, operation-marker, and checkpoint-verifier registry uses
closed `represent.key-registry/1`: `schema`; domain
`represent-key-registry-v1`; `purpose` (`journal`, `reviewer`,
`operation-marker`, or `checkpoint-verifier`); integer `registry_version`;
nullable `previous_registry_digest`; UTC `issued_at`; 1..100 unique closed
`entries`; `registry_digest`; and closed `root_signature`. Each entry has ASCII
`principal_identity`, nullable decimal-string `app_id`/`installation_id`, ASCII
`key_id`, integer `key_version`, unpadded base64url raw 32-byte Ed25519
`public_key`, UTC `not_before`/`not_after`, `status` (`active`, `revoked`, or
`compromised`), nullable UTC `revocation_effective_at` and
`compromise_last_trusted_at`, and nullable bounded `reason`. The registry digest
is exactly
`SHA256(FRAME(ASCII("represent-key-registry-v1")) || FRAME(ASCII(purpose)) ||
U64(registry_version) || FRAME(previous_digest_raw32_or_32_zero_bytes) ||
FRAME(RFC8785(registry without registry_digest and root_signature)))`; displayed
hex is lowercase. The root envelope binds schema plus registry digest. Version and digest chains are
gapless, entries cannot overlap for the same identity/key except the stated
24-hour rotation window, and revocation/compromise semantics are those defined
by the consuming clause.

The new WORM journal's sequence 1 raw payload is the exact signed manifest and
its metadata type is `genesis`. The independent verifier validates the pinned
root/signature, configuration digests, registries, empty prior chain, and WORM
position, then publishes the first external checkpoint. No autonomous
capability activates until that checkpoint and the two root pins agree. Every
post-genesis App/installation/webhook/key/registry/broker/admin/gate change is a
normal journalled, alerted configuration transition; no manifest is rewritten.

## Observable validation scenarios

The implementation issues must turn these into executable workflow tests with
synthetic credentials and fixtures. Tests prove conformance to accepted workflow
authority; they do not become product authority.

### REP-PACKET-001 — Packet canonicalization

Equivalent input serialized with different key order or insignificant
whitespace reconstructs the same RFC 8785 digest; changed array order, Unicode
content, repository ID, issue ID, packet ID, revision, predecessor, or objective
produces a different digest. Duplicate/unknown members, invalid UTF-8/I-JSON,
wrong types, noncanonical IDs/timestamps, oversized input, a broken revision
chain, or a supplied digest not matching recomputation fails.
Pointer fixtures prove one nullable current authority and one nullable pending
successor, reject a proposal in current, reject authority in pending, and reject
every terminal/cancelled revision in either pointer.

### REP-APPROVAL-001 — Approval authenticity

A correctly signed `issue_comment.created` delivery from both immutable actor
fields equal to `35118`, for the exact repository, issue, comment, packet,
revision, digest, and GitHub-assigned comment ID records one approval regardless
of which Jason-controlled GitHub credential produced it. Wrong signature,
edited event, reaction, bot/App actor, displayed-name match with wrong ID, wrong
repository/issue/comment, stale revision/digest, non-ASCII/CRLF, reordered or
extra lines, whitespace/case deviation, or self-authored comment-ID field
records no authority.

A fixture with a valid 20-digit GitHub ID above JavaScript's safe-integer range
must compare losslessly and succeed when bound correctly; the same payload
rounded through IEEE-754, over 20 digits, exponent-form, or otherwise
noncanonical must fail. `CANCEL` succeeds only for proposed state and `REVOKE`
only for the current authority. APPROVE/CANCEL with stale/nonpending tuples and
REVOKE with pending/noncurrent tuples fail; successor approval performs one
authority swap and clear, while cancellation only terminally clears pending.

### REP-BOUNDARY-001 — Manual versus autonomous authority

Jason can manually configure bootstrap infrastructure, approve an ordinary PR,
merge under the ruleset, and perform recovery without the autonomous webhook or
controller path. Replaying any record, credential, or artifact from that manual
operation in an autonomous runtime grants no authority. Conversely, an
autonomous runtime cannot substitute an interactive action for a missing packet
or gate.

### REP-IDEMPOTENCY-001 — At-least-once approval convergence

Deliver the same valid webhook twice, crash after journal append, and retry. One
journal record is accepted, duplicates are linked, one approval transition
exists, and work is scheduled at most once. Reuse the delivery UUID with a
different body and verify a closed failure and private alert.

### REP-IDEMPOTENCY-002 — At-least-once publication convergence

Crash separately before and after creating an issue comment, branch, pull
request, blocker, and attestation. Each retry uses the typed outbox and
operation-specific reconciliation. The final state has one canonical logical
resource; unavoidable physical duplicates are linked and quarantined, never
silently treated as successful exactly-once creation.

### REP-MARKER-001 — Authenticated reconciliation markers

The exact expected App/workload author plus valid marker signature and projected
content digest reconciles to the recorded outbox mapping. A visible marker from
the wrong actor, copied signature, operation-key collision, altered content, or
multiple valid-looking resources without a unique CAS mapping quarantines all
candidates and fails closed; creation time alone never selects one.
Golden cases verify exact operation-key tuple/framing, resource enum, actor
App/installation/workload binding, terminal marker encoding, signature preimage,
registry version/digest, rotation, ordinary revocation, and compromise
last-trusted quarantine.

### REP-REVIEW-001 — Immutable review

A reviewer accepts head SHA A. Pushing SHA B makes the attestation ineligible.
An authoring workload cannot sign or successfully submit reviewer evidence.
Only a canonical, unexpired, non-revoked, nonce-fresh allow-listed reviewer
signature for the exact packet, authority snapshot, and SHA can restore
eligibility and let the isolated publisher create that exact-SHA check.
Fixtures cover every exact member/type/bound, commit-versus-tree mismatch,
findings/check digest mismatch, open blocking findings, invalid 64-byte
base64url signature encoding, wrong registry digest/version, five-minute skew,
expiry, nonce replay, ordinary effective-time revocation, compromise
last-trusted-time revocation, rotation overlap, malformed option IDs, and every
context/resolution/selected-option/finding/consequence risk-binding mismatch.

### REP-MERGE-001 — Revocation/merge race

Run revocation and merge concurrently under both deterministic orderings. When
revocation linearizes first, no merge request occurs. When the merge claim
linearizes first, at most one merge request is accepted. An ambiguous timeout
enters `merge-unknown/reconciliation-required`, does not expire/release/retry,
and keeps revocation pending until separately authorized reconciliation proves
the outcome.

### REP-MATERIALITY-001 — Materiality

Changing scope, exclusions, success criteria, authority, guarantee, data access,
permissions, risk, or visible effects requires reapproval and blocks the old
revision. Reordering two independent tasks or replacing an internal tool with
identical approved observables does not. An arbitrary public proposal does not
pause work; only an authorized service's recorded detection of material scope
does. An ambiguous example fails closed into the decision queue.

### REP-STATE-001 — Concurrent child lifecycle and fencing

One approved packet runs two work items and two PR subjects concurrently.
Revocation atomically increments the packet fence: queued/active work and the
not-yet-accepted PR stop, while exactly one broker-accepted PR moves through
`revocation-pending` and deterministic reconciliation. A head change invalidates
only its PR subject. Pause/resume restores only the exact recorded predecessor
state/version; stale generation and attempted revoked/superseded resume fail.
A proposed successor may supersede only a proposed predecessor. Creating a
successor for approved/executing work leaves the old revision authoritative but
paused; successor approval atomically supersedes/open it, while successor cancel
leaves pause in place until an exact rollback decision and proof resumes old.
Races exercise both pointer record versions: no transaction can leave two
current authorities, a cancelled pending pointer, or a superseded current
pointer.

### REP-STANDING-001 — Standing-authority schema and expiry

Valid scope/class/effect/risk/data/start/expiry/cadence admits only matching
regressions during its interval. Before start, after expiry/cadence, outside a
path, raw-prefix-only lookalike (`src/a` versus `src/ab`), `..`, backslash,
Unicode alias, matching typed exclusion, disallowed class/effect, higher risk/data impact, or security classification
blocks intake and every not-yet-broker-accepted merge. Expiry during execution
fences children under REP-WORKFLOW-024 while already accepted requests only
reconcile. The earlier timestamp/cadence boundary atomically produces terminal
`expired`, clears current authority, increments `standing-expired`, and cannot
be resumed or re-pointed; races immediately before/at/after the boundary have
deterministic CAS outcomes.

### REP-DECISION-001 — Decision-context completeness

Unknown/missing fields, duplicate option IDs, recommendation not naming an
option, invalid reversibility, absent affected/safe-parallel/resume information,
or digest mismatch fails. A valid context pauses only its named work item unless
the recorded materiality decision changes the packet fence.

An exact `DECIDE v1` comment for a current context and listed option creates one
resolution and resumes only after its conditions pass. Wrong/stale packet or
context digest, unlisted option, malformed whole body, replay, second identical
selection, or conflicting second option causes no second transition; duplicates
link idempotently and conflicts fail closed. Reject/defer text has no effect
unless represented by and selected as a listed option.
Cases include valid 1- and 64-character IDs and reject uppercase, leading digit,
empty/65-character, slash, whitespace/control, Unicode, and any
recommended/selected ID absent from the option set.

### REP-IDENTITY-001 — Credential and permission isolation

With App credentials absent and a valid personal `gh` credential and unrelated
App key present on the interactive host, the isolated workload cannot read,
mount, inherit, IPC-proxy, or use either and fails closed. Author/reviewer
workers cannot reach merge egress or protected-check publishing; the
merge-controller broker accepts only its exact allow-listed endpoint and bound
parameters. Fork payloads cannot access secrets or produce authority.

### REP-BRANCH-001 — Branch and untrusted-head enforcement

Before required rules and no-bypass conditions are proven, merge capability is
disabled. A stale check, stale head SHA, missing authority, invalid attestation,
or bypass attempt fails. Fork/untrusted heads execute only in the specified
secretless disposable worker; submodules, workflows, hooks, privileged network,
and unverified artifacts remain disabled. The exact eligible head with all
current evidence is the only mergeable subject.

### REP-RECOVERY-001 — Kill switch and compromise recovery

Activating the global switch during queued and active operations prevents token
minting and every not-yet-broker-accepted mutation, fences stale workers, and
journals denials. Already externally accepted or in-flight requests enter
reconciliation and are not falsely claimed cancelled.
Rotated credentials alone do not re-enable automation; explicit Jason-controlled
reenablement after independent recovery verification is required.

### REP-JOURNAL-001 — Journal framing and truncation

Golden vectors verify U32/U64 big-endian framing, raw-versus-hex hash use,
sequence 1 zero predecessor, metadata/body length boundaries, record hash,
Ed25519 envelope, registry rotation/revocation, and external checkpoint. Byte
mutation, length ambiguity, gap, duplicate/rollback/truncation, wrong registry,
or invalid checkpoint verifier signature fails before authority emission.

### REP-GENESIS-001 — Genesis ceremony

A foreground ceremony with pinned offline root, exact manifest/config and
registry digests, accepted objective evidence, journal sequence 1, and verified
external checkpoint permits only the declared initial observation gate. Missing
or mismatched root pin, App/installation/config/admin/objective digest, registry,
sequence-1 payload, WORM position, or checkpoint blocks all activation.
Post-genesis changes must appear as later journalled and alerted records.
Golden vectors cover every closed configuration payload and digest equation;
unknown members, unsorted arrays, kind/payload mismatch, field mutation, kind
substitution, registry frame/order/purpose/version/predecessor changes, or root
signature mismatch fail. Installation fixtures separately reject
`account_type=Organization`, any value outside the `User | Organization` enum,
and any `account_id` other than `35118` for the current Ustice genesis.

### REP-ADMIN-001 — App and webhook administration

An autonomous runtime cannot change App permissions/subscriptions, webhook URL
or secret, keys, installation, or broker trust. A Jason-controlled administrator
can perform a journalled change and authenticated alert; missing before/after
digest, alert, or journal record disables the relevant capability. Dual-secret
rotation accepts the intended version only during the bounded window.

### REP-AUTHORITY-001 — Authority versus evidence

A passing test that asserts behavior absent from accepted specifications or
decisions cannot authorize implementation or merge. An accepted clause with a
failing discriminating test blocks merge as missing evidence rather than being
silently weakened.

### REP-SECURITY-001 — Security confidentiality

A synthetic vulnerability report routes only to the private channel and creates
at most a non-exploitable public status. Public comments, prompts, or linked
content cannot cause restricted evidence or credentials to be disclosed.

At #9 design acceptance, each scenario must have a mapped **DRAFT** test-evidence
record in the format required by REP-TEST-008, including proposed owning
authority, oracle, regression, boundary, discrimination checks, diagnostics,
and semantic coverage units. A draft is not executable evidence. Each owner
completes and independently reviews executable evidence only at its capability
gate. Ownership is:

| Scenario | Implementation/evidence owner |
| --- | --- |
| REP-PACKET-001, REP-APPROVAL-001, REP-BOUNDARY-001, REP-IDEMPOTENCY-001, REP-IDENTITY-001, REP-JOURNAL-001, REP-GENESIS-001, REP-ADMIN-001, REP-SECURITY-001 intake path | #10 units, integrated and adversarially validated by #11 |
| REP-IDEMPOTENCY-002 and REP-MARKER-001 for public state/intake resources | #10 units and #11 |
| REP-REVIEW-001 and attestation convergence | #13 |
| REP-MATERIALITY-001, REP-DECISION-001, and decision/blocker convergence | #15 |
| REP-STATE-001 and REP-STANDING-001 intake/expiry | #10/#11, re-exercised by every consuming stage |
| REP-IDEMPOTENCY-002 for branches/pull requests and REP-BRANCH-001 | #12 for design, #14 for implementation |
| REP-MERGE-001 and merge portion of REP-RECOVERY-001 | final separate merge-controller issue |
| REP-AUTHORITY-001 and non-merge recovery gates | #11, then re-exercised at every later stage |

## Draft REP-TEST-008 evidence records

All records below have status `DRAFT`; no executable result is claimed. “Cases”
means every positive and negative fixture enumerated in the named scenario.

| ID | Classification | Subtype | Owning authority | Observable and oracle | Regression caught | Smallest boundary | Static/runtime distinction | Cases | Discrimination | Expected diagnostic | Coverage unit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REP-PACKET-001 | workflow validation | governance/security gate | REP-WORKFLOW-005 | parser/digest accepts exactly canonical current chain | alias, rounding, unknown-field, or stale packet accepted | packet parser plus snapshot store | runtime; TypeScript cannot validate bytes/canonicalization | scenario cases | mutate each bound field and framing byte | `PACKET_INVALID` with field/reason | one schema/digest/revision-chain decision |
| REP-APPROVAL-001 | workflow validation | authorization gate | REP-WORKFLOW-006/008 | exactly one bound actor-35118 transition | forged, malformed, stale, replayed, or rounded-ID approval | webhook verifier plus state CAS | runtime; types cannot prove GitHub signature/raw tokens | scenario cases including CANCEL/REVOKE | change one actor/binding/grammar/ID token at a time | `APPROVAL_REJECTED` with safe code | one approval/cancel/revoke transition |
| REP-BOUNDARY-001 | workflow validation | governance isolation | REP-WORKFLOW-000 | manual action works but emits no reusable autonomous capability | interactive credential/session survives handoff | foreground session handoff plus runtime intake | runtime; process lifetime/credential reachability is dynamic | scenario cases | attempt queue, lease, timer, callback, or credential reuse | `MANUAL_AUTHORITY_NOT_REUSABLE` | one manual/autonomous boundary |
| REP-IDEMPOTENCY-001 | workflow validation | reliability/security gate | REP-WORKFLOW-007/008 | duplicate deliveries converge to one transition | replay schedules twice or collision is ignored | receiver, journal, state CAS | runtime; crash ordering is dynamic | scenario cases | crash before/after journal and CAS; alter reused delivery body | `DELIVERY_DUPLICATE` or `DELIVERY_COLLISION` | one delivery/semantic key |
| REP-IDEMPOTENCY-002 | workflow validation | reliability gate | REP-WORKFLOW-023 | typed outbox yields one canonical logical resource | retry duplicates or adopts conflicting resource | outbox, broker, GitHub fixture | runtime external side effects | scenario cases per resource | crash at every intent/egress/reconcile boundary | `RECONCILIATION_QUARANTINED` | one operation/resource type |
| REP-MARKER-001 | workflow validation | identity/integrity gate | REP-WORKFLOW-023/025 | only expected actor and valid signed content-bound marker reconcile | copied/forged/stale marker adopted | marker codec, registry, reconciler | runtime cryptographic/remote-author evidence | scenario cases | vary tuple, author, content, signature, registry, time | `MARKER_UNTRUSTED` with reason | one marker/resource/registry lifecycle |
| REP-REVIEW-001 | workflow validation | independent-review gate | REP-WORKFLOW-012/025 | exact subject/authority attestation alone publishes check | stale SHA, forged reviewer, bad risk acceptance, or revoked key passes | verifier, nonce ledger, check publisher | runtime; signatures/time/Git objects exceed types | scenario cases | mutate every member/digest/key/time/finding | `ATTESTATION_REJECTED` | one review subject and key lifecycle |
| REP-MERGE-001 | workflow validation | concurrency/safety gate | REP-WORKFLOW-011/013/014 | CAS ordering yields no retry and deterministic reconciliation | revoke race merges twice or unknown auto-retries | state service, merge broker, GitHub fixture | runtime distributed ordering | both orderings and timeout cases | force each linearization and response loss | `MERGE_UNKNOWN_RECONCILIATION_REQUIRED` | one PR/head merge claim |
| REP-MATERIALITY-001 | workflow validation | decision-rights gate | REP-WORKFLOW-009/010 | only defined nonmaterial changes continue without approval | scope/risk/guarantee expands silently | classifier plus packet fence | runtime policy facts; types cannot decide semantics | scenario cases | pair one allowed metadata change with each material mutation | `MATERIAL_DECISION_REQUIRED` | one observable dimension |
| REP-STATE-001 | workflow validation | concurrency/state gate | REP-WORKFLOW-010/024 | packet, work, and PR aggregates transition independently under one fence | successor prematurely supersedes; sibling escapes revoke | transactional state service | runtime CAS/concurrency | concurrent children, successor approve/cancel/rollback | race stale versions/generations and heads | `STATE_CAS_CONFLICT` or `PACKET_FENCED` | one aggregate transition/fence generation |
| REP-STANDING-001 | workflow validation | authorization/expiry gate | REP-WORKFLOW-015 | only in-scope, in-time, low-risk allowed class/effect enters or merges | expired/out-of-prefix/security work proceeds | standing parser plus intake/merge guard | runtime time/path classification | scenario cases | segment lookalikes, typed exclusions, boundary timestamps | `STANDING_AUTHORITY_INELIGIBLE` | one scope/class/effect/time decision |
| REP-DECISION-001 | workflow validation | human-decision gate | REP-WORKFLOW-016 | one exact listed-option resolution CASes and conditionally resumes named item | unlisted/stale/replayed decision resumes work | webhook verifier, context store, work CAS | runtime identity/state/binding | schema, grammar, duplicate/conflict, resume cases | mutate each binding/option and unsatisfied condition | `DECISION_REJECTED` or `RESUME_CONDITION_UNMET` | one context/resolution/work-item transition |
| REP-IDENTITY-001 | workflow validation | credential-isolation gate | REP-WORKFLOW-017/018 | isolated role cannot reach personal/cross-role credentials or forbidden egress | runtime falls back to host or broader token | isolated workload plus broker | runtime OS/IPC/network property | scenario cases | plant canary creds across mounts/env/keychain/IPC/network | `CREDENTIAL_PATH_BLOCKED` | one role/credential/egress path |
| REP-BRANCH-001 | workflow validation | untrusted-code gate | REP-WORKFLOW-013/014/018 | only exact trusted head/checks merge; fork executes secretless | fork/workflow/submodule gains secret or stale check merges | disposable worker plus rules/broker | runtime GitHub/worker behavior | scenario cases | malicious hook/workflow/submodule/artifact and stale SHA | `UNTRUSTED_HEAD_BLOCKED` | one head/execution/secret boundary |
| REP-RECOVERY-001 | workflow validation | operational-security gate | REP-WORKFLOW-020/024 | broker switch blocks new mutations; in-flight reconciles; exact predecessor resumes | kill switch bypass or false cancellation/resume | gate store, broker, state fence | runtime race/process isolation | scenario cases | switch at mint/egress/accepted boundaries and rotate-only recovery | `CAPABILITY_DISABLED` or `RECOVERY_NOT_VERIFIED` | one gate/operation/recovery transition |
| REP-JOURNAL-001 | workflow validation | audit-integrity gate | REP-WORKFLOW-007/025 | golden bytes/signatures/chain/checkpoint verify; mutation/truncation fails | ambiguous framing, rollback, invalid registry accepted | codec, WORM fixture, verifier | runtime bytes/crypto/storage | scenario cases | flip every frame/hash/signature/sequence/checkpoint class | `JOURNAL_INTEGRITY_FAILURE` | one record/registry/checkpoint chain |
| REP-GENESIS-001 | workflow validation | root-of-trust gate | REP-WORKFLOW-000/025 | pinned manifest at sequence 1/checkpoint enables only declared gate | circular/unpinned/mismatched bootstrap activates | manual ceremony verifier plus journal | runtime/manual evidence; types cannot establish custody | scenario cases including wrong installation account type/ID | omit/mutate each root/config/admin/objective/registry/checkpoint and substitute Organization or non-35118 installation owner | `GENESIS_NOT_VERIFIED` | one genesis manifest/root/gate |
| REP-ADMIN-001 | workflow validation | administrative-control gate | REP-WORKFLOW-017/020/025 | only security admin makes journalled alerted config change | runtime changes App/key/broker or silent admin drift persists | admin plane plus journal/alert/gate | runtime external administration | scenario cases | attempt each config mutation from each role and omit evidence | `ADMIN_CHANGE_UNVERIFIED` | one admin/config/gate transition |
| REP-AUTHORITY-001 | workflow validation | governance evidence gate | REP-WORKFLOW-001/014 | accepted spec/decision plus evidence required; tests alone cannot authorize | passing test invents semantics or failing test weakened | authority resolver plus eligibility guard | runtime governance graph; TS cannot prove acceptance | scenario cases | remove authority, fail evidence, substitute test-only claim | `AUTHORITY_MISSING` or `EVIDENCE_FAILED` | one authority-evidence eligibility edge |
| REP-SECURITY-001 | workflow validation | confidentiality gate | REP-WORKFLOW-004/019 | report/evidence stays private; public projection is sanitized | exploit/secret leaks via prompt/link/status | private intake plus public projector | runtime information flow | scenario cases | inject secrets/exploit text through each untrusted field | `SECURITY_CONTENT_WITHHELD` | one private/public disclosure edge |

## Phase -1 constraints

The current phase is Phase -1: Engineer the Design. This issue may produce
reviewed governance policy, threat models, executable workflow specifications,
and engineering-system validation. Any implementation exists only to clarify,
exercise, or make the accepted automation policy executable. It has no product
or compatibility status.

## Non-goals

This issue does not:

- implement or enable the workflows described here;
- expand the bootstrap GitHub App's permissions;
- select a hosting or orchestration vendor;
- define Represent product semantics;
- authorize a production package or phase transition;
- authorize agents to start unapproved objectives;
- make labels, machine comments, tests, or issue authorship authoritative;
- require Jason to approve each commit, pull request, or eligible merge; or
- expose security-sensitive information publicly.

## Implementation dependency order

No dependent workflow implementation begins merely because #9 is accepted. The
normative policy artifact must first be independently reviewed and merged to
`main`, the durable automation-governance objective must be explicitly accepted
either through the Jason-directed manual bootstrap workflow under
REP-WORKFLOW-000 or, once available, a canonical packet—not merely created—and
the relevant dependent issue must be revised. Dependencies are strict:

1. **#10 — Identity, approval, durable state, and intake.** Implement immutable
   identity/scope, webhook verification, journal, canonical packets, approval,
   revocation, deduplication, state transitions, private-channel prerequisite,
   and Issues-only status publication. Intake may schedule only approved work.
   Before execution, split #10 into independently grabbable, integrated units:
   (a) packet schema/snapshot/state/CAS and GitHub projection; (b) signed webhook
   receiver, journal, secret rotation, and deduplication; (c) isolated workload,
   broker, private channel, and capability gates; and (d) Issues intake,
   typed outbox, and convergence. No unit alone enables scheduling.
2. **#11 — Validation harness.** Exercise the threat model, packet binding,
   replay/idempotency/concurrency, credential isolation, prompt injection,
   kill-switch behavior, and permitted side effects before broader capability.
3. **#13 and #15 — Independent review, decision queue, and blocker protocol.**
   These may proceed in parallel after #11, but both must finish before design
   execution. #13 establishes distinct reviewer identity and attestations; #15
   establishes material-decision, blocker, private escalation, and resume flows.
4. **#12 — Design execution.** Run design work only within approved objectives,
   using #13 review evidence and #15 decision/blocker handling. It has no merge
   permission.
5. **#14 — Implementation execution.** Implement only accepted semantics within
   phase constraints and consume the established review/blocker protocols. It
   has no merge permission.
6. **New issue — Separate merge controller.** Create and implement this last,
   after branch rules, permission isolation, atomic revocation/merge ordering,
   exact-SHA checks, and all prior capabilities are independently accepted.

The former label-driven and `never merge` mechanisms in #10–#15 are candidate
mechanisms only. Each issue must be reconciled with these accepted clauses.

## Acceptance criteria

- [ ] Every `REP-WORKFLOW-*` clause is independently reviewed for operational
      clarity, consistency with repository authority, and testability.
- [ ] Every `REP-<AREA>-NNN` scenario has a mapped DRAFT REP-TEST-008 record at
      design acceptance, an identified owner, and deterministic outcome;
      executable completed evidence is required only at its capability gate.
- [ ] Autonomous-runtime approval accepts only a correctly signed, exact-bound
      `issue_comment.created` delivery from immutable user ID `35118`; ordinary
      Jason-directed manual approval/merge/bootstrap remains available but
      cannot be reused as autonomous authority.
- [ ] APPROVE/CANCEL guard only the exact pending successor; REVOKE guards only
      current authority. Atomic pointer swaps/clears never leave terminal or
      cancelled revisions in either pointer.
- [ ] Closed decision-resolution schema and exact `DECIDE v1` grammar bind one
      listed option to the exact current context; replay/stale/conflict is
      idempotent or fails closed and resume checks conditions.
- [ ] Webhook IDs, including values above JavaScript safe integer, are parsed and
      compared without loss.
- [ ] Personal credentials are structurally unavailable to automation, not just
      prohibited by convention.
- [ ] The interactive Codex/OS environment is excluded; isolated principals,
      secret-store/IPC/network boundaries, and negative credential tests are
      hard activation prerequisites.
- [ ] The external tamper-evident journal, immutable IDs, delivery deduplication,
      canonical digest, fork policy, and at-least-once convergence are specified.
- [ ] Product authority is limited to accepted specifications and decisions;
      tests remain evidence.
- [ ] Material changes, revocation, supersession, review invalidation, and
      revocation/merge races fail closed with deterministic outcomes.
- [ ] Separate packet, work-item, and per-PR CAS models permit concurrent
      children while atomic packet fencing stops all but independently
      reconciling broker-accepted requests.
- [ ] Successor creation pauses but does not supersede approved authority;
      approval supersedes atomically, while cancellation leaves pause until a
      proved rollback decision.
- [ ] Closed standing-authority, decision-context, and decision-resolution schemas cover every
      required input; standing expiry blocks intake and eligible merge.
- [ ] Standing time/cadence expiry atomically creates terminal `expired`, clears
      current authority, increments `standing-expired`, fences all unaccepted
      work, and preserves accepted-request reconciliation only.
- [ ] Standing paths use canonical ASCII POSIX segments, segment-aware matching,
      and typed exclusions with no free-form enforcement.
- [ ] Reconciliation adopts only an authenticated expected actor, signed marker,
      matching content digest, and unique durable mapping—never visible order.
- [ ] Operation marker schema, key derivation, signature preimage, actor/resource
      enums, and offline-root registry lifecycle are closed and deterministic.
- [ ] Reviewer envelopes, findings/checks, Git snapshots, key registry,
      receipt/skew, replay, rotation, and revocation rules are exact and tested.
- [ ] Accepted-risk findings cryptographically bind the exact typed context,
      DECIDE resolution, selected option, finding ID, and consequence digest.
- [ ] Author, reviewer, approval receiver, and merge controller capabilities are
      separated, with attestations the author cannot forge.
- [ ] Autonomous merge remains disabled until enforced required checks, no
      bypass, exact-SHA eligibility, private security channel, kill switch, and
      compromise recovery have independent acceptance evidence.
- [ ] The bootstrap App state is recorded without treating it as expanded
      authority.
- [ ] An offline-root-signed genesis manifest, pinned root, accepted objective,
      journal sequence 1, trust registries, and external checkpoint exist before
      any autonomous capability activates.
- [ ] Every genesis configuration kind has a closed snapshot schema and exact
      kind-separated digest; registry digest framing/order is fully specified.
- [ ] App/webhook/key/installation/broker administration belongs only to the
      Jason-controlled security principal and changes are journalled/alerted.
- [ ] Dated bootstrap facts are live-reverified at every applicable gate.
- [ ] Every draft evidence record uses classification exactly
      `workflow validation`, with the more specific category in `Subtype`.
- [ ] The full policy publishes through a reviewed repository document; #9 is
      reduced to a concise linked design record rather than exceeding GitHub's
      issue-body limit.
- [ ] #9 acceptance produces `docs/agent-automation-policy.md`; no authority
      begins until its independently reviewed revision lands on `main`.
- [ ] The durable automation objective is explicitly accepted through the
      manual bootstrap workflow or a future canonical packet, not merely
      created.
- [ ] The private channel ACLs, authenticated alerts, journal encoding/WORM
      checkpoints, rollout gate ownership/rollback, full state/CAS table, and
      operation-specific outbox convergence receive independent acceptance.
- [ ] The strict #10, #11, #13/#15, #12, #14, merge-controller dependency order
      is reflected in revised dependent issues.
- [ ] Adversarial security, skeptical maintainer, GitHub feasibility, and
      workflow/test-quality reviewers independently accept the final revision.

## Required independent review

- adversarial security reviewer;
- skeptical maintainer reviewer;
- GitHub App and Actions feasibility reviewer; and
- workflow and test-quality reviewer.

Review must attempt to defeat signature and actor verification, canonical packet
binding, revocation/merge ordering, delivery and semantic deduplication,
idempotent recovery, reviewer isolation, branch enforcement, least privilege,
kill switch, security confidentiality, manual/autonomous scoping, packet-child-PR
fencing, standing expiry, typed decision context, authenticated markers,
lossless large-ID handling, genesis/root pinning, journal framing/checkpoints, and the human/agent
decision boundary.

## Dependencies

- Depends on merged workflow and continuity work from #3, #4, and #5.
- Blocks #10–#15, the new merge-controller issue, and all derived workflow
  implementation.
- Does not authorize a phase transition.
