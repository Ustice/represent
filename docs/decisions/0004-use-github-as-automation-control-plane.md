# ADR 0004: Use GitHub as the automation control plane

- Status: accepted
- Date: 2026-07-18
- Objective: #26
- Owning issues: #25 and #27

## Context

The first accepted automation policy attempted to construct a control plane
beside GitHub. It specified canonical decision packets, digests, a special
bootstrap ceremony, a durable state service, append-only journals, external
checkpoints, workload signing, and a separate merge controller.

That design duplicated identities, events, state transitions, audit history,
review gates, and merge protection that this small GitHub-hosted project already
receives from GitHub. The extra system also created issue #27's bootstrap cycle:
automation could not begin until a custom authority packet existed, while the
component that created normal packets could not begin until bootstrap finished.

The project needs strong fail-closed behavior, but its current risk and scale do
not justify operating a second authority system.

## Decision

Use GitHub as the canonical control plane for agent automation:

- objectives and exact `/approve` and `/revoke` comments live in issues;
- immutable GitHub user, repository, issue, comment, review, workflow, and
  delivery identifiers establish provenance;
- pull-request head SHAs bind CI, Critic, human review, and rework outcomes;
- Critic publishes a normal `APPROVED` or `CHANGES_REQUESTED` review for
  readable findings and an authoritative `critic` required check bound to the
  allowlisted Review App or integration and exact head SHA;
- `critic` is an immutable attestation of one uniquely identified review,
  binding its immutable IDs and URL, workflow run/attempt, exact SHA, verdict,
  generation marker, and findings/body digest through the check and/or durable
  transition record; it is not a live review-presence gate;
- Critic publishes and verifies the exact-head review before completing the
  `critic` check for either outcome; the check remains pending until the visible
  review exists, preventing auto-merge from racing ahead of review evidence;
- exhausted bounded review-publication retries fail the `critic` check with a
  sanitized infrastructure diagnostic and request local Codex notification; they
  never become a passing check or a fabricated Critic judgment;
- each Critic generation publishes one coherent review before its check: all
  inline findings and a concise summary are atomic in `CHANGES_REQUESTED`, and
  neither passing nor failing verdicts receive drip-fed findings afterward;
- Critic may resolve only its own threads after exact-head rework verification;
  no bot resolves Jason's threads, which remain blocking until Jason resolves
  them, with the local watcher notifying when they are the sole remaining gate;
- Critic reports only its own judgment: a failed `validate` check does not make
  Critic request changes when its independent review passes, while the
  coordinator still routes the CI failure into the one combined rework pass;
- a Critic identity that authored, co-authored, or pushed the exact head cannot
  approve or substantively review it; `critic` fails with a sanitized role
  conflict, wakes Codex, and requires a new independent Critic run;
- same-head Critic retries may recover infrastructure failures only before a
  substantive verdict; no automated rerun replaces a completed substantive pass
  or failure, and after `CHANGES_REQUESTED` that SHA cannot receive an
  authoritative approval or successful `critic` check until rework publishes a
  new head;
- a lost response or crash after atomic review publication may reconcile the
  uniquely marked same-head review into the same check/verdict without duplicate
  review, new substantive evaluation, or opposite verdict;
- later review edit, dismissal, or deletion is audit-evidence loss that triggers
  notification and recovery for future actions but does not retroactively
  contradict the correctly issued immutable check; deleted prose may be
  unrecoverable, and digests cannot reconstruct it;
- Jason's early exact-head change request is recorded immediately but normally
  waits for terminal CI and Critic so one combined Maintainer bundle contains
  all findings; sensitive findings may halt and escalate immediately, and an
  approval while Draft cannot merge or override pending or failed native gates;
- Jason's `COMMENTED` reviews remain advisory and non-terminal; automation
  neither advances nor requests rework from them and never infers intent from
  review prose;
- automation-owned pull requests remain Draft during agent work, bot gates, and
  rework; only allowlisted Publisher marks Ready after exact-head `validate`,
  `critic`, and `objective-authority` success; any current exact-head Jason
  approval, including one submitted while Draft, may then enable auto-merge;
- a premature or unauthorized Ready transition returns to Draft, while Jason's
  manual Draft transition is an administrative stop that cancels auto-merge and
  is never automatically undone; Draft transitions invalidate the ready latch,
  while only a new head stales the exact-head approval;
- Jason's native Ready-for-review action is the resume request after his manual
  Draft stop; it creates a new ready generation only if exact-head bot gates
  still pass, otherwise automation restores Draft and reports remaining gates;
- the ruleset requires exactly one human/code-owner approval from Jason plus the
  `validate`, `critic`, and `objective-authority` checks; Critic's App review is
  evidence and is not assumed to count toward the required approval total;
- the three independent merge opinions are CI, Critic, and Jason;
  `objective-authority` is an authorization prerequisite rather than a fourth
  review opinion;
