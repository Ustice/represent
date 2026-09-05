# Packages

Start with the core and add adapters at the boundary you actually use. All seven
packages share candidate version `0.1.0-rc.0`; they are private, locally
packable, and not published to npm.
[Installation and tested scope](../docs/release-candidate.md) explains how to
try them outside this workspace.

| Package                                | Purpose                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [@represent/core](represent/)          | Representations, codecs, operations, graph/dependency inspection, routing, tracing, and change evidence |
| [@represent/json-schema](json-schema/) | Explicitly supported JSON Schema 2020-12 contracts, with diagnostics for unexportable constraints       |
| [@represent/zod](zod/)                 | Existing Zod parsers and a narrow Zod 4.4.3 leaf export profile                                         |
| [@represent/fastify](fastify/)         | Validated operation handlers; Fastify still owns routes, hooks, serialization, and errors               |
| [@represent/fast-check](fast-check/)   | Bounded generators with explicit providers for custom domains                                           |
| [@represent/testing](testing/)         | Acceptance checks and scoped certification reports, independent of a test runner                        |
| [@represent/explorer](explorer/)       | Replaceable browser views over the neutral graph, with separately imported CSS                          |

Workspace exports point to source for immediate development feedback. The pnpm
packed manifests point to compiled ESM and declarations, and contain only the
runtime output and package documentation. The independent installation check
exercises that actual distribution boundary.
