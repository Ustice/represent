# Contributing

Represent develops specifications before implementations. Begin with the
relevant document under `docs/`, identify the guarantee being changed, and keep
the neutral core independent of adapter-specific semantics.

Start work with the matching form under `.github/ISSUE_TEMPLATE/` and follow the
[issue-to-implementation workflow](docs/workflow.md). Each pull request should
use the repository template to link the objective, design, specification
clauses, ADRs, semantic tests, and implementation work that apply.

## Before changing behavior

1. Identify or propose a specification clause.
2. State its observable guarantee and realistic regression.
3. Ask for review from someone who did not author the substantial design.
4. Record unresolved disagreements instead of smoothing them over.

Do not weaken a guarantee, rewrite a valid test only to make an implementation
pass, or introduce target-specific behavior into the universal core.

## Validation

Run the complete local gate before committing:

```sh
pnpm check
```

Individual commands are `pnpm format`, `pnpm format:check`, `pnpm lint`,
`pnpm typecheck`, and `pnpm test`.

## Design blockers

If work reaches a design blocker, stop implementation and follow the protocol in
[AGENTS.md](AGENTS.md): preserve a minimal demonstrating example, update the
open questions and an ADR, and state the smallest decision needed to resume.
