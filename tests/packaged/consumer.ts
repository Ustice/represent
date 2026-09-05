import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  asyncOperation,
  ConversionError,
  findRoutes,
  selectRoute,
  text,
  tracePath,
} from "@represent/core";
import { toJsonSchema } from "@represent/json-schema";
import { operationHandler } from "@represent/fastify";
import { toArbitrary } from "@represent/fast-check";
import { checkContract, certify } from "@represent/testing";
import { createExplorer } from "@represent/explorer";
import { zodJsonSchema } from "@represent/zod";
import { Ajv2020 } from "ajv/dist/2020.js";
import fastify from "fastify";
import * as fc from "fast-check";
import { input, model, reading, timestamp } from "./model.js";

for (const name of [
  "core",
  "json-schema",
  "fastify",
  "fast-check",
  "testing",
  "explorer",
  "zod",
])
  assert.match(
    import.meta.resolve(`@represent/${name}`),
    /\/node_modules\/@represent\/[^/]+\/dist\/index\.js$/,
  );

const value = reading.decode.run(input);
assert.equal(value.time.getUTCFullYear(), 2026);
assert.deepEqual(reading.encode.convert(value), input);
assert.equal(Object.hasOwn(value, "note"), false);
assert.throws(
  () => reading.decode.run({ ...input, temperature: 126 }),
  (error) => error instanceof ConversionError && error.stage === "input",
);
const routes = findRoutes([reading.encode, reading.decode], {
  from: reading.decode.from,
  to: reading.decode.to,
});
const selected = selectRoute(routes);
assert.equal(selected.status, "selected");
if (selected.status !== "selected") throw new Error("Expected unique route");
const trace = tracePath(selected.route, input, { snapshot: structuredClone });
assert.equal(trace.status, "completed");

const wire = reading.encode.to;
const schema = toJsonSchema(wire, { providers: [zodJsonSchema] });
const accepts = new Ajv2020({ strict: true }).compile(schema);
const acceptance = () =>
  checkContract({
    representation: wire,
    accepts,
    samples: [
      { label: "Reading", value: input },
      { label: "Invalid timestamp", value: { ...input, time: "yesterday" } },
      { label: "Temperature too high", value: { ...input, temperature: 126 } },
    ],
    copy: structuredClone,
  });
assert.equal(acceptance().status, "pass");
const report = await certify({
  declaration: {
    adapter: {
      name: "Installed JSON Schema + Zod bridge",
      revision: "0.1.0-rc.0",
    },
    profile: { name: "Packaged reading smoke check", revision: "1" },
    target: { name: "Ajv", version: "8.20.0" },
    runtime: { name: "Node.js", version: process.versions.node },
    suiteRevision: "1",
    configuration: { strict: true },
    claims: [{ name: "reading-samples", kind: "capability" }],
    domains: [
      "One reading and two invalid scalar samples; packaging smoke evidence only",
    ],
  },
  cases: [
    {
      id: "acceptance",
      scope: "target",
      required: true,
      claims: ["reading-samples"],
      run: acceptance,
    },
  ],
});
assert.equal(report.status, "passed");
const generated = fc.sample(
  toArbitrary(wire, {
    providers: [
      {
        name: "Fixed timestamp",
        arbitrary: (subject) =>
          subject === timestamp ? fc.constant(input.time) : undefined,
      },
    ],
  }),
  { seed: 162, numRuns: 10 },
);
assert.equal(generated.length, 10);
for (const sample of generated) assert.equal(accepts(sample), true);

const lookup = asyncOperation({
  name: "Lookup reading",
  input: text("Requested station", { nonempty: true }),
  output: wire,
  async perform(
    station,
    context: { read: (station: string) => Promise<unknown> },
  ) {
    return wire.parse(await context.read(station));
  },
});
const app = fastify();
app.get(
  "/reading",
  operationHandler(lookup, {
    input: (request) => request.headers["station"],
    context: () => ({
      read: (station) => Promise.resolve({ ...input, station }),
    }),
  }),
);
try {
  const response = await app.inject({
    url: "/reading",
    headers: { station: "South garden" },
  });
  assert.equal(response.statusCode, 200);
  const body: unknown = JSON.parse(response.body);
  assert.deepEqual(body, { ...input, station: "South garden" });
  const rejected = await app.inject({ url: "/reading" });
  assert.equal(rejected.statusCode, 400);
} finally {
  await app.close();
}
assert.match(createExplorer(model).render(), /Reading JSON/);
const css = readFileSync(
  new URL(import.meta.resolve("@represent/explorer/style.css")),
  "utf8",
);
assert.match(css, /\.rx/);

function checkPublicTypes() {
  const domain = reading.decode.run(input);
  const year: number = domain.time.getUTCFullYear();
  const apiTime: string = reading.encode.convert(domain).time;
  const note: string | undefined = domain.note;
  // @ts-expect-error Domain conversion requires Date, not its JSON representation.
  reading.encode.convert(input);
  // @ts-expect-error Typed input rejects unknown station values.
  void lookup.execute(123, { read: () => Promise.resolve(input) });
  operationHandler(lookup, {
    input: () => "North",
    // @ts-expect-error Context remains typed across the Fastify adapter.
    context: () => ({ read: 1 }),
  });
  return { year, apiTime, note };
}
void checkPublicTypes;
console.log(
  "Installed packages: codec, diagnostics, routing, contracts, generators, async HTTP, explorer, and public types passed.",
);
