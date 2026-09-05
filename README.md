# Represent

Represent is a proposed framework-neutral TypeScript toolkit for defining domain
data and operations once, connecting them to the rest of an application stack,
and deriving useful artifacts from a shared semantic graph.

The project is experimental. There is no production library or stable public
API, and no compatibility commitment. Design, implementation, and tests develop
together as we learn from concrete use cases.

## Product direction

Represent aims to describe domain schemas, representations, structured
conversions, operations, and their relationships. Plugins may then connect that
neutral model to systems such as Standard Schema, GraphQL, Prisma, tRPC, and CSV
without replacing those systems.

See the [vision](docs/vision.md) and [architecture](docs/architecture.md) for
product direction, and [AGENTS.md](AGENTS.md) for how we work.

## Project navigation

- [Project-specific agent context](AGENTS.md)
- [Normative specifications](docs/specifications/README.md)
- [Open questions](research/open-questions.md)
- [CI](.github/workflows/ci.yml)

## Development

Use Node.js 26 and pnpm 11. The repository includes `.nvmrc`; use `nvm use` or
select Node 26 with another version manager before installing dependencies.

```sh
nvm use
npm install --global corepack@0.35.0
corepack enable
pnpm install
pnpm check
```

`pnpm check` runs formatting, lint, typechecking, and tests. CI runs the same
command. There are no development-phase gates or required issue templates.

## Status

The repository contains architecture and conversion specifications, executable
conversion evidence, testing and certification requirements, and a reference
acceptance-case outline. See the
[specification index](docs/specifications/README.md) for current specification
status.