- GitHub rulesets and auto-merge remain the final integration gate;
- timelines, workflow runs, check runs, reviews, and audit records supply the
  durable evidence trail; and
- local caches and cursors are disposable projections reconciled from GitHub.

Use a read-only local TypeScript watcher for private decision notifications. It
makes authenticated conditional requests, polls adaptively, reconciles after
startup or wake, and resumes a dedicated Codex session only for a verified
actionable change. It has no approval, mutation, review, or merge authority.

Remove the special bootstrap schema, canonical packet service, genesis ceremony,
offline signing roots, bespoke broker, WORM journal, and separate merge
controller from the current design. Reintroducing any stronger external control
requires concrete threat evidence, a bounded objective, and a new ADR.

The replacement uses new stable clause identifiers `REP-AUTO-000` through
`REP-AUTO-025`. It supersedes rather than reassigns the historical
`REP-WORKFLOW-000` through `REP-WORKFLOW-025` identifiers.

## Alternatives considered

### Preserve the custom authority system

Rejected for the current project. It offers stronger independence from GitHub
compromise, but greatly increases implementation, operational, recovery, and
review complexity before any workflow value exists.

### Receive webhooks directly on Jason's Mac

Rejected as the primary path. A sleeping or disconnected laptop cannot receive
deliveries, and a production-grade public endpoint or relay would add another
service. GitHub's CLI webhook forwarder is documented for development use.

### Use email, Slack, SMS, or push as a broker

Rejected as a trusted path. These channels add credentials and delivery
semantics, and their content is spoofable or untrusted. They may remain
redundant human notification channels.

### Poll GitHub from an agent on a schedule

Rejected because it spends model runs to discover that nothing changed.

### Poll GitHub from a lightweight local process

Accepted. Conditional authorized requests that return `304 Not Modified` do not
consume GitHub's primary REST rate limit. The watcher wakes Codex only after a
verified state change, so ordinary polling does not consume model runs.
Secondary limits still apply, so the watcher must follow GitHub's documented
rate headers and backoff behavior.

## Consequences

- The accepted workflow becomes substantially smaller and auditable in the tools
  contributors already use.
- Objective approval is understandable from the issue timeline without a
  canonicalization ceremony.
- Rulesets, exact head SHAs, independent checks, and immutable actor IDs still
  fail closed around publication and merge.
- Critic findings remain readable in GitHub review UI while the App-bound
  `critic` check supplies the native merge gate; Jason remains the sole required
  human/code-owner approval.
- Mutable review loss can reduce the human-readable audit trail even though the
  bound check remains valid; recovery can verify captured IDs and digests but
  cannot promise restoration of deleted GitHub prose.
- Draft/Ready provides a visible merge latch but is not durable evidence and
  cannot substitute for bound checks, reviews, or transition records.
- `validate` and `critic` remain independent evidence rather than one signal
  echoing the other, so their disagreement remains visible and actionable.
- GitHub account or platform compromise remains inside the trust boundary. The
  project accepts that risk at its current scale.
- Local notification is unavailable while Jason's Mac is offline, but the
  durable GitHub state is reconciled when it returns.
- Issue #27 is resolved by eliminating the ambiguous bootstrap object rather
  than defining it.

## Review evidence

- Decision owner: Jason
- Decision outcome: Accepted in the design session on 2026-07-18
- Independent reviewer: adversarial security and workflow reviewer
- Independent review outcome: The original GitHub-first decision was accepted
  after three review rounds on 2026-07-18. Independent review of the later
  Critic review-plus-check refinement is pending.
- Evidence reviewed: #9, #10 through #15, #25, #26, #27, PR #19, the live
  repository ruleset, the historical REP-WORKFLOW clauses, and replacement
  REP-AUTO clauses
- First-review findings: durable auto-merge authority conflict; stable-ID
  reassignment; non-native merge gates; ambiguous review/check reducers;
  overstated audit durability; watcher privilege boundary; approval mutation;
  rate-limit recovery; sensitive-output lifecycle; and branch provenance
- Second-review findings: state-changing human-review reduction; requested
  versus effective revocation and ordered administrative shutdown; exact
  check-generation ordering; and lossless authority-bearing GitHub IDs
- Current-refinement findings: bind `critic` to one immutable review tuple;
  distinguish attestation from mutable review presence; reconcile
  crash-after-review idempotently; prove native check conclusions; and use an
  actor-aware Draft/Ready latch with current exact-head human approval
- Current-refinement disposition: Incorporated in the policy, ADR, and issues
  #13, #25, and #26; independent confirmation remains pending
- Final review: Original findings were resolved without a remaining authority,
  security, phase, or traceability defect. The Critic review-plus-check
  refinement must not be activated until its independent review is recorded.
- Unresolved disagreements: None recorded; independent review of the current
  refinement remains outstanding.
- Accepted on: 2026-07-18
