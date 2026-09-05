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

Current experiments make these questions concrete:

- Required and optional attendance-note proposals are exercised in Fieldwork's
  Change preview. An optional addition accepts old requests, but the old strict
  contract still rejects requests containing the new field. Compatibility needs
  a direction and an interaction boundary; structural differences alone cannot
  supply a universal verdict.
- Fieldwork now uses Zod timestamps and Sensor Bench exercises numeric,
  nullable, and collection contracts. Opaque parsers and custom refinements
  still need an explicit provider or an export refusal; further constraints
  should come from a consumer with parser/validator evidence.
- Sensor Bench chooses between rounded and unrounded temperature routes through
  named policies. Route discovery and selection are implemented; declaring and
  checking semantic consistency between competing routes remains open.
- The native JSON/Ajv certification profile detects artifact defects within its
  declared input domain. Reusable value-level laws, domain equality, and adapter
  guarantees beyond acceptance need concrete profiles before generic APIs.
