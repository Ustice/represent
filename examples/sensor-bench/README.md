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
round-trip command shows captured boundary values and changed reading indexes,
including timestamp normalization. It makes no general losslessness claim.

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
