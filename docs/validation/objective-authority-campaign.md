# Objective-authority adversarial validation campaign

## Authority and scope

This report records the controlled validation required by GitHub issue #11 for
the default-off objective-authority capability implemented by #10.

- Objective: #26
- Accepted design: #27 and ADR 0004
- Normative policy: REP-AUTO-005 through REP-AUTO-011 and REP-AUTO-020 through
  REP-AUTO-025
- Executable evidence: `tests/automation/objective-authority-campaign.test.ts`
  and the baseline `tests/automation/objective-authority.test.ts`
- Activation: default-off; this campaign does not authorize activation

Phase -1 permits this engineering-workflow validation because it makes accepted
REP-AUTO clauses executable. It is not Represent product implementation and has
no compatibility status.

The campaign uses pure reconstructed GitHub fixtures. It does not call GitHub,
invoke an agent, read `OPENAI_API_KEY`, mutate repository state, create a branch
or pull request through the capability under test, publish a review, enable
auto-merge, or execute a native revocation plan.

## Evidence format

Each numbered test records its GitHub fixture and scenario-specific state or
transition oracle. Reducer scenarios also share the default-off,
non-executable-effect assertion. The table below records the permitted plan and
forbidden execution boundary; repeat, restart, and permutation assertions are
included where the scenario has an idempotency obligation.

An assertion failure is investigated as an implementation defect, test defect,
policy ambiguity, or design blocker. No discrepancy is accepted silently. The
mutation matrix applies four broken results to the same campaign oracle used by
the numbered scenarios.

## Scenario results

| ID  | GitHub fixture                                                                                                                                                                                 | Expected and actual evidence                                                                                                                                                                                     | Idempotency                                                   | Classification                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 01  | Exact `/approve`, immutable user ID `35118`, `User` actor, open configured objective                                                                                                           | Approval transition planned, then reconstructed `approved`; projection is `automation-approved`; effects remain default-off                                                                                      | Re-evaluation appends nothing                                 | Pass                                                                            |
| 02  | Wrong body, edited event, wrong user ID, bot actor, wrong repository, and closed objective                                                                                                     | Invalid commands remain `proposed`; wrong repository enters `recovery`; closed issue becomes `closed`; no transition is appended                                                                                 | Repeated invalid input is inert                               | Pass                                                                            |
| 03  | Exact `/revoke` before scheduling and the stop-scheduling signal available to future queued or running consumers, with a current head whose authority check succeeds and auto-merge is enabled | Revocation remains requested and scheduling becomes forbidden; the permitted output is a non-executable native plan to fail the gate and cancel auto-merge; running-work effects remain forbidden                | Re-observation produces the same authority signal and plan    | Pass for authority signal; #14 owns consumption and safe-checkpoint enforcement |
| 04  | Approved revision A, title/body revision B, then a fresh approval created against B                                                                                                            | Revision B returns authority to `proposed`; only the fresh B transition restores `approved`                                                                                                                      | Old approval cannot revive, including edit-and-revert markers | Pass                                                                            |
| 05  | Labels, assignments, milestone, reactions, automation status prose, and mutable display login                                                                                                  | Authority remains bound to immutable comment and actor IDs; metadata has no effect                                                                                                                               | All metadata permutations converge                            | Pass                                                                            |
| 06  | Duplicate, delayed, replayed, and reversed event, comment, and transition observations                                                                                                         | One approval, one projection, no duplicate append, exact deep-equal result                                                                                                                                       | Explicit repeat and permutation equality                      | Pass                                                                            |
| 07  | New process reconstructed only from retained GitHub objects after local state is discarded                                                                                                     | Exact approved state and projection are reconstructed without local cache                                                                                                                                        | Restart result equals original result                         | Pass                                                                            |
| 08  | Prompt-injection prose and a hostile linked URL in the approved objective body                                                                                                                 | Scope cannot expand; no native action; prose is absent from status and diagnostics                                                                                                                               | Repeated evaluation remains inert                             | Pass                                                                            |
| 09  | GitHub credentials unavailable or too narrow to reconstruct trusted current state                                                                                                              | The executable admission boundary returns recovery without a reducer result, transition, projection, or effect; no credential value enters the boundary                                                          | Retry waits for an explicitly trusted current snapshot        | Pass                                                                            |
| 10  | Controlled execution with a network-call sentinel and no credential or agent capability                                                                                                        | No network call; public output contains only inert projection and plans; agent, secret, review, repository-write, and merge effects are unavailable                                                              | Repeated execution remains side-effect free                   | Pass                                                                            |
| 11  | Revocation handler unavailable, then available while auto-merge is pending                                                                                                                     | Unavailable handler enters `recovery`; available handler remains requested and plans both native protections                                                                                                     | Neither state claims effective revocation                     | Pass                                                                            |
| 12  | Handler disabled while the native gate still succeeds and auto-merge remains enabled, then observed after gate failure, cancellation, and effective transition persistence                     | Early disablement enters recovery; administrative disablement becomes eligible only after the permitted native protection plan and persisted `revoked` state; early credential/workflow disablement is forbidden | Ordered observations reject skipping the native gate          | Pass                                                                            |
| 13  | Node IDs plus canonical decimal REST IDs greater than `2^53`                                                                                                                                   | Exact strings survive transition planning and reconstruction                                                                                                                                                     | No numeric coercion or identity drift                         | Pass                                                                            |

## Discrimination results

The campaign applies deliberately broken result variants at the observable
boundary. All were killed:

| Mutation                 | Broken behavior                                 | Detecting obligation           | Result |
| ------------------------ | ----------------------------------------------- | ------------------------------ | ------ |
| `AUTHORITY_FAIL_OPEN`    | Invalid prose becomes approved                  | Scenario 02 exact state oracle | Killed |
| `REPLAY_DUPLICATION`     | Persisted replay appends another transition     | Scenario 06 convergence oracle | Killed |
| `RECOVERY_FAIL_OPEN`     | Unavailable revocation handler becomes approved | Scenario 11 recovery oracle    | Killed |
| `EFFECT_BOUNDARY_BREACH` | Default-off output claims executable effects    | Scenario 10 permission oracle  | Killed |

## Permission boundary and rollback

The capability accepts reconstructed GitHub evidence and returns data. The only
permitted outputs are append-only transition drafts, one mutable status
projection, the next eligible validation step, and compare-and-set native
revocation plans. Every reducer output says `default-off` and
`effectsExecutable: false`; rejected credential admission returns recovery and
`effectsExecutable: false` without constructing a projection or plan.

Credential admission wraps the reducer without accepting a credential value.
When authenticated GitHub state cannot be reconstructed, it returns recovery
without a reducer result or effect plan. A future live adapter must supply the
admission decision and independently prove its least-privilege permissions
before activation.

Rollback remains the ordered REP-AUTO-020 operation: make every current
`objective-authority` gate non-successful and cancel pending auto-merge before
disabling workflows or credentials. Failure at any earlier step remains
recovery, not successful shutdown.

## Outcome and limitations

All controlled scenarios and discrimination obligations pass. The evidence
validates the pure capability and credential-admission boundaries; it does not
validate a live GitHub adapter, repository ruleset, actual workflow credential,
or unattended agent. It proves that revocation emits the stop-scheduling signal,
not that a future running Maintainer reaches its safe checkpoint; #14 owns that
enforcement. Those remain separately gated capabilities. An independent reviewer
must accept this report and its permission boundary before #11 is complete.
