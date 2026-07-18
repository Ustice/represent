# Blocker escalation and notification validation campaign

## Scope and phase permission

This campaign validates the default-off engineering workflow owned by issue
[#15](https://github.com/Ustice/represent/issues/15) and `REP-AUTO-002`,
`REP-AUTO-016`, `REP-AUTO-019`, `REP-AUTO-020`, `REP-AUTO-022`, and
`REP-AUTO-023`.

The repository is in Phase -1. These TypeScript boundaries are permitted because
they clarify and make the accepted agent-automation policy executable. They are
engineering tooling, not Represent product code, and carry no product or
compatibility status.

Both capabilities remain `default-off`. The implementation returns inert plans:
no GitHub request, issue mutation, notification launch, Codex session, or
credential access occurs from the pure execution boundaries. Transport and
process adapters require separate least-privilege evidence, independent review,
and Jason's explicit activation decision.

## Public execution boundaries

The blocker-escalation boundary consumes immutable GitHub identifiers and one of
three disjoint signals:

- an ordinary implementation failure with no blocker effect;
- a non-sensitive design blocker with explicitly reviewed public evidence; or
- a sensitive fixed classification that has no field capable of carrying raw
  finding text.

It returns a deterministic stop or continue result, append-only transition plan,
sanitized GitHub record, fixed notification payload, and credential-rotation
guidance where applicable. Every effect remains inert.

The watcher boundary consumes configured read endpoints, context-bound
validators, a bounded serialized response sequence, prior notification
fingerprints, and a startup, wake, active-poll, or idle-poll trigger. It returns
conditional read plans, updated validator state, retry or polling times, and
fixed notification-only launch plans. It emits exactly one GitHub read per
reducer step; each observed page determines the next page or configured root, so
pagination is serialized by the protocol rather than asserted by metadata. A
wake signal can only produce a GitHub reread plan. GitHub outage, malformed
state, pagination escape, or exhausted retry budget stops the watcher without
changing authority.

## Least-privilege and rollback evidence

The planned GitHub request capability is exactly `github-read-only`. Planned
notification launches require a read-only sandbox, no repository mutation
credentials, no external connectors, no tool-capable work, and a fresh Jason
instruction before any later tool-capable run.

Because activation and adapters are absent, rollback is currently removal or
rejection of the inert consumer integration with no authority migration. A
future activation record must name the installed local process, credential,
launch mechanism, kill procedure, and reconciliation procedure. Disabling a
future watcher may delay notification only; GitHub remains the durable decision
queue and authority source.

## Escalation discrimination matrix

| Defect                 | Violated authority         | Discriminating fixture                     | Observable failure                                               |
| ---------------------- | -------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `MISCLASSIFY_FAILURE`  | REP-AUTO-016               | Ordinary implementation failure            | Result must continue with no transition or notification          |
| `LEAK_SENSITIVE`       | REP-AUTO-019               | Sensitive signal plus attacker sentinel    | Serialized result contains only fixed marker and identifiers     |
| `FORGED_AUTHORITY`     | REP-AUTO-002, REP-AUTO-022 | Authority link outside configured prefixes | Result enters recovery with no outward effect                    |
| `DUPLICATE_TRANSITION` | REP-AUTO-022, REP-AUTO-023 | Repeated logical transition records        | Result enters recovery rather than selecting one                 |
| `CORRUPT_TRANSITION`   | REP-AUTO-022               | Altered kind, state, activation, or record | Result enters recovery and cannot suppress the required append   |
| `LOSSY_ID`             | REP-AUTO-022               | Non-canonical decimal identifier           | Result enters recovery; large string identifiers remain lossless |
| `OMIT_ROTATION`        | REP-AUTO-019               | Suspected credential exposure              | Result requires rotation or revocation and stops work            |

## Watcher discrimination matrix

| Defect               | Violated authority         | Discriminating fixture                           | Observable failure                                               |
| -------------------- | -------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| `DIRECT_WAKE`        | REP-AUTO-007, REP-AUTO-016 | Wake trigger without GitHub observations         | Only serialized conditional read plans are returned              |
| `NOTIFY_304`         | REP-AUTO-016               | Every endpoint returns `304 Not Modified`        | No notification is planned                                       |
| `CROSS_CONTEXT_ETAG` | REP-AUTO-016               | Validator belongs to another auth context        | Conditional header is omitted                                    |
| `PAGINATION_ESCAPE`  | REP-AUTO-018               | Next link leaves the configured API boundary     | Watcher stops with no notification                               |
| `UNBOUNDED_RETRY`    | REP-AUTO-016               | Rate limit after maximum retry attempt           | Watcher stops and plans no further request                       |
| `MUTATING_LAUNCH`    | REP-AUTO-016, REP-AUTO-017 | Verified actionable state                        | Launch contract remains read-only, connector-free, and inert     |
| `LEAK_PROSE`         | REP-AUTO-019               | Runtime action includes an extra raw prose field | Output projection drops the field before storage or notification |
| `TAINTED_ID`         | REP-AUTO-019, REP-AUTO-022 | Prose in event or revision identifier            | Watcher stops before persistence or notification                 |
| `REPLAY_NOTIFY`      | REP-AUTO-023               | Same event, revision, and payload observed again | No duplicate notification is planned                             |
| `PAGE_304_REPLAY`    | REP-AUTO-016, REP-AUTO-023 | Page one changes while page two returns `304`    | Page-two notification fingerprint remains preserved              |

## Evidence and limitations

The focused suites exercise 32 cases across classification, sanitization,
convergence, fixed notification payloads, validators, pagination, response
ordering, changed and dismissed GitHub state, adaptive polling, rate-limit
headers, exponential backoff, retry exhaustion, and watcher outage.

No network or subprocess adapter is included, no credential is read, and no
capability is activated. Native GitHub conditional-request behavior and the
notification-only Codex launcher must be exercised with their future adapters
before an activation decision. These are explicit activation prerequisites, not
claimed evidence from this pure campaign.
