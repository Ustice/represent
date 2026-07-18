> Autonomous capability remains disabled until the applicable implementation,
> validation, review, and activation gates in this policy are complete.

# Agent automation policy

## Purpose

Define how Represent uses GitHub as the control plane for agent-assisted work.
The policy keeps project decisions with Jason, lets bounded automation perform
routine work, and relies on GitHub's native identities, issues, pull requests,
reviews, checks, rulesets, and timelines.

This is Phase -1 engineering-system design. It does not authorize production
library implementation, change Represent product semantics, or activate an
automation by itself.

## Version and supersession

This revision introduces `REP-AUTO-000` through `REP-AUTO-025`. When accepted
and merged, those clauses supersede the original `REP-WORKFLOW-000` through
`REP-WORKFLOW-025` automation-policy clauses published by PR #19. The old
identifiers retain their historical meanings and must not be cited for new
implementation. Existing issues are migrated to the new clause family as one
change with this policy.

## Operating model

Jason approves a bounded objective in a GitHub issue. Automation may then carry
that objective through design, review, validation, blocker escalation, and
phase-permitted implementation. GitHub records the durable state. Labels and
automation comments project that state for humans but do not create authority.

Automation-owned pull requests use three independent signals:

- continuous integration reports repository validation;
- `🤖 Critic` publishes readable findings as a GitHub review and reports
  its authoritative exact-head result through the required `critic` check; and
- Jason approves or requests changes through a GitHub pull-request review.

CI and Critic run independently after every new head commit. Neither waits for
the other to begin. The coordinator waits until both have terminal results
before deciding whether to request rework or human review.

## Authority

### REP-AUTO-000 — Applicability

This policy governs any unattended process that can initiate or continue work
in this repository. It also governs automation-triggering comments and reviews
submitted during an interactive session.

It does not prevent Jason from directing a foreground Codex session, using
ordinary GitHub controls, administering the repository, or recovering a failed
automation manually. A manual action grants no reusable authority beyond that
action.

### REP-AUTO-001 — Sources of authority

For product behavior, accepted specification clauses and recorded decisions are
authoritative. For engineering workflow, the repository workflow, phase policy,
accepted ADRs, and this policy are authoritative.

GitHub issues define bounded objectives and work items. Pull requests, tests,
checks, comments, labels, and agent output are evidence and state projections;
they do not silently change an accepted specification or decision. Conflicting
authority stops execution and becomes a blocker.

### REP-AUTO-002 — Human decision rights

Jason retains authority over:

- approving, rejecting, reprioritizing, revoking, or superseding objectives;
- product semantics and consumer-visible guarantees;
- architectural boundaries and materially different tradeoffs;
- phase transitions and compatibility policy;
- adding, weakening, replacing, or removing guarantees; and
- accepting material unresolved risk or policy exceptions.

Agents may research, recommend, and prepare these decisions but may not make
them for Jason.

### REP-AUTO-003 — Agent execution rights

Within an approved objective, an agent may decompose work, order dependencies,
research, create child issues, prepare branches and pull requests, edit
authorized artifacts, validate, request review, address findings, and publish
evidence.

An agent must obey the current phase and cited authority. It must not expand the
objective, invent product semantics, weaken a guarantee or valid test, accept
material risk, bypass a ruleset, or merge outside the process below.

### REP-AUTO-004 — Proposals are inert

Agents may propose ordinary objectives, bugs, questions, and opportunities in
GitHub. A proposal is inert until Jason approves its objective. Creating,
editing, assigning, linking, or labelling an issue does not approve it.

Potential vulnerabilities, credentials, exploit details, and other information
whose publication could increase risk follow REP-AUTO-019 instead of being
posted publicly.

## Objective approval

### REP-AUTO-005 — GitHub objective record

The GitHub objective issue is the human-readable and machine-readable approval
record. At minimum it states:

- the objective;
- work in scope;
- success criteria;
- explicit exclusions;
- known decision boundaries and material risks; and
- links to governing authority and dependent issues.

The automation records the approved issue number, immutable issue node ID,
repository ID, exact title and body, approval comment ID, approving user ID,
and approval timestamp. No custom canonical packet, digest ceremony, external
state service, offline signing key, or genesis manifest is required.

### REP-AUTO-006 — Exact approval and revocation commands

