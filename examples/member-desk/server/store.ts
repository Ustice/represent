import { readFile } from "node:fs/promises";
import { readEvents } from "../src/events/model.js";

export function fileEvents(file: URL) {
  return {
    async load() {
      const source = await readFile(file, "utf8");
      const data: unknown = JSON.parse(source);
      return readEvents(data);
    },
  };
}
