# Represent

[![Current phase: -1 — Engineer the Design](https://img.shields.io/static/v1?label=Current%20phase&message=Phase%20-1%20%E2%80%94%20Engineer%20the%20Design&color=blue)](docs/development-phases.md#phase--1--engineer-the-design)

Represent is a proposed framework-neutral TypeScript toolkit for defining domain
data and operations once, connecting them to the rest of an application stack,
and deriving useful artifacts from a shared semantic graph.

The project is currently in
[Phase -1: Engineer the Design](docs/development-phases.md#phase--1--engineer-the-design).
There is no production library or stable public API. Executable specifications
and learning implementations support the design; they carry no compatibility
commitments.

## Product direction

Represent aims to describe domain schemas, representations, structured
conversions, operations, and their relationships. Plugins may then connect that
neutral model to systems such as Standard Schema, GraphQL, Prisma, tRPC, and CSV
without replacing those systems.

See [the vision](docs/vision.md), [architecture](docs/architecture.md), and
[workflow](docs/workflow.md) for the current boundaries. The
[development phases](docs/development-phases.md) define what kind of work is
appropriate at each stage.

## Project navigation

- [Working guide](AGENTS.md) and [workflow](docs/workflow.md)
- [Current phase and transition rules](docs/development-phases.md)
- [Architecture decisions](docs/decisions/README.md)
- [Normative specifications](docs/specifications/README.md)
- [Open questions](research/open-questions.md)
- [CI and local validation](docs/ci.md)

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

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before making
design or implementation changes.

## Status

The repository contains architecture and conversion specifications, executable
conversion evidence, testing and certification requirements, and a reference
acceptance-case outline. See the
[specification index](docs/specifications/README.md) for current specification
status. Semantic design remains Phase -1 work with no production or
compatibility status.
