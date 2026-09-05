import { describe, expect, it } from "vitest";
import {
  eventExchange,
  readEvents,
  sampleEvents,
} from "../../examples/member-desk/src/events/model.js";
import { memberExchange } from "../../examples/member-desk/src/model.js";

const original = {
  id: "evt-test",
  title: "Makers night",
  startsAt: new Date("2026-09-12T18:00:00.123Z"),
  endsAt: new Date("2026-09-12T20:30:00.456Z"),
  rsvpBy: new Date("2026-09-11T12:00:00.789Z"),
};

describe("events consuming shared field codecs", () => {
  it("round-trips distinct dates through JSON without swapping fields", () => {
    const payload = eventExchange.encode.convert(original);
    expect(payload).toEqual({
      id: "evt-test",
      title: "Makers night",
      startsAt: "2026-09-12T18:00:00.123Z",
      endsAt: "2026-09-12T20:30:00.456Z",
      rsvpBy: "2026-09-11T12:00:00.789Z",
    });
    const input: unknown = JSON.parse(JSON.stringify(payload));
    expect(eventExchange.decode.run(input)).toEqual(original);
  });
  it("omits an absent deadline through both directions and rejects null", () => {
    const withoutDeadline = {
      id: original.id,
      title: original.title,
      startsAt: original.startsAt,
      endsAt: original.endsAt,
    };
    const payload = eventExchange.encode.convert(withoutDeadline);
    expect(Object.hasOwn(payload, "rsvpBy")).toBe(false);
    const recovered = eventExchange.decode.run(payload);
    expect(recovered).toEqual(withoutDeadline);
    expect(Object.hasOwn(recovered, "rsvpBy")).toBe(false);
    expect(() =>
      eventExchange.decode.run({ ...payload, rsvpBy: null }),
    ).toThrow(/rsvpBy/);
  });
  it("enforces timing relationships for both imports and typed domain inputs", () => {
    for (const endsAt of [
      original.startsAt,
      new Date("2026-09-12T17:00:00Z"),
    ]) {
      expect(() =>
        eventExchange.encode.convert({ ...original, endsAt }),
      ).toThrow(/End must be after start/);
      expect(() =>
        eventExchange.decode.run({
          ...eventExchange.encode.convert(original),
          endsAt: endsAt.toISOString(),
        }),
      ).toThrow(/End must be after start/);
    }
    expect(() =>
      eventExchange.encode.convert({ ...original, rsvpBy: original.endsAt }),
    ).toThrow(/RSVP deadline/);
    expect(() =>
      eventExchange.decode.run({
        ...eventExchange.encode.convert(original),
        rsvpBy: original.endsAt.toISOString(),
      }),
    ).toThrow(/RSVP deadline/);
    expect(
      eventExchange.encode.convert({ ...original, rsvpBy: original.startsAt })
        .rsvpBy,
    ).toBe(original.startsAt.toISOString());
  });
  it("normalizes offsets consistently in events and members", () => {
    const timestamp = "2026-09-12T14:00:00.123-04:00";
    const event = eventExchange.decode.run({
      ...eventExchange.encode.convert(original),
      startsAt: timestamp,
    });
    const member = memberExchange.decode.run({
      id: "mem-test",
      name: "Casey",
      email: "casey@example.test",
      role: "Member",
      status: "Active",
      joinedAt: timestamp,
    });
    expect(event.startsAt).toEqual(member.joinedAt);
    expect(eventExchange.encode.convert(event).startsAt).toBe(
      memberExchange.encode.convert(member).joinedAt,
    );
  });
  it("identifies invalid fields and rejects unexpected keys", () => {
    const payload = eventExchange.encode.convert(original);
    expect(() =>
      eventExchange.decode.run({
        ...payload,
        startsAt: "2026-02-30T00:00:00Z",
      }),
    ).toThrow(/startsAt/);
    expect(() => eventExchange.decode.run({ ...payload, title: "  " })).toThrow(
      /title/,
    );
    expect(() =>
      eventExchange.decode.run({ ...payload, location: "unmodeled" }),
    ).toThrow(/Unexpected field: location/);
  });
  it("loads persisted events as dates and rejects duplicate identities", () => {
    const input: unknown = JSON.parse(
      JSON.stringify(sampleEvents.map(eventExchange.encode.convert)),
    );
    expect(readEvents(input)).toEqual(sampleEvents);
    const payload = eventExchange.encode.convert(original);
    expect(() => readEvents([payload, payload])).toThrow(/unique/);
  });
});
