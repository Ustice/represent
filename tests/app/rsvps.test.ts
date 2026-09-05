import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleMembers } from "../../examples/member-desk/src/model.js";
import { eventExchange } from "../../examples/member-desk/src/events/model.js";
import {
  cancelRsvp,
  readRsvps,
  registerRsvp,
  rsvpExchange,
  type RsvpContext,
} from "../../examples/member-desk/src/rsvps/model.js";
import {
  changeRsvp,
  loadRsvps,
} from "../../examples/member-desk/src/rsvps/store.js";

const event = eventExchange.decode.run({
  id: "event",
  title: "Makers night",
  startsAt: "2026-09-12T18:00:00Z",
  endsAt: "2026-09-12T20:00:00Z",
  rsvpBy: "2026-09-11T18:00:00Z",
});
const request = { memberId: "mem_01", eventId: "event" };
const context: RsvpContext = {
  members: sampleMembers,
  events: [event],
  rsvps: [],
  now: new Date("2026-09-11T17:59:59.999Z"),
};
afterEach(() => vi.unstubAllGlobals());

describe("RSVP operations", () => {
  it("records the member/event relationship and supplied signup instant", () => {
    const result = registerRsvp.execute(request, context);
    expect(result).toEqual({ ...request, signedUpAt: context.now });
    expect(context.rsvps).toEqual([]);
    const json: unknown = JSON.parse(
      JSON.stringify([rsvpExchange.encode.convert(result)]),
    );
    expect(readRsvps(json)).toEqual([result]);
  });
  it("rejects missing references and duplicate pairs but allows other members/events", () => {
    expect(() =>
      registerRsvp.run({ ...request, memberId: "missing" }, context),
    ).toThrow(/not in the directory/);
    expect(() =>
      registerRsvp.run({ ...request, eventId: "missing" }, context),
    ).toThrow(/not in the schedule/);
    const existing = registerRsvp.execute(request, context);
    const occupied = {
      ...context,
      rsvps: [existing],
      events: [event, { ...event, id: "other" }],
    };
    expect(() => registerRsvp.execute(request, occupied)).toThrow(
      /already attending/,
    );
    expect(
      registerRsvp.execute({ ...request, memberId: "mem_02" }, occupied)
        .memberId,
    ).toBe("mem_02");
    expect(
      registerRsvp.execute({ ...request, eventId: "other" }, occupied).eventId,
    ).toBe("other");
  });
  it("closes exactly at the deadline, or at event start when no deadline exists", () => {
    for (const now of ["2026-09-11T18:00:00Z", "2026-09-11T18:00:00.001Z"])
      expect(() =>
        registerRsvp.execute(request, { ...context, now: new Date(now) }),
      ).toThrow(/Signups have closed/);
    const noDeadline = { ...event, rsvpBy: undefined };
    expect(
      registerRsvp.execute(request, {
        ...context,
        events: [noDeadline],
        now: new Date("2026-09-12T17:59:59.999Z"),
      }),
    ).toMatchObject(request);
    expect(() =>
      registerRsvp.execute(request, {
        ...context,
        events: [noDeadline],
        now: event.startsAt,
      }),
    ).toThrow(/Signups have closed/);
  });
  it("allows cancellation after closing and rejects cancellation of a missing signup", () => {
    const existing = registerRsvp.execute(request, context);
    expect(
      cancelRsvp.execute(request, {
        ...context,
        rsvps: [existing],
        now: event.endsAt,
      }),
    ).toEqual(existing);
    expect(() => cancelRsvp.execute(request, context)).toThrow(/not attending/);
  });
  it("rejects an invalid clock and malformed or duplicate stored records", () => {
    expect(() =>
      registerRsvp.execute(request, { ...context, now: new Date("invalid") }),
    ).toThrow(/Invalid/);
    const payload = rsvpExchange.encode.convert(
      registerRsvp.execute(request, context),
    );
    expect(() => readRsvps([payload, payload])).toThrow(/duplicate signups/);
    expect(() => readRsvps([{ ...payload, signedUpAt: null }])).toThrow(
      /signedUpAt/,
    );
  });
});

describe("RSVP persistence seam", () => {
  it("persists signup and cancellation, preserving unrelated attendance", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    changeRsvp("register", request, context);
    changeRsvp("register", { ...request, memberId: "mem_02" }, context);
    expect(loadRsvps()).toHaveLength(2);
    const saved = [...data.values()];
    expect(() => changeRsvp("register", request, context)).toThrow(
      /already attending/,
    );
    expect([...data.values()]).toEqual(saved);
    changeRsvp("cancel", request, { ...context, now: event.endsAt });
    expect(loadRsvps()).toEqual([
      { memberId: "mem_02", eventId: "event", signedUpAt: context.now },
    ]);
  });
  it("leaves stored state untouched if validation or the storage write fails", () => {
    let saved = "[]";
    vi.stubGlobal("localStorage", {
      getItem: () => saved,
      setItem: () => {
        throw new Error("Storage full");
      },
    });
    expect(() => changeRsvp("register", request, context)).toThrow(
      "Storage full",
    );
    expect(loadRsvps()).toEqual([]);
    saved = "broken JSON";
    expect(() => changeRsvp("register", request, context)).toThrow();
    expect(saved).toBe("broken JSON");
  });
});
