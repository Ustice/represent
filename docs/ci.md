# Continuous integration and local validation

CI exists to reproduce the repository's declared gate, not to substitute line
coverage for semantic evidence. Pull requests and pushes to `main` run
`.github/workflows/ci.yml` on Node 26 with pnpm 11 and execute `pnpm check`.

Local contributors run the same commands after selecting the version in
`.nvmrc`:

```sh
nvm use
npm install --global corepack@0.35.0
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

Node 26 no longer bundles Corepack, so CI and fresh local environments install
the pinned Corepack release after selecting Node and before enabling the pnpm
version declared by `packageManager`. Automatic package-manager caching remains
disabled in `actions/setup-node` because it would otherwise look up pnpm before
Corepack provisions it.

`pnpm check` runs formatting, lint, TypeScript, and Vitest. The initial Phase -2
scaffold allowed Vitest to pass with no test files because no product or
executable semantic implementation existed. That allowance ended when the first
workflow test was added; the suite must now contain and execute tests.

CI failure blocks integration. A green gate proves only the checks it actually
runs. Pull-request evidence must separately report independent review,
traceability, semantic or workflow-test records, skipped obligations, and
unresolved gaps.
