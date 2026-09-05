# Try the release candidate

`0.1.0-rc.0` is a local, validated candidate for experimentation. The packages
remain private and unpublished; a public release, license, and API stability
policy have not been chosen. Package names are provisional until publication.

## Install the archives

From a checkout with Node 26 and dependencies installed:

```sh
pnpm release:check
```

This rebuilds the seven libraries, packs them with pnpm, installs the archives
into a fresh temporary project using npm, compiles a strict TypeScript consumer,
runs it as ordinary Node ESM, exercises an actual Fastify handler, and builds a
browser consumer with Vite. The terminal prints the independent project path.
`dist/release/verification.json` records archive hashes, the Git revision and
whether the worktree was changed, runtime, and checks performed.

To try the same archives in your own ESM project, substitute your checkout path:

```sh
npm install /path/to/represent/dist/release/*.tgz fastify@5.12.3 fast-check@4.9.0 zod@4.4.3
npm install --save-dev typescript@5.9.3
```

Set `"type": "module"` in your project's `package.json`. For TypeScript, use
`"target": "ES2022"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`,
and `"strict": true`. Vite/bundler consumers can use their normal ESM setup. The
archives export JavaScript and `.d.ts` files; they need no TypeScript runtime
loader or workspace aliases. Import explorer CSS explicitly:

```ts
import { createExplorer } from "@represent/explorer";
import "@represent/explorer/style.css";
```

Installing all archives together resolves their unpublished sibling
dependencies. For a core-only experiment, install just
`represent-core-0.1.0-rc.0.tgz`. A smaller adapter installation needs that
adapter's sibling archives and declared peers. Use `pnpm pack` when making
archives from this repository: pnpm rewrites workspace dependencies and the
distribution entrypoints. `npm pack` does not perform that workspace-specific
preparation.

## What has been exercised

| Boundary          | Candidate evidence                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node / TypeScript | Node 26.5.0, TypeScript 5.9.3, strict NodeNext consumer with library checking enabled; inferred codec values and rejected invalid typed inputs/context                  |
| Browser           | Vite 7.3.6 production build plus live explorer selection, relationship/dependency navigation, field inspection, and separately packaged CSS in the macOS in-app browser |
| JSON contracts    | JSON Schema 2020-12 with Ajv 8.20.0; native text, number, boolean, record, list, optional/null domains and explicit unsupported exports                                 |
| Zod               | Zod 4.4.3 parsers and the documented string/choice/email/timestamp leaf export profile; unsupported checks and normalization are refused                                |
| HTTP              | Fastify 5.12.3 operation handlers, awaited outputs, input rejection, and consumer-owned response/error policy                                                           |
| Generation        | fast-check 4.9.0 bounded generators, parser validation, reproducible seeds, explicit custom providers, and shrinking                                                    |
| Certification     | Sensor Bench native JSON profile: actual configuration/revisions, positive and negative inputs, five detected artifact defects, and explicit exclusions                 |

This is an exercised environment, not a promise about every version or runtime.
The candidate is ESM-only; CommonJS, other TypeScript versions, and a
cross-browser support matrix are not part of this evidence. The certification
report describes its own narrower input and target scope; the packaging smoke
check does not expand that certification claim.

## Read the guarantees at the boundary

- Conversion and operation errors identify the failing stage and preserve the
  underlying cause. Typed entrypoints still validate values at runtime.
- A codec declares two mappings. Rounding, normalization, projection, and
  failure remain possible; use traces and meaningful equality to examine round
  trips.
- Route selection reports ties and incomplete searches. A shortest route is not
  automatically equivalent to another route.
- Graph calls, reads, and references are declarations. They do not prove
  complete effect tracking, transactions, or field-level impact.
- Schema comparison reports structure; sample acceptance reports directional
  evidence. Neither establishes universal compatibility or automatically adopts
  a proposed change.
- Adapter refusals preserve unknown constraints. Custom providers own the
  semantics they claim, and certification remains scoped to its report.

The [core guide](../packages/represent/README.md) and
[package guide](../packages/README.md) describe the APIs. Fieldwork and Sensor
Bench remain grounding examples for the next design decisions.
