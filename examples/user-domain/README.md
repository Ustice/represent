# User domain acceptance case

This is a reference example specification, not an implementation. It should
eventually become Represent's first vertical acceptance case and expose the
semantic differences that a useful design must handle.

## Concept

A User has:

- `id`;
- `email`;
- `displayName`;
- `status`;
- `createdAt`.

Future specifications must decide the types, constraints, ownership, and privacy
of these fields rather than infer them from this outline.

## Planned representations

- **Domain user**: the application-facing concept and its domain semantics.
- **Prisma user**: the persistence representation, including database naming and
  generated values.
- **GraphQL user**: the API representation and its nullability contract.
- **Public user projection**: an intentionally restricted view with private
  fields removed.
- **CSV user export**: a flat, header-addressed transport representation.

## Semantic differences to exercise

The case should cover `Date` values versus ISO strings, renamed fields,
generated identifiers or timestamps, optional versus nullable values,
deliberately dropped private fields, and explicit CSV headers. Paths must say
whether they are reversible, conditionally reversible, or lossy; a
reverse-shaped function alone must not imply a round-trip guarantee.

The eventual acceptance suite should demonstrate useful diagnostics for field
mapping errors, invalid dates, null/missing collapse, unexpected CSV headers,
and attempts to claim losslessness for the public projection. It must not settle
these behaviors until the owning specifications define them.
