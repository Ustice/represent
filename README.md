# Represent

An experimental TypeScript toolkit for describing data representations and the
conversions between them. The goal is a shared semantic graph that connects
application data to other systems without replacing their runtimes.

The working example is [Fieldwork](examples/member-desk/), a browser application
built alongside [the core](packages/represent/). It edits members, exchanges API
records through a codec, previews public profiles, edits community events, and
manages RSVPs with signup deadlines and bulk email-list preview/import.
Directory and event attendee CSV exports use the saved records. Connections
hosts a reusable explorer with relationship and dependency views through shared
field codecs, declared operation calls, reads, and references. It also inspects
record fields and known value structure, leaving opaque parser behavior unknown.
Connections also includes a Contract lab that validates generated RSVP JSON
Schema with Ajv, plus a Change preview comparing proposed attendance-note
contracts and their declared dependencies. There is no stable API or
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
