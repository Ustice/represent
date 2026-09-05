# Unattended automation

The custom automation design is retired from the active workflow by
[ADR 0005](decisions/0005-simplify-project-workflow.md). It is not part of interactive work.

The [historical policy](archive/agent-automation-policy.md) preserves
`REP-AUTO-000` through `REP-AUTO-025` for the existing default-off tooling and
validation reports. Those clauses remain the contract for that tooling, not
prerequisites for foreground work or a commitment to finish the automation system.

This change does not activate tooling, alter its fail-closed behavior, or change
GitHub settings. Any future unattended execution or publication needs an explicit
request and capability-specific review before activation.
