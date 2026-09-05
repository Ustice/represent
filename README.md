# Represent

Represent is an experimental TypeScript toolkit for describing data, converting
between representations, and inspecting the relationships in an application. A
shared model can drive parsers, JSON contracts, generators, and development
tools while existing libraries retain their runtimes.

The **0.1.0-rc.0 candidate** is installable from local package archives. It has
not been published to npm and has no API stability commitment. See
[installation and tested scope](docs/release-candidate.md).

## Start with a real boundary

A codec connects two representations. A record codec combines field codecs, so
changing a field declaration updates parsing, conversion, and graph structure
together. Here a reading uses a `Date` in the application and an ISO timestamp
in JSON:

```ts
import {
  codec,
  dateValue,
  numberValue,
  recordCodec,
  text,
} from "@represent/core";
import { fromZod } from "@represent/zod";
import { z } from "zod";

const instant = codec({
  name: "ISO instant",
  from: dateValue("Instant"),
  to: fromZod("Timestamp", z.iso.datetime()),
  encode: (value) => value.toISOString(),
  decode: (value) => new Date(value),
});
const reading = recordCodec({
  name: "Reading API",
  from: "Reading",
  to: "Reading JSON",
  fields: {
    station: text("Station", { nonempty: true }),
    time: instant,
    temperature: numberValue("Temperature", { min: -40, max: 125 }),
  },
});
const value = reading.decode.run({
  station: "North garden",
  time: "2026-09-05T12:00:00.000Z",
  temperature: 21.5,
});
value.time.getUTCFullYear(); // Date, inferred without an annotation
const payload = reading.encode.convert(value); // time is a string again
```

`run` accepts external `unknown`; `convert` also checks the input type at
compile time. Both validate the input, execute the mapping, and validate its
output. Failures retain their input/map/output stage and underlying cause. A
codec provides both directions; it does not claim that they are lossless
inverses.

From the same model, use [JSON Schema](packages/json-schema/) to export a
contract, [fast-check](packages/fast-check/) to derive bounded generators, or
[the explorer](packages/explorer/) to inspect the graph. Unsupported constraints
remain explicit. [The core API guide](packages/represent/README.md) covers
operations, composition, routing, tracing, and change evidence.

## Try the consumers

Use Node.js 26 and pnpm 11 (`.nvmrc` pins the tested Node version).

```sh
nvm use
npm install --global corepack@0.35.0
corepack enable
pnpm install
pnpm dev
```

**[Fieldwork](examples/member-desk/)** is the browser consumer at the URL
printed by Vite. It edits members and events, handles RSVPs and bulk imports,
and exports CSV. Its Connections workspace contains the model explorer, contract
lab, conversion playground, editable change proposals, and server lab. Run
`pnpm server` in another terminal for the server lab's real Fastify/file
boundary. Browser records and the server fixture are separate.

**[Sensor Bench](examples/sensor-bench/)** is an independent CLI consumer. It
makes precision loss, nullable readings, routing policies, generated fixtures,
and scoped certification concrete:

```sh
pnpm sensor summary
pnpm sensor route --policy unrounded
pnpm sensor generate --seed 162
pnpm sensor mock --seed 162 --device greenhouse-north
pnpm sensor certify --seed 162
```

`pnpm check` runs formatting, lint, typechecking, tests, library/application
builds, and installation checks against the actual package archives.
`pnpm release:check` rebuilds and verifies just the packages; its archives and
evidence are written to `dist/release/`.

## Find your way around

- [Package guide](packages/README.md): choose the pieces you need.
- [Installed-package consumer](tests/packaged/): public imports, declarations,
  ordinary Node ESM, Fastify, and a browser build outside the workspace.
- [Product vision](docs/vision.md), [architecture](docs/architecture.md), and
  [conversion/certification contracts](docs/specifications/README.md).
- [Current roadmap](https://github.com/Ustice/represent/issues/2) and
  [open questions](research/open-questions.md).
