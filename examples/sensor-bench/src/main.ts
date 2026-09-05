import { readFile } from "node:fs/promises";
import {
  sensorContract,
  sensorGraph,
  summarizeInput,
  roundTrip,
} from "./commands.js";

async function main() {
  const [command = "summary", file, ...extra] = process.argv.slice(2);
  if (extra.length)
    throw new Error(
      "Usage: sensor [summary|round-trip|schema|graph] [file.json]",
    );
  if (command === "schema") return sensorContract();
  if (command === "graph") return sensorGraph;
  if (command !== "summary" && command !== "round-trip")
    throw new Error("Choose summary, round-trip, schema, or graph");
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
