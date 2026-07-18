# Open questions

Active unresolved questions and reviewer disagreements belong here until a
specification or ADR decides them. Each active entry includes context, competing
alternatives, affected guarantees, evidence, owner or review role, and the
smallest decision needed to proceed. The list below is a deferred research
queue, not active blocker records; promote an item into a structured entry when
a Phase -1 issue takes ownership of it.

## Active blocker: Bootstrap objective canonicalization

- Context: Objective #26 cannot receive the exact REP-WORKFLOW-000 bootstrap
  approval because the accepted policy does not fully define the closed
  `represent.bootstrap-objective/1` schema, the policy commit binding, or the
  durable snapshot bytes named by the digest.
- Competing alternatives: infer the missing fields; bind the reviewed subject;
  bind the policy revision landed on `main`; add both policy commits; bind a
  canonical snapshot comment; or wait for #10's normal decision packets.
- Affected guarantees: exclusive human approval, reproducible canonical
  authority, landed-policy verification, replay resistance, genesis integrity,
  and the strict #10 through #15 dependency gate.
- Evidence: #26, #27, REP-WORKFLOW-000, and proposed ADR 0004.
- Owner or review role: Jason followed by an independent adversarial security
  and workflow reviewer.
- Smallest decision needed: accept one exact closed bootstrap-objective schema,
  one durable snapshot binding, and one definition of `policy_commit_sha`.

## Deferred for the specification phase

- What equality or equivalence notions should govern round trips at each layer?
- How should multiple valid conversion paths declare and test consistency?
- Which guarantees can be certified generically, and which require
  adapter-provided laws?
- Where is the boundary between neutral constraints and opaque adapter metadata?
- How should generated or defaulted values affect losslessness and projections?

These are prompts for research, not decisions. They do not authorize production
implementation.
