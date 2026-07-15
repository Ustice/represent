# Open questions

Unresolved questions and reviewer disagreements belong here until a
specification or ADR decides them. Each entry should include context, competing
alternatives, affected guarantees, evidence, owner or review role, and the
smallest decision needed to proceed.

## Deferred for the specification phase

- What equality or equivalence notions should govern round trips at each layer?
- How should multiple valid conversion paths declare and test consistency?
- Which guarantees can be certified generically, and which require
  adapter-provided laws?
- Where is the boundary between neutral constraints and opaque adapter metadata?
- How should generated or defaulted values affect losslessness and projections?

These are prompts for research, not decisions. They do not authorize production
implementation.
