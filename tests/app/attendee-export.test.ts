import { describe, expect, it } from "vitest";
import { sampleMembers } from "../../examples/member-desk/src/model.js";
import { sampleEvents } from "../../examples/member-desk/src/events/model.js";
import { exportAttendees } from "../../examples/member-desk/src/rsvps/export.js";

const signedUpAt = new Date("2026-09-05T12:00:00.000Z");
const context = {
  members: sampleMembers,
  events: sampleEvents,
  rsvps: [
    { memberId: "mem_02", eventId: "evt_01", signedUpAt },
    { memberId: "mem_01", eventId: "evt_01", signedUpAt },
    { memberId: "mem_03", eventId: "evt_02", signedUpAt },
  ],
};

describe("event attendee export", () => {
  it("joins by member ID, limits rows to the selected event, and preserves signup order", () => {
    const result = exportAttendees("evt_01", context);
    expect(result.rows).toEqual([
      {
        "Event ID": "evt_01",
        Event: "Saturday makers circle",
        "Starts (UTC)": "2026-09-12T14:00:00.000Z",
        "Ends (UTC)": "2026-09-12T16:00:00.000Z",
        "Member ID": "mem_02",
        "Full name": "Leo Martins",
        Email: "leo@example.test",
        Role: "Member",
        "Signed up (UTC)": signedUpAt.toISOString(),
      },
      {
        "Event ID": "evt_01",
        Event: "Saturday makers circle",
        "Starts (UTC)": "2026-09-12T14:00:00.000Z",
        "Ends (UTC)": "2026-09-12T16:00:00.000Z",
        "Member ID": "mem_01",
        "Full name": "Maya Chen",
        Email: "maya@example.test",
        Role: "Organizer",
        "Signed up (UTC)": signedUpAt.toISOString(),
      },
    ]);
    expect(result.csv).toContain(
      '"mem_02","Leo Martins","leo@example.test","Member","2026-09-05T12:00:00.000Z"\r\n',
    );
  });

  it("reflects saved member and event edits without rewriting an RSVP", () => {
    const before = exportAttendees("evt_01", context);
    const after = exportAttendees("evt_01", {
      ...context,
      members: context.members.map((value) =>
        value.id === "mem_02"
          ? { ...value, name: "Leo Rivera", email: "leo.rivera@example.test" }
          : value,
      ),
      events: context.events.map((value) =>
        value.id === "evt_01"
          ? {
              ...value,
              title: "Makers afternoon",
              startsAt: new Date("2026-09-12T15:00:00Z"),
            }
          : value,
      ),
    });
    expect(after.rows[0]).toEqual({
      ...before.rows[0],
      "Full name": "Leo Rivera",
      Email: "leo.rivera@example.test",
      Event: "Makers afternoon",
      "Starts (UTC)": "2026-09-12T15:00:00.000Z",
    });
    expect(before.rows[0]?.["Full name"]).toBe("Leo Martins");
    expect(context.rsvps[0]).toEqual({
      memberId: "mem_02",
      eventId: "evt_01",
      signedUpAt,
    });
  });

  it("removes cancelled attendees and exports headings for an empty event", () => {
    const result = exportAttendees("evt_01", {
      ...context,
      rsvps: context.rsvps.filter(({ eventId }) => eventId !== "evt_01"),
    });
    expect(result.rows).toEqual([]);
    expect(result.csv).toBe(
      '"Event ID","Event","Starts (UTC)","Ends (UTC)","Member ID","Full name","Email","Role","Signed up (UTC)"\r\n',
    );
  });

  it("rejects missing references and duplicates instead of silently dropping or multiplying attendees", () => {
    expect(() => exportAttendees("unknown", context)).toThrow(
      /Prepare attendee roster: perform: This event is not in the schedule/,
    );
    expect(() =>
      exportAttendees("evt_01", { ...context, members: [] }),
    ).toThrow(/Member mem_02 is missing/);
    expect(() =>
      exportAttendees("evt_01", {
        ...context,
        rsvps: [...context.rsvps, ...context.rsvps],
      }),
    ).toThrow(/duplicate signups/);
    expect(() =>
      exportAttendees("evt_01", {
        ...context,
        members: [...context.members, ...context.members],
      }),
    ).toThrow(/ambiguous Member.id/);
  });

  it("validates joined records, event timing, and signup dates before producing CSV", () => {
    expect(() =>
      exportAttendees("evt_01", {
        ...context,
        members: context.members.map((value) => ({
          ...value,
          email: "invalid",
        })),
      }),
    ).toThrow(/email/);
    expect(() =>
      exportAttendees("evt_01", {
        ...context,
        events: context.events.map((value) => ({
          ...value,
          endsAt: new Date("2020-01-01"),
        })),
      }),
    ).toThrow(/end/i);
    expect(() =>
      exportAttendees("evt_01", {
        ...context,
        rsvps: context.rsvps.map((value) => ({
          ...value,
          signedUpAt: new Date("invalid"),
        })),
      }),
    ).toThrow(/signedUpAt/);
  });

  it("applies the existing CSV quoting and formula policy to event and member text", () => {
    const result = exportAttendees("evt_01", {
      ...context,
      events: context.events.map((value) => ({ ...value, title: "=SUM(1,2)" })),
      members: context.members.map((value) => ({
        ...value,
        name: 'Lee "L", Jr.\nOrganizer',
      })),
    });
    expect(result.csv).toContain('"\'=SUM(1,2)"');
    expect(result.csv).toContain('"Lee ""L"", Jr.\nOrganizer"');
    expect(result.rows[0]?.Event).toBe("=SUM(1,2)");
  });
});
