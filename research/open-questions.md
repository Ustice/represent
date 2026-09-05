# Open questions

Questions to explore when relevant to the work. Add useful evidence or decisions
here when they would otherwise be lost; entries need no prescribed format.

- What equality or equivalence notions should govern round trips at each layer?
- How should multiple valid conversion paths declare and test consistency?
- Which guarantees can be certified generically, and which require
  adapter-provided laws?
- Where is the boundary between neutral constraints and opaque adapter metadata?
- How should generated or defaulted values affect losslessness and projections?

These are open questions, not settled behavior.

Current experiments leave two concrete questions:

- Required and optional attendance-note proposals are exercised in Fieldwork's
  Change preview. An optional addition accepts old requests, but the old strict
  contract still rejects requests containing the new field. Compatibility needs
  a direction and an interaction boundary; structural differences alone cannot
  supply a universal verdict.
- The JSON Schema adapter deliberately supports a small known subset. The next
  constraint should come from a consumer (for example ISO timestamps or roles),
  with matching core-parser and external-validator evidence. Opaque parsers and
  custom refinements must remain visible rather than silently losing rules.
