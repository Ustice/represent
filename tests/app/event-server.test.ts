import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "../../examples/member-desk/server/app.js";
import { fileEvents } from "../../examples/member-desk/server/store.js";

describe("file-backed Event API", () => {
  it("reads current file data, returns encoded events, and distinguishes missing data from a broken directory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "represent-event-api-"));
    const file = join(directory, "events.json");
    const event = {
      id: "e",
      title: "  Gathering  ",
      startsAt: "2026-09-12T10:00Z",
      endsAt: "2026-09-12T12:00Z",
    };
    await writeFile(file, JSON.stringify([event]));
    const server = createServer(fileEvents(pathToFileURL(file)));
    try {
      const first = await server.inject("/api/events/e");
      expect(first.statusCode).toBe(200);
      expect(first.json()).toEqual({
        ...event,
        title: "Gathering",
        startsAt: "2026-09-12T10:00:00.000Z",
        endsAt: "2026-09-12T12:00:00.000Z",
      });
      const missing = await server.inject("/api/events/missing");
      expect(missing.statusCode).toBe(404);
      expect(missing.json()).toEqual({ error: "Event not found" });
      const malformed = await server.inject("/api/events/%E0%A4%A");
      expect(malformed.statusCode).toBe(400);
      await writeFile(
        file,
        JSON.stringify([{ ...event, title: "Updated gathering" }]),
      );
      expect((await server.inject("/api/events/e")).json()).toMatchObject({
        title: "Updated gathering",
      });
      await writeFile(
        file,
        JSON.stringify([{ ...event, endsAt: "2026-09-12T09:00Z" }]),
      );
      const invalid = await server.inject("/api/events/e");
      expect(invalid.statusCode).toBe(500);
      expect(invalid.json()).toEqual({
        error: "The event lookup failed",
      });
    } finally {
      await server.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
