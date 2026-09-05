# Automation tooling

These modules are pure planners. They accept reconstructed GitHub evidence and
return data with `default-off` activation and `effectsExecutable: false`. They
do not make network requests, read credentials, launch agents, publish anything,
or execute the returned plans. No live transport or process adapter is included.

- [Objective authority](objective-authority.ts) recognizes exact, unedited
  `/approve` and `/revoke` comments from the configured immutable human
  identity. Approval is bound to the issue revision. Labels, display names, and
  prose do not grant authority. Conflicting evidence enters recovery; repeated
  or reordered observations must not duplicate transitions. Revocation stops new
  scheduling and plans native gate failure and auto-merge cancellation before
  reporting effective revocation or permitting administrative disablement.
- [Blocker escalation](blocker-escalation.ts) distinguishes ordinary failures,
  public design blockers, and sensitive findings. Sensitive output contains
  fixed classifications and identifiers, never raw finding text. Suspected
  credential exposure requires rotation or revocation guidance. Invalid or
  conflicting evidence produces recovery without outward effects.
- [Decision watcher](decision-watcher.ts) plans conditional reads and fixed,
  deduplicated notifications. Validators belong to their authentication context;
  pagination remains inside configured endpoints. Startup or wake requires fresh
  GitHub observations. Outages and exhausted retry budgets stop planning without
  granting authority. Notification launch plans remain read-only and tool-free.

GitHub identifiers remain lossless strings. External evidence is parsed through
Zod schemas; public projections exclude untrusted prose and unexpected fields.

The [tests](../../tests/automation/) exercise these boundaries with synthetic
GitHub fixtures and deliberately broken outputs. They do not establish live
GitHub behavior, deployed permissions, process launch safety, or a running
worker's response to revocation. Live execution would need its own
implementation, verification, and explicit activation decision.
