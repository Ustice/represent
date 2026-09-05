# Represent

An experimental TypeScript toolkit for describing data representations and the
conversions between them. The goal is a shared semantic graph that connects
application data to other systems without replacing their runtimes.

The working example is [Fieldwork](examples/member-desk/), a browser application
built alongside [the core](packages/represent/). It edits members, exchanges API
records through a codec, previews public profiles, edits community events, and
manages RSVPs with signup deadlines. Directory and event attendee CSV exports
use the saved records. Connections traces shared field codecs, operation reads,
and the references used to join members and events. There is no stable API or
compatibility commitment.

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
- [Event model and shared field codecs](examples/member-desk/src/events/model.ts)
- [Core API](packages/represent/src/index.ts)
- [Product vision](docs/vision.md) and [architecture](docs/architecture.md)
- [Conversion and certification contracts](docs/specifications/README.md)
- [Open questions](research/open-questions.md)
- [Project-specific agent context](AGENTS.md)