An objective becomes approved only when GitHub records a newly created issue
comment that satisfies all of these conditions:

- it belongs to the expected repository and objective issue;
- its author is GitHub user ID `35118` with account type `User`;
- its complete body is exactly `/approve` with no surrounding whitespace or
  additional text; and
- the objective is not already closed, revoked, superseded, or blocked by
  conflicting authority.

The exact command `/revoke`, under the same repository, issue, identity, and
whole-body rules, revokes future automation authority. GitHub usernames,
avatars, email addresses, labels, reactions, review text, and edited comments
are not approval inputs.

A valid approval remains bound to its comment-creation event and the captured
issue revision. Editing or deleting the approval comment never broadens its
scope; missing or changed approval evidence fails closed for new work. Repeated
valid `/approve` comments for the same unchanged revision are idempotent.

A valid `/revoke` is terminal for that objective. Editing or deleting its
comment cannot restore authority, and a later `/approve` on the same issue does
not undo it. Resumption requires a new superseding objective. After ordinary
title/body invalidation without revocation, a new `/approve` created against
the new revision may approve that revision.

### REP-AUTO-007 — Trusted event intake

GitHub-hosted workflows use the immutable repository, issue, comment, actor,
event, and delivery identifiers supplied by GitHub. Any external webhook
receiver must verify GitHub's signature over the raw body before parsing it.
Local watchers authenticate to GitHub and re-read current state before acting.

Each handler rejects the wrong repository, wrong event type, missing object,
unexpected actor, fork, replayed delivery, stale subject, or unavailable
authority. GitHub event and object identifiers are idempotency keys; processing
the same event again converges on the existing outcome.

Use GitHub node IDs where available. Preserve every decimal REST ID as its
canonical decimal string or a `bigint`; never parse an authority-bearing ID
through an IEEE-754 `number`. Ordering and idempotency comparisons include
fixtures above `2^53`.

### REP-AUTO-008 — Approval transition

On valid `/approve`, the coordinator snapshots the objective fields named in
REP-AUTO-005 and records an automation-owned approval comment containing
the approved revision, scope links, activation status, and next eligible step.
It may then schedule only work within that snapshot.

Approval of an objective does not approve a design, waive independent review,
authorize a phase transition, expose a secret, or make a pull request mergeable.

## Change and revocation

### REP-AUTO-009 — Material issue changes invalidate approval

Any post-approval change to the objective issue's title or body invalidates the
approval before new work is scheduled. Labels, assignments, milestones, and
automation-owned status comments do not alter the approved scope.

After a title or body edit, the automation posts or updates one status comment
that says fresh `/approve` is required. It must not decide whether prose changes
are semantically material. Treating every title or body change as invalidating
is the fail-closed implementation of the material-change rule.

### REP-AUTO-010 — Revocation and supersession

A valid `/revoke` comment requests revocation. Revocation becomes effective
when the handler appends the revocation transition, makes the required
objective-authority check non-successful for every current pull-request head,
and cancels pending auto-merge. After that transition, new and queued work is
cancelled. Running work reaches the nearest safe checkpoint, stops before
publishing additional changes, and records what may need cleanup.

If the handler is unavailable or cannot complete every native transition, the
objective enters recovery and automation does not claim revocation is complete.
A merge GitHub accepts before effective revocation is handled as described in
REP-AUTO-011.

A superseding objective links the superseded issue and requires its own
approval. Closing an objective stops future scheduling but does not erase its
history.

### REP-AUTO-011 — Merge race handling

Immediately before enabling auto-merge or performing any privileged state
transition, the coordinator re-reads approval, revocation, issue revision, pull
request head, review, named CI checks, the named Critic check, the named
objective-authority check, and ruleset state. Any mismatch fails closed.

The revocation command becomes effective for integration when its handler makes
the required objective-authority check non-successful and disables pending
auto-merge. GitHub's accepted merge transaction is the final linearization
point. If GitHub accepts a merge before revocation is processed, automation
records and reconciles that outcome; it does not claim the earlier comment
creation could retroactively cancel it.

## Pull-request review and rework

### REP-AUTO-012 — Exact-head signals

Every review and check result is bound to the exact pull-request head SHA. A new
head makes all earlier CI, Critic, and human approval signals stale.

