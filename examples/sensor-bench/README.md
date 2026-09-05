# Sensor Bench

A small independent CLI consumer for telemetry batches. It exercises finite
numbers and ranges, integer percentages, booleans, lists, null availability,
collection codecs, JSON contracts, and conversion evidence. It does not depend
on Fieldwork or a server.

```sh
pnpm sensor summary
pnpm sensor summary path/to/batch.json
pnpm --silent sensor round-trip
pnpm --silent sensor schema > sensor.schema.json
pnpm --silent sensor graph > sensor.graph.json
```

The sample protocol reports Fahrenheit temperatures. The domain model uses
Celsius and Date objects. Each conversion direction rounds temperature to one
decimal: the sample's 68.1°F becomes 20.1°C and returns as 68.2°F. The
round-trip command shows captured boundary values and reports temperature
changes separately from timestamp-spelling changes for each affected reading. It
makes no general losslessness claim.

`temperature: null` means a reading is unavailable; a missing temperature field
is invalid. False online status and zero battery remain real values. Empty
batches and all-unavailable batches produce a null mean, not a fabricated zero.
The default sample has three readings, two available, and a 21.2°C mean.

The generated JSON Schema describes the wire representation, including numeric
bounds, integer battery values, boolean status, required lists, and nullable
readings. The timestamp leaf uses the existing Zod bridge. The neutral graph
includes list-element and wrapper relationships, and can be rendered by the same
explorer used in Fieldwork. CLI output is JSON on stdout; failures produce a
diagnostic on stderr and a nonzero exit status.

The `route` command compares two explicitly registered Fahrenheit-to-Celsius
conversions. With 68.1°F, reported precision produces 20.1°C; the unrounded
calculation produces approximately 20.05556°C. Neither is declared lossless.

```sh
pnpm --silent sensor route
pnpm --silent sensor route --policy fewest
pnpm --silent sensor route --policy reported --value 68.1
pnpm --silent sensor route --policy unrounded --value 68.1
```

The default and fewest-step policies report ambiguity because both direct paths
are valid candidates. The two precision policies explicitly exclude the other
conversion and trace the selected path. Results include endpoints, candidates,
scores, policy, search completeness, and intermediate values. An ambiguous
result does not execute or validate the supplied value. Ordinary batch
processing still uses the reported-precision codec explicitly.

Generate a reusable mock batch or run the real inspection operation against a
mock data source:

```sh
pnpm --silent sensor generate --seed 162 > batch.json
pnpm sensor summary batch.json
pnpm sensor mock --seed 162 --device greenhouse-north
```

The fast-check adapter derives the wire batch generator from its
representations. An explicit provider chooses synthetic greenhouse identifiers
and canonical 2026 timestamps; numeric bounds, booleans, nullable readings, and
lists come from the model. This example limits strings to 16 code points and
batches to 8 readings. A signed 32-bit seed reproduces values with the same
model, limits, providers, and fast-check 4.9.0.

The mock source clones its fixture for each read and labels it with the
requested device. `Inspect sensor` awaits the source, validates/decodes its
payload, checks the device identity, and summarizes the domain batch. Injecting
a mock does not bypass the operation or its conversions. The graph includes that
operation and its declared calls. Generated batches are synthetic test data, not
recorded sensor observations.

Run the initial JSON Schema certification profile:

```sh
pnpm --silent sensor certify --seed 162 > certification.json
```

The report identifies source-content hashes for the adapter, core, generator,
suite, and profile; actual Ajv, fast-check, Zod, and Node versions; validator
configuration; seed; and input domains. This profile covers native JSON packet
acceptance, using 100 bounded generated packets serialized to JSON plus explicit
positive/negative sentinels. It exercises every required field, text and numeric
constraints, integer/list kinds, optional/null presence, and extra fields. It
also checks actionable refusal of known unexportable constructs.

Four deliberate artifact defects must be detected: dropped fields, swapped
compatible field constraints, collapsed null/presence, and an always-accepting
contract. The same profile fails when supplied an exporter containing those
defects, a permissive fallback, or a crashing exporter. Algebraic identity,
conversion composition, and impact checks are explicitly skipped because this
profile claims none of those capabilities. It does not certify the Zod bridge,
Fastify adapter, or all JSON Schema features.

Required failures, missing evidence, and harness errors produce a nonzero exit
status with a failed report when checks can run. Setup failures produce a stderr
diagnostic. The neutral `@represent/testing` functions orchestrate cases; this
consumer owns target-specific fixtures, mutations, and interpretation.
