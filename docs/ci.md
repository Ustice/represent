# Continuous integration and local validation

CI exists to reproduce the repository's declared gate, not to substitute line
coverage for semantic evidence. Pull requests and pushes to `main` run
`.github/workflows/ci.yml` on Node 22 with pnpm 11 and execute `pnpm check`.

Local contributors run the same commands after selecting the version in
`.nvmrc`:

```sh
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` runs formatting, lint, TypeScript, and Vitest. The initial Phase -2
scaffold allowed Vitest to pass with no test files because no product or
executable semantic implementation existed. That allowance ended when the first
workflow test was added; the suite must now contain and execute tests.

CI failure blocks integration. A green gate proves only the checks it actually
runs. Pull-request evidence must separately report independent review,
traceability, semantic or workflow-test records, skipped obligations, and
unresolved gaps.
