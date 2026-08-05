# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those
roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `status: triage`     | Maintainer needs to evaluate this issue  |
| `needs-info`               | `status: info-fehlt` | Waiting on reporter for more information |
| `ready-for-agent`          | `status: agent-ready`| Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `status: mensch`     | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the
corresponding label string from this table.

The right-hand column follows this repo's existing German prefix scheme
(`typ:`, `bereich:`, `prio:`, `status:`) — see `gh label list`. Apply existing
labels rather than creating English duplicates.

Edit the right-hand column to match whatever vocabulary you actually use.
