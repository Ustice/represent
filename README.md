# Represent

Represent is a proposed framework-neutral TypeScript toolkit for defining domain
data and operations once, connecting them to the rest of an application stack,
and deriving useful artifacts from a shared semantic graph.

The project is currently in its engineering-system phase. There is no library
implementation and no stable public API. The next phase is to write and
adversarially review specifications before production code begins.

## Product direction

Represent aims to describe domain schemas, representations, structured
conversions, operations, and their relationships. Plugins may then connect that
neutral model to systems such as Standard Schema, GraphQL, Prisma, tRPC, and CSV
without replacing those systems.

See [the vision](docs/vision.md), [architecture](docs/architecture.md), and
[workflow](docs/workflow.md) for the current boundaries.

## Development

Use Node.js 22 and pnpm 11.

```sh
corepack enable
pnpm install
pnpm check
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before making
design or implementation changes.

## Status

The repository contains process, architecture boundaries, and a reference
acceptance-case outline only. Schema, representation, conversion, and operation
specifications are intentionally deferred.
