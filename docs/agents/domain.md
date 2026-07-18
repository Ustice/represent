# Domain docs

Represent uses a single shared domain context. Engineering skills read the
repository's existing authority rather than expecting a separate context tree.

## Required reading

Before exploring or changing the repository, read the authority relevant to the
task:

- `AGENTS.md`;
- `docs/development-phases.md` and its required README summary;
- `docs/glossary.md`;
- `docs/vision.md`;
- `docs/architecture.md`;
- relevant ADRs under `docs/decisions/`;
- relevant normative documents under `docs/specifications/`;
- `research/open-questions.md`.

## Vocabulary

Use terminology from the glossary and project documents. Do not silently invent
synonyms or promote terms from `research/concept-inventory.md` into normative
language. If a needed concept is missing, treat that as a possible design gap
and record it through the project's design workflow.

## Conflicts

If proposed work conflicts with an ADR, specification, architectural boundary,
or the current phase, surface the conflict rather than overriding it. Follow the
design blocker protocol in `AGENTS.md` when the conflict prevents safe progress.
