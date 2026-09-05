# Represent

An experimental TypeScript toolkit for describing data representations and the
conversions between them. The goal is a shared semantic graph that connects
application data to other systems without replacing their runtimes.

The first working slice is [Member desk](examples/member-desk/), a browser
application built alongside [the core](packages/represent/). It edits members,
exchanges API records through a codec, previews public profiles, exports a CSV
roster, and displays the conversions
behind those views. There is no stable API or compatibility commitment.

## Run it

Use Node.js 26 and pnpm 11. The repository includes `.nvmrc`.

```sh
nvm use
npm install --global corepack@0.35.0
corepack enable
pnpm install
pnpm dev
```

Open the local URL printed by Vite. `pnpm build` builds the application;
`pnpm check` runs formatting, lint, typechecking, tests, and the application
build. CI runs the same check.

## Explore

- [Consuming application model](examples/member-desk/src/model.ts)
- [Core API](packages/represent/src/index.ts)
- [Product vision](docs/vision.md) and [architecture](docs/architecture.md)
- [Conversion and certification contracts](docs/specifications/README.md)
- [Open questions](research/open-questions.md)
- [Project-specific agent context](AGENTS.md)