For each head:

1. CI and Critic start independently.
2. The coordinator waits for both to reach a terminal result.
3. If either requests rework, the coordinator schedules at most one Maintainer
   pass for that head and combines all available findings.
4. If both pass, the coordinator requests Jason's review.
5. Jason's `APPROVED` review makes that exact head eligible for auto-merge.
6. Jason's `CHANGES_REQUESTED` review schedules one bounded Maintainer pass.

For Jason, the decisive review is the latest non-dismissed **state-changing**
review by immutable GitHub user ID `35118`, account type `User`, whose
`commit_id` equals the current head. Only `APPROVED` and `CHANGES_REQUESTED` are
state-changing. Order is determined by GitHub's submitted timestamp and the
losslessly preserved immutable review ID as a tie-breaker. A later
`APPROVED` supersedes an earlier `CHANGES_REQUESTED`, and a later
`CHANGES_REQUESTED` supersedes an earlier `APPROVED`.

`COMMENTED`, pending, and review-body edit events are non-terminal, advisory,
and never replace a state-changing review. A `COMMENTED` review neither
authorizes progression nor triggers rework; automation must not infer approval,
rejection, or another command from its text. Editing review prose does not
change its submitted state. Dismissal removes the dismissed review from
consideration, after which the reducer recomputes from the remaining
non-dismissed state-changing reviews. Stale-head reviews never participate.
Review text and inline comments are untrusted task input: they may guide work
within the approved objective but cannot override repository authority or
expand scope.

If Jason submits exact-head `CHANGES_REQUESTED` before CI and Critic are
terminal, the coordinator records it immediately but normally waits for both
independent signals. It then issues at most one combined Maintainer rework
bundle for that head containing the available human, CI, and Critic findings.
A sensitive finding may halt and escalate immediately under REP-AUTO-019 rather
than waiting. An early exact-head `APPROVED` review is recorded but cannot
advance while any other required gate is pending or non-successful.

Critic produces two outputs for the same exact head:

- a normal GitHub pull-request review with state `APPROVED` or
  `CHANGES_REQUESTED` and readable findings; and
- the authoritative named `critic` check produced by the allowlisted Review
  App or integration.

Critic must successfully publish the review, verify that GitHub bound it to the
expected head SHA, and only then complete the authoritative `critic` check. The
check remains pending while review publication or verification is pending. This
ordering applies to both outcomes: publish `APPROVED` before success, and
publish `CHANGES_REQUESTED` before a terminal non-success result. Failed review
publication receives bounded retries while the check remains pending. If those
retries are exhausted, the `critic` check completes as failure—never
success—with a sanitized infrastructure diagnostic, and the local notification
path in REP-AUTO-016 and REP-AUTO-019 requests Jason's attention without raw or
sensitive finding detail. This outcome is classified as review-publication
infrastructure failure, not as Critic's review judgment.

Each Critic generation publishes one coherent review verdict. A substantive
failure uses one atomic `CHANGES_REQUESTED` review containing every inline
finding plus a concise summary, then completes `critic` as failure. A passing
generation likewise uses one coherent `APPROVED` review before completing
`critic` as success. Critic does not drip-feed comments or new findings after
its terminal check. A later discovery waits for a new head and its Critic
generation; it cannot mutate or rerun the completed substantive verdict.

Critic may resolve only review threads created by its allowlisted Review App,
and only after it verifies the applicable rework on the current exact head. No
bot may resolve a thread created by Jason. Jason's unresolved human threads
remain a native blocking gate until Jason resolves them. When those human
threads are the only remaining gate, the local watcher may notify Jason under
REP-AUTO-016 using only the fixed work-item payload; it cannot resolve or
reinterpret the thread.

The review is human-readable evidence and a native place for discussion. It is
not an authority input for merge eligibility, and the GitHub App review is not
assumed to count toward GitHub's required approving-review count. The `critic`
check is the machine-enforced Critic signal. A Critic `CHANGES_REQUESTED` review
must correspond to a non-successful `critic` check, and a Critic `APPROVED`
review may correspond to success only when no unresolved Critic finding remains.
Missing, contradictory, wrong-head, or wrongly authored review/check pairs fail
closed and cannot request Jason's review or enable auto-merge.

