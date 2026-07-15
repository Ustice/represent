# Rejected designs

Record designs that were seriously considered and rejected so future sessions do
not reopen them without new evidence. Each entry should state the proposal,
reason for rejection, evidence, affected ADR or specification, and conditions
that would justify reconsideration.

## Replacing integrated libraries

Rejected at project inception. Represent adapters translate neutral semantics
into artifacts or wrappers for existing systems; they do not own database
migrations, generated clients, GraphQL servers, validation ecosystems, or RPC
runtimes. Reconsideration would contradict the current product boundary and
requires a new product-level ADR.
