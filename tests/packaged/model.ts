import {
  codec,
  dateValue,
  graph,
  numberValue,
  optional,
  recordCodec,
  text,
} from "@represent/core";
import { fromZod } from "@represent/zod";
import { z } from "zod";

export const timestamp = fromZod("Timestamp", z.iso.datetime());
const instant = codec({
  name: "ISO instant",
  from: dateValue("Instant"),
  to: timestamp,
  encode: (value) => value.toISOString(),
  decode: (value) => new Date(value),
});
export const reading = recordCodec({
  name: "Reading API",
  from: "Reading",
  to: "Reading JSON",
  fields: {
    station: text("Station", { nonempty: true }),
    time: instant,
    temperature: numberValue("Temperature", { min: -40, max: 125 }),
    note: optional(text("Note")),
  },
});
export const input = {
  station: "North garden",
  time: "2026-09-05T12:00:00.000Z",
  temperature: 21.5,
};
export const model = graph([reading.encode, reading.decode]);
