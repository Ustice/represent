import { generateBatch, mockSensorSource } from "./fixtures.js";
import { inspectSensor } from "./model.js";
import { parseArgs } from "node:util";
import { temperatureRoute } from "./routing.js";
import { readFile } from "node:fs/promises";
import {
  sensorContract,
  sensorGraph,
  summarizeInput,
  roundTrip,
} from "./commands.js";

async function main() {
  const [command = "summary", ...args] = process.argv.slice(2);
  if (command === "generate" || command === "mock") {
    const { values } = parseArgs({
      args,
      options: {
        seed: { type: "string", default: "162" },
        device: { type: "string", default: "greenhouse-mock" },
      },
    });
    const seed = Number(values.seed);
    if (command === "generate") return generateBatch(seed);
    return inspectSensor.execute(
      { device: values.device },
      mockSensorSource(seed),
    );
  }
  if (command === "route") {
    const { values } = parseArgs({
      args,
      options: {
        policy: { type: "string", default: "unique" },
        value: { type: "string", default: "68.1" },
      },
    });
    const input: unknown = JSON.parse(values.value);
    return temperatureRoute(input, values.policy);
  }
  const [file, ...extra] = args;
  if (extra.length)
    throw new Error(
      "Usage: sensor [summary|round-trip|schema|graph] [file.json]",
    );
  if (command === "schema") return sensorContract();
  if (command === "graph") return sensorGraph;
  if (command !== "summary" && command !== "round-trip")
    throw new Error(
      "Choose summary, round-trip, schema, graph, route, generate, or mock",
    );
  const source = await readFile(
    file ?? new URL("../sample.json", import.meta.url),
    "utf8",
  );
  const input: unknown = JSON.parse(source);
  const result =
    command === "summary" ? summarizeInput(input) : roundTrip(input);
  if ("status" in result && result.status === "failed") {
    const failed = result.steps.find((step) => step.status === "failed");
    if (failed?.status === "failed") throw failed.error;
  }
  return result;
}
void main()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Sensor command failed",
    );
    process.exitCode = 1;
  });
