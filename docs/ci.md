# Validation

Use Node.js 26 (`.nvmrc`) and the pnpm version pinned in `package.json`. Setup
commands are in the [README](../README.md#development).

Run `pnpm check` before handoff. It runs formatting, ESLint, TypeScript, and
Vitest; there is no need to run all four separately and then repeat the gate.
Use focused commands during development. Report failed or skipped checks and
what remains unverified.

[CI](../.github/workflows/ci.yml) runs the same gate for pull requests and
pushes to `main`. It provisions Node, installs pinned Corepack, enables pnpm,
and installs with the frozen lockfile before checking. Package-manager cache
discovery stays disabled until pnpm is provisioned.

A green gate establishes only the behavior those checks exercise. It does not
replace design review or establish a universal adapter-certification claim.