Critic reports only its own review judgment. It does not copy, summarize, or
mirror CI's conclusion. If `validate` fails but Critic finds no review defect,
Critic still submits `APPROVED` and a successful `critic` check. The independent
failed `validate` check blocks progression, and the coordinator combines all
terminal findings into the single Maintainer pass for that head.

Before reviewing, Critic verifies that its GitHub App/integration identity did
not author, co-author, or push any commit in the exact head transition under
review. A role conflict prohibits approval and substantive review. The
`critic` check fails with a sanitized `role-conflict` diagnostic, the local
watcher notifies Jason under REP-AUTO-016, and progression requires a new run by
an independent Critic identity. This preflight failure is not a Critic judgment
and is the explicit exception to review-before-check publication; it must never
produce an `APPROVED` review or successful check.

The current `critic` generation is the latest configured workflow run by
`(created_at, workflow_run_id)`, then highest `run_attempt`, with the named check
selected by `(created_at, check_run_id)` inside that attempt. All IDs are
compared losslessly. A queued or in-progress current generation prevents a
terminal decision; an older completion arriving later is ignored.

Same-head retries may recover only infrastructure failures that occurred before
a substantive Critic verdict. Once Critic successfully publishes a substantive
verdict, no later automated run or attempt may replace it on that head. In
particular, a `CHANGES_REQUESTED` review is sticky for the SHA: no later
same-head run may publish an authoritative `APPROVED` review or successful
`critic` check. The coordinator continues to reduce that head as
rework-required until Maintainer publishes a new head. Current-generation
ordering selects among eligible infrastructure-recovery attempts before a
substantive verdict; it does not supersede a completed substantive review.

Only the current configured completed success conclusion passes. Failure,
action-required, cancelled, timed-out, neutral, skipped, missing, or wrongly
bound results require rework or stop according to the configured reducer. The
selected result must match GitHub's required-check rollup for the configured
context, integration, and exact SHA. CI uses the same generation, exact-SHA,
allowlisted-integration, and ruleset-rollup rules for every required check.

### REP-AUTO-013 — Role and identity separation

The standard automated role display names are:

- `🤖 Publisher` for publication metadata and Git operations;
- `🤖 Maintainer` for bounded authoring and rework; and
- `🤖 Critic` for independent review.

These names are presentation conventions, not security identities. Every
action retains the actual GitHub App, Actions actor, installation, workflow run,
commit author, and triggering principal supplied by its execution path.

Critic must not be the sole reviewer of a substantial design it authored.
Maintainer must not manufacture or rewrite Critic's outcome. Publisher may
publish eligible state but cannot bypass the GitHub ruleset.

### REP-AUTO-014 — Auto-merge eligibility

Automation may enable GitHub auto-merge for an automation-owned, same-repository
pull request only when all of these are currently true for the same head SHA:

- the objective approval remains valid;
- the pull request remains inside approved scope and is not blocked;
- current-phase and traceability requirements are satisfied;
- CI passed;
- Critic passed without unresolved requested changes;
- Jason submitted an `APPROVED` review for that head;
- required review threads are resolved; and
- the repository ruleset reports no unmet requirement.

Before this capability is activated, the repository ruleset must natively
require exactly one approving human/code-owner review, the `validate`, `critic`,
and `objective-authority` checks, stale-review dismissal, resolved review
conversations, and code-owner review. The protected scope must name Jason as the
required code owner. The single required approving review is Jason's; Critic's
GitHub App review is not counted as that approval. Each required check is bound
to its allowlisted integration identity where GitHub supports that binding.
Binding `critic` to the allowlisted Review App or integration is mandatory; an
unbound `critic` context is not eligible for activation. The coordinator
verifies the expected ruleset configuration before every enablement and cannot
change it.

Enabling auto-merge is not a merge bypass. GitHub performs the merge only after
its native protections remain satisfied. Automation does not push directly to
`main`, dismiss reviews, reduce required checks, or use bypass authority.

## Maintenance and decision escalation

### REP-AUTO-015 — Standing maintenance

Recurring maintenance requires an approved standing objective that names the
repository area, permitted operations, cadence or trigger, success condition,
expiry or review date, and exclusions. It cannot authorize product semantics,
phase changes, guarantee changes, credential handling beyond its declared
workflow, or ruleset bypass.

