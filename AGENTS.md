# Working on Represent

Represent is a framework-neutral TypeScript toolkit in design. Its neutral core
owns schemas, representations, conversions, operations, and their graph;
adapters own target-specific meaning. Use approachable public language, with
algebra supporting the guarantees rather than dominating the API.

## Start with the task

Read the [current phase](docs/development-phases.md) before implementation, then
only the specifications and context relevant to the change. The README must
agree with the phase declaration. Phase -1 permits executable specifications and
learning implementations, with no production or compatibility status.

A direct request from Jason is enough to start scoped work. Use judgment for
routine, reversible changes; ask when a material design choice or consequential
action needs his decision. Issues track work worth keeping, not permission to
edit. The short [workflow](docs/workflow.md) applies to humans and agents alike.

## Protect the design

- Specifications own behavior; ADRs explain consequential choices. Keep adapter
  semantics out of the core, including interpretation of opaque metadata.
- Do not silently weaken a guarantee or change a valid test to accommodate a
  defect. Explain intentional behavior changes and update their owning docs.
- Use concrete examples to resolve uncertainty. If a semantic conflict blocks
  progress, preserve the example and decision needed in one durable place.
- Get independent review for substantial designs. Use a focused agent when it
  adds useful expertise; retain unresolved disagreements.
- Prefer clear type boundaries and inferred internals over casts or unnecessary
  abstractions. Preserve unrelated work and checkpoint useful progress.

## Validate and finish

Use Node.js 26 and the pnpm version in `package.json`. Run focused checks while
working and `pnpm check` before handoff; it already includes formatting, lint,
typechecking, and tests. Test behavior and realistic regressions, not private
structure. The
[testing specification](docs/specifications/testing-and-certification.md) owns
semantic evidence and certification requirements.

Report the outcome, validation, and material limitations. Link relevant files or
clauses when useful. No separate handoff document or empty checklist is needed.

## Agent skills

- Issue tracker: GitHub through `gh`; see
  [issue-tracker](docs/agents/issue-tracker.md).
- Triage labels: see [triage-labels](docs/agents/triage-labels.md).
- Domain docs: see [domain](docs/agents/domain.md).
