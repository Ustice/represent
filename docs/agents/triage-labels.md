# Triage labels

Engineering skills use five canonical triage roles. This table maps those roles
to the labels configured in the GitHub repository.

| Canonical role    | GitHub label      | Meaning                                   |
| ----------------- | ----------------- | ----------------------------------------- |
| `needs-triage`    | `needs-triage`    | Maintainer needs to evaluate the issue    |
| `needs-info`      | `needs-info`      | Waiting for more information              |
| `ready-for-agent` | `ready-for-agent` | Fully specified and ready for an agent    |
| `ready-for-human` | `ready-for-human` | Requires human judgment or implementation |
| `wontfix`         | `wontfix`         | Will not be actioned                      |

When a skill refers to a canonical role, use the corresponding GitHub label.
These labels describe triage state; they do not themselves grant automation
authority or override the current phase, specifications, or workflow gates.