### REP-AUTO-016 — Decision queue and local notification

When work reaches a decision reserved by REP-AUTO-002, automation records a
sanitized `ready-for-human` or blocked state in GitHub and stops dependent work.
GitHub remains the durable queue.

A local TypeScript watcher may notify Jason in a dedicated Codex session. This
is an unattended scheduling capability even though its GitHub access is
read-only, so it remains default-off until separately validated and activated.
The watcher:

- makes authenticated conditional GitHub requests using `ETag` or
  `Last-Modified` validators;
- polls adaptively while relevant work is active and backs off while idle;
- persists validators by exact endpoint, media type, API version, and
  authentication context;
- follows pagination, serializes requests, honors `Retry-After` and
  `X-RateLimit-Reset`, applies exponential backoff, and stops after bounded
  retry failure;
- performs a bounded full reconciliation after startup or wake and whenever
  validators or cursors are missing or invalid;
- treats a wake-up signal only as a reason to re-read GitHub;
- invokes or resumes Codex only for a verified actionable state change; and
- passes only a fixed payload containing repository and work-item IDs, a fixed
  classification code, and a GitHub URL—never issue prose, review prose,
  external text, or sensitive detail.

The notification run uses a dedicated read-only sandbox without repository
mutation credentials or external connectors. Its only permitted response is to
tell Jason which durable GitHub record needs a decision and wait. A fresh Jason
instruction is required before any tool-capable work begins. Watcher outage or
rate limiting delays notification; it never changes GitHub authority state.

An intermediary such as email, Slack, SMS, or a push service is not part of the
trusted path. It may be added later as a redundant human notification channel.

## Identity, permissions, and security

### REP-AUTO-017 — No personal credential fallback

Unattended automation uses a narrowly scoped GitHub App, workflow token, or
other machine credential. It never imports Jason's browser session, personal
access token, SSH key, Git credential, Codex authentication store, or approval
identity as a fallback.

OpenAI credentials are exposed only to the individual trusted step that needs
them, never job-wide to repository-controlled setup or build commands. Logs,
artifacts, comments, and model prompts must not contain secret values.

### REP-AUTO-018 — Repository and fork scope

Mutating automation acts only in repository ID `1301857052` and only on
same-repository branches that it can prove are automation-owned. An
automation-owned GitHub transition record binds the work item, branch, base
SHA, expected head SHA, creating GitHub App/workflow run, and permitted next
pushing identity. Before every mutation, the handler verifies that mapping,
the complete expected head transition, and the observed GitHub event actor. A
foreign push or unexpected commit contaminates the branch and stops automation.

Fork pull requests and human-owned pull requests may receive read-only analysis
when secrets are unavailable, but they never receive automated commits, secret
access, rework, auto-merge enablement, or privileged publication. Secret-bearing
workflows never use `pull_request_target` to check out or execute untrusted head
code.

### REP-AUTO-019 — Sensitive blockers

Potential vulnerabilities, credentials, exploit details, and similarly
sensitive findings are not copied into public issues, pull-request comments,
workflow logs, or notification prompts.

The public GitHub record contains only a sanitized statement that private human
review is required. The local watcher may wake the dedicated Codex session with
the repository, work-item identifier, classification, and a request for Jason's
direction. It must not include the sensitive payload. Further disclosure waits
for Jason to choose an appropriate private route.

Sensitive classification occurs before any comment, artifact, workflow log, or
notification is emitted. Raw finding detail is not persisted by the automation;
only fixed classification codes and object IDs cross the isolated review step.
Suspected credential exposure stops work and immediately requests rotation or
revocation. Jason must choose a private inspection route or authorize a local
rerun before details are disclosed.

### REP-AUTO-020 — Capability rollout and kill switch

Every capability is default-off until its issue, observable tests, least
privilege, rollback procedure, independent review, and activation decision are
complete. Rollout order is:

