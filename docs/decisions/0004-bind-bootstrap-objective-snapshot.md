# ADR 0004: Bind the bootstrap objective to a canonical snapshot comment

- Status: proposed
- Date: 2026-07-18
- Objective: #26
- Owning issue: #27

## Context

REP-WORKFLOW-000 requires a one-time manual bootstrap objective before #10 can
begin. The accepted text names the concepts in the objective snapshot but does
not enumerate the closed JSON schema, distinguish the reviewed policy subject
from the policy revision landed on `main`, or identify a durable snapshot that
the approval digest binds.

Consequently, multiple incompatible JSON objects and policy commits satisfy the
same prose while producing different objective digests. A digest-only approval
also cannot tell a later genesis verifier which exact snapshot bytes Jason
approved. Issue #27 records the minimal conflicting examples.

## Decision

Propose a two-comment manual bootstrap protocol:

1. Jason publishes one exact whole-body snapshot comment containing a fixed
   header followed by one line of already-canonical RFC 8785 JSON.
2. Jason publishes one exact whole-body approval comment that binds the
   snapshot's GitHub-assigned comment ID, its domain-separated SHA-256 digest,
   the objective issue, repository, and the accepted policy commit on `main`.
3. The bootstrap snapshot has exactly the members and bounds stated in
   REP-WORKFLOW-000. It uses `explicit_exclusions`, matching the canonical
   packet vocabulary in REP-WORKFLOW-005.
4. `policy_commit_sha` is the exact `merge_commit_sha` GitHub returns for the
   independently accepted policy pull request. It must be reachable from
   `refs/heads/main`, and the policy blob at that commit must equal the reviewed
   blob byte for byte. Neither the reviewed subject nor a later descendant is
   eligible.
5. Because the comments precede the webhook receiver, the genesis ceremony uses
   their current REST objects to verify `comment.user.id=35118`,
   `comment.user.type=User`, exact bodies, current unedited indicators, numeric
   comment-ID order, and timestamps. It does not claim access to a historical
   webhook `sender` field.
6. The signed genesis manifest carries both exact comment bodies and both
   GitHub-assigned comment IDs. The manifest, journal sequence 1, and external
   checkpoint provide durability; GitHub comment bodies remain mutable and
   deletable evidence inputs.
7. The bootstrap evidence's `accepted_at` is exactly the approval comment's REST
   `created_at`; the manifest's top-level `created_at` separately records the
   later ceremony time.

This decision remains proposed until independently reviewed and accepted. No
bootstrap approval or dependent implementation may rely on it before the
accepted revision lands on `main`.

## Alternatives considered

### Infer the schema from the original prose

Rejected because a closed authority-bearing object cannot leave field names,
types, bounds, or policy-commit semantics to implementer inference.

### Bind only the reviewed policy subject commit

Rejected because it proves what reviewers saw but not that the accepted policy
became authority on the default branch.

### Put both reviewed and landed policy commits in the snapshot

Credible but not selected. The landed commit must contain the independently
accepted content, so verifying that content and its review evidence supplies the
required connection without adding a second commit field.

### Store the snapshot only in the editable objective issue body

Rejected because Markdown extraction would need another canonical grammar and
later edits would obscure which exact bytes the approval digest named.

### Wait for #10 and use a normal canonical decision packet

Rejected because #10 cannot begin until this bootstrap objective is accepted;
waiting for #10 creates the cycle the manual bootstrap exists to break.

## Consequences

- Bootstrap authority becomes reproducible from exact bytes, GitHub-assigned
  comment IDs, and signed genesis evidence rather than inferred from prose.
- The approval grammar gains `snapshot_comment_id`; existing bootstrap comments
  do not exist, so there is no compatibility impact.
- The policy commit can be known only after the accepted revision lands on
  `main`. The snapshot and approval comments therefore occur after that merge.
- The manual foreground session must publish and verify two comments before the
  genesis ceremony records authority.
- The protocol remains one-time bootstrap evidence and grants no reusable
  personal credential or autonomous merge authority.

## Review evidence

- Reviewer: independent adversarial security and workflow reviewer
- Outcome: accepted after two correction rounds
- Evidence reviewed: #26, #27, REP-WORKFLOW-000, REP-WORKFLOW-005 through
  REP-WORKFLOW-008, REP-WORKFLOW-017, REP-WORKFLOW-020, and REP-WORKFLOW-025
- Unresolved disagreements: None — all canonicalization and evidence-binding
  findings were resolved on the reviewed branch
- Accepted on: Not accepted — Jason's material decision is pending
