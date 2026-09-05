import { graph, optionalCodec, recordCodec } from "@represent/core";
import { z } from "zod";
import { dateTime, field } from "../fields.js";

export const eventExchange = recordCodec({
  name: "Event exchange",
  from: "Event",
  to: "Event API",
  fields: {
    id: field("Event ID", z.string().min(1)),
    title: field(
      "Event title",
      z.string().trim().min(1, "Enter an event title"),
    ),
    startsAt: dateTime,
    endsAt: dateTime,
    rsvpBy: optionalCodec(dateTime),
  },
  validate(value) {
    if (value.endsAt <= value.startsAt)
      throw new Error("endsAt: End must be after start.");
    if (value.rsvpBy && value.rsvpBy > value.startsAt)
      throw new Error("rsvpBy: RSVP deadline must be on or before the start.");
  },
});

export type CommunityEvent = ReturnType<typeof eventExchange.decode.run>;
export const eventGraph = graph([eventExchange.encode, eventExchange.decode]);

export const sampleEvents = [
  {
    id: "evt_01",
    title: "Saturday makers circle",
    startsAt: "2026-09-12T14:00:00Z",
    endsAt: "2026-09-12T16:00:00Z",
    rsvpBy: "2026-09-11T18:00:00Z",
  },
  {
    id: "evt_02",
    title: "Community garden morning",
    startsAt: "2026-09-19T09:00:00Z",
    endsAt: "2026-09-19T12:00:00Z",
  },
].map((value) => eventExchange.decode.run(value));

export function readEvents(input: unknown) {
  const events = z
    .array(z.unknown())
    .parse(input)
    .map((value) => eventExchange.decode.run(value));
  if (
    !events.length ||
    new Set(events.map(({ id }) => id)).size !== events.length
  )
    throw new Error("An event list needs events with unique identifiers.");
  return events;
}