1. GitHub-native intake and objective state (#10).
2. Adversarial workflow validation (#11).
3. Independent Critic review and blocker escalation (#13 and #15).
4. Bounded design authoring (#12).
5. Bounded implementation and Maintainer rework (#14).
6. Auto-merge enablement after exact-head human approval (#25).
7. Local decision notification after its read-only behavior is validated.

The administrative kill switch is an ordered native operation performed by an
authorized repository administrator: first make every current
objective-authority gate non-successful and cancel every pending auto-merge;
then disable the affected workflows and revoke their credentials. Only after
the native gates and pending merges are secured may the handler be disabled.
If any step cannot complete, enter recovery, retain the authority needed to
finish cancellation, and do not claim the kill switch completed.

The `/revoke` command follows REP-AUTO-010 and requires its handler to complete
the native transition. Disabling that handler first cannot satisfy revocation.

## GitHub state and audit

### REP-AUTO-021 — GitHub is the control plane

GitHub issues, comments, pull requests, reviews, check runs, workflow runs,
commit SHAs, rulesets, and timelines are the canonical workflow state.
Automation may maintain a cache or cursor, but GitHub wins after a disagreement
or restart.

The design intentionally does not introduce a bespoke broker, canonical packet
service, append-only journal, WORM store, genesis ceremony, or offline signing
root. If future threat evidence shows GitHub's records are insufficient, that
requires a new reviewed objective and ADR.

### REP-AUTO-022 — Observable audit record

Each authority-bearing transition appends a distinct automation-owned GitHub
record that contains or links the triggering object, exact head or issue
revision, workflow run, acting machine identity, outcome, and next state. A
separate mutable summary comment or label may project the current state but
cannot replace those transition records.

GitHub records are not claimed to be independently tamper-proof or retained
forever. If a required transition record, workflow run, check, review, or
approval object is missing, execution fails closed and enters recovery. The
current authority must be understandable from the retained GitHub evidence
without private chat history or a local cache.

### REP-AUTO-023 — Idempotency and convergence

Handlers key work by the available GitHub delivery, workflow-run, event, and
object IDs plus the immutable target and revision. Repeated delivery, restart,
delayed completion, or out-of-order observation must converge on one approval
state, one mutable status summary, one append-only transition per logical
event, one branch and pull request per work item, one current Critic result per
head, and at most one Maintainer pass per failed head.

### REP-AUTO-024 — State model

An objective has these logical states:

`proposed → approved → executing → waiting-for-decision → completed`

`revoked`, `superseded`, and `blocked` may interrupt execution. A title or body
edit returns an approved or executing objective to `proposed` before new work.

An automation-owned pull request has these per-head states:

`new-head → ci-and-critic-running → rework-required | human-review-required → auto-merge-enabled → merged`

Every transition compares the current GitHub object IDs and head SHA. An
unexpected state or missing prerequisite stops rather than guessing.

### REP-AUTO-025 — Trust roots and recovery

The trust roots are GitHub's authenticated repository state and ruleset,
Jason's immutable GitHub user ID, the configured machine identities and
credentials, the accepted repository authority on `main`, and the local
machine account for the read-only watcher.

Recovery starts by disabling the affected workflow or credential, reconciling
current GitHub state, and recording any uncertain side effect. Cached state may
be discarded and rebuilt. Recovery never treats chat history, email, display
names, or a local cursor as stronger than GitHub.

## Observable validation scenarios

Before activation, workflow tests or controlled repository exercises cover:

- valid and invalid `/approve` and `/revoke` commands;
- edited or deleted approval evidence, repeated approval, sticky revocation,
  and fresh approval after an objective edit;
- a renamed account with the same user ID and a lookalike account with a
  different ID;
- issue title/body edits after approval;
- duplicate and out-of-order event delivery;
- revocation racing with publication or auto-merge enablement;
- CI and Critic completing in either order;
- either or both CI and Critic requesting rework;
- one coordinated Maintainer pass when both signals fail;
- a new head invalidating CI, Critic, and human approval;
- Critic publishing matching `APPROVED`/successful `critic` and
  `CHANGES_REQUESTED`/non-successful `critic` review-check pairs;
- the `critic` check remaining pending until GitHub confirms the matching
  exact-head review, for both passing and rework outcomes;
- failed or delayed Critic review publication never allowing the `critic` check
  to complete successfully first;
- bounded review-publication retries exhausting into a failed `critic` check,
  sanitized infrastructure evidence, and a content-free local Codex
  notification rather than a fabricated Critic judgment;
- substantive Critic failure publishing all inline findings and its summary in
  one atomic `CHANGES_REQUESTED` review before the failed check, with no
  drip-fed findings after either terminal verdict;
- Critic resolving only its own threads after exact-head rework verification,
  every bot refusing to resolve Jason's threads, and the local watcher notifying
  when unresolved human threads are the sole remaining gate;
- failed `validate` with an independently `APPROVED`/successful Critic pair
  still producing exactly one coordinated rework pass from the CI failure;
- Critic authorship, co-authorship, or push involvement in the exact head
  failing `critic` with only a sanitized role-conflict diagnostic, waking Codex,
  and requiring a new independent Critic run without an approval;
- missing, contradictory, wrong-head, wrong-App, delayed, or duplicated Critic
  review-check pairs failing closed;
- a Critic App `APPROVED` review never satisfying the one required
  human/code-owner approval;
- Jason approving, requesting changes, commenting, editing, and dismissing a
  review;
- early Jason `CHANGES_REQUESTED` waiting for terminal CI and Critic before one
  combined human/CI/Critic rework bundle, except immediate sensitive escalation;
- early Jason `APPROVED` remaining unable to advance while another required
  gate is pending or non-successful;
- same-head `APPROVED → COMMENTED`, `CHANGES_REQUESTED → COMMENTED`, edited
  approval, dismissal, and alternating approval/change-request sequences;
- queued infrastructure recovery attempts and out-of-order completion from an
  older run/attempt before any substantive verdict;
- same-head infrastructure failure recovering before any substantive verdict;
- same-head automated rerun after substantive `APPROVED` being rejected rather
  than replacing the completed verdict;
- same-head reruns after substantive `CHANGES_REQUESTED` remaining
  rework-required and unable to publish authoritative approval/success until a
  new head exists;
- authority-bearing GitHub IDs above `2^53`;
- absent, renamed, wrongly integrated, or non-successful `validate`, `critic`,
  or `objective-authority` checks;
- ruleset drift, an approving-review count other than one, and missing or
  non-Jason code-owner protection;
- fork and human-owned pull requests;
- an unexpected same-repository push or foreign commit on an automation branch;
- malicious issue and review text attempting to expand scope or expose secrets;
- unavailable OpenAI or GitHub credentials;
- GitHub ruleset rejection after eligibility was observed;
- requested revocation with an unavailable handler and an administrative kill
  switch while auto-merge is pending;
- watcher restart, machine sleep, pagination, invalid validators, unchanged
  conditional responses, `403`/`429` backoff, and catch-up;
- missing or deleted transition evidence; and
- a sensitive blocker producing only a sanitized public marker and Codex wake.

Assertions inspect GitHub-visible state and permitted side effects rather than
source strings or private helper calls. Deliberately broken variants exercise
stale-head acceptance, duplicate rework, identity-by-name, approval-after-edit,
fork mutation, and ruleset bypass where practical.

## Phase -1 constraints

Automation implementation in Phase -1 is engineering tooling. It may implement
and validate this workflow, but it does not grant product or compatibility
status to Represent library code. Product implementation remains limited by
`docs/development-phases.md` and specification readiness.

## Acceptance criteria

This policy is ready to govern implementation when:

- an independent reviewer accepts the GitHub-first trust model and identifies
  no unresolved high-severity security or authority gap;
- the objective, review, rework, auto-merge, and watcher state transitions are
  unambiguous and observable;
- issue #10 through #15 and #25 align with the capability order above;
- GitHub remains sufficient to reconstruct every authority-bearing transition;
- permissions and credentials are least-privilege and capability-specific;
- sensitive findings do not enter public or notification payloads; and
- autonomous capability remains disabled pending separate implementation and
  activation evidence.

## Non-goals

This policy does not:

- create a general multi-repository orchestration platform;
- replace GitHub with a custom workflow database or message broker;
- guarantee continuous operation while Jason's local machine is offline;
- permit agents to decide product semantics or accept material risk;
- grant any identity ruleset bypass authority; or
- authorize production Represent packages or a development-phase transition.

## Traceability

- Objective: #26
- Original policy design and publication: #9 and PR #19
- GitHub-first simplification and former bootstrap blocker: #27
- Review-triggered progression and rework: #25
- Capability issues: #10, #11, #12, #13, #14, and #15
- Governing workflow: `docs/workflow.md`
- Development phase: `docs/development-phases.md`
