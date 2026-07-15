# Architecture

This document describes conceptual layers, not fixed modules or APIs. Design
specifications must refine the boundaries before implementation commits to a
shape.

```text
domain schema language
  -> neutral structural model
  -> representations
  -> typed conversion graph
  -> operation graph
  -> adapters
  -> testing and analysis tools
```

The domain schema language should express domain intent. The neutral structural
model should retain only universal meaning. Representations describe distinct
shapes or interpretations of related data. The typed conversion graph connects
them with declared guarantees. The operation graph relates domain behavior to
the data it consumes and produces. Adapters translate this model for external
systems. Testing and analysis tools inspect the same graph for contracts,
diagnostics, certification, and impact.

## Relationship levels

- Schema-level relationships describe how structures correspond, including field
  mapping, products, alternatives, projections, and constraints.
- Value-level conversions transform concrete values between representations and
  declare properties such as validation, losslessness, or round-trip behavior.
- Operation-level mappings connect an operation's inputs, outputs, and declared
  effects to schemas and representations.
- Operation-to-operation transformations relate whole operations, such as
  adapting a domain operation to a transport procedure while preserving stated
  behavior.

These levels must not be collapsed merely because an early implementation can
represent them with similar functions. Their guarantees and diagnostic needs may
differ.

## Plugin boundary

Adapters are plugins, not built-in transport implementations. A Prisma plugin
may emit schema fragments or mappings; a GraphQL plugin may emit SDL, framework
definitions, or resolver wrappers; Standard Schema and tRPC plugins may expose
the interfaces their ecosystems expect. Those systems continue to own their
generators, servers, migrations, procedures, and runtimes.

The core may preserve opaque plugin metadata, but only its owning plugin may
interpret it. If an adapter requires target-specific semantics in the neutral
model, treat that as a design blocker rather than expanding the core silently.
