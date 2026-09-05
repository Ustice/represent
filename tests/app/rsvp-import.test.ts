import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleMembers } from "../../examples/member-desk/src/model.js";
import { sampleEvents } from "../../examples/member-desk/src/events/model.js";
import {
  acceptedRows,
  previewRsvpImport,
} from "../../examples/member-desk/src/rsvps/import.js";
import { applyRsvpImport } from "../../examples/member-desk/src/rsvps/import-store.js";
import {
  loadRsvps,
  saveRsvps,
} from "../../examples/member-desk/src/rsvps/store.js";
import { registerRsvp } from "../../examples/member-desk/src/rsvps/model.js";

const context = {
  members: sampleMembers,
  events: sampleEvents,
  rsvps: [],
  now: new Date("2026-09-05T12:00:00Z"),
};
afterEach(() => vi.unstubAllGlobals());
function storage() {
  let saved = "[]";
  let writes = 0;
  vi.stubGlobal("localStorage", {
    getItem: () => saved,
    setItem: (_key: string, value: string) => {
      saved = value;
      writes++;
    },
  });
  return {
    writes: () => writes,
    corrupt: () => {
      saved = "broken";
    },
  };
}

describe("bulk RSVP import", () => {
  it("previews mixed rows with physical line numbers and detects within-batch duplicates", () => {
    const result = previewRsvpImport(
      "  MAYA@example.test \r\n\r\ninvalid\nmissing@example.test\nmaya@example.test\nleo@example.test\n",
      "evt_01",
      context,
    );
    expect(result.entries.map(({ line }) => line)).toEqual([1, 3, 4, 5, 6]);
    expect(result.rows.map(({ status }) => status)).toEqual([
      "accepted",
      "rejected",
      "rejected",
      "rejected",
      "accepted",
    ]);
    expect(result.rows).toMatchObject([
      { value: { memberId: "mem_01", eventId: "evt_01" } },
      { error: { stage: "input" } },
      {
        error: {
          stage: "perform",
          cause: { message: "No member has this email address." },
        },
      },
      {
        error: {
          cause: { cause: { message: "This member is already attending." } },
        },
      },
      { value: { memberId: "mem_02", eventId: "evt_01" } },
    ]);
    expect(context.rsvps).toEqual([]);
  });

  it("rejects ambiguous emails and reuses existing signup deadlines and duplicate rules", () => {
    const first = sampleMembers[0];
    if (!first) throw new Error("Missing fixture");
    const ambiguous = previewRsvpImport(first.email, "evt_01", {
      ...context,
      members: [...context.members, { ...first, id: "other" }],
    });
    expect(ambiguous.rows).toMatchObject([
      {
        status: "rejected",
        error: {
          cause: {
            message:
              "More than one member has this email address. Use individual signup instead.",
          },
        },
      },
    ]);
    const existing = registerRsvp.execute(
      { memberId: first.id, eventId: "evt_01" },
      context,
    );
    expect(
      acceptedRows(
        previewRsvpImport(first.email, "evt_01", {
          ...context,
          rsvps: [existing],
        }),
      ),
    ).toEqual([]);
    expect(
      acceptedRows(
        previewRsvpImport(first.email, "evt_01", {
          ...context,
          now: new Date("2026-09-11T18:00:00Z"),
        }),
      ),
    ).toEqual([]);
  });

  it("keeps preview read-only and imports only ready rows in one write, preserving other events", () => {
    const store = storage();
    const unrelated = registerRsvp.execute(
      { memberId: "mem_03", eventId: "evt_02" },
      context,
    );
    saveRsvps([unrelated]);
    const preview = previewRsvpImport(
      "maya@example.test\ninvalid\nleo@example.test",
      "evt_01",
      { ...context, rsvps: loadRsvps() },
    );
    expect(store.writes()).toBe(1);
    const result = applyRsvpImport(preview, {
      ...context,
      now: new Date("2026-09-05T13:00:00Z"),
    });
    expect(result).toMatchObject({ status: "imported", count: 2 });
    expect(store.writes()).toBe(2);
    expect(loadRsvps()).toEqual([unrelated, ...acceptedRows(result.preview)]);
    expect(loadRsvps()[1]?.signedUpAt.toISOString()).toBe(
      "2026-09-05T13:00:00.000Z",
    );
    expect(applyRsvpImport(preview, context).status).toBe("changed");
    expect(store.writes()).toBe(2);
  });

  it("refreshes without writing if a previewed row becomes invalid or a rejected row becomes valid", () => {
    const store = storage();
    const preview = previewRsvpImport(
      "maya@example.test\nnew@example.test",
      "evt_01",
      context,
    );
    const closed = applyRsvpImport(preview, {
      ...context,
      now: new Date("2026-09-11T18:00:00Z"),
    });
    expect(closed.status).toBe("changed");
    expect(acceptedRows(closed.preview)).toEqual([]);
    const first = sampleMembers[0];
    if (!first) throw new Error("Missing fixture");
    const added = applyRsvpImport(preview, {
      ...context,
      members: [
        ...context.members,
        { ...first, id: "new", email: "new@example.test" },
      ],
    });
    expect(added.status).toBe("changed");
    expect(acceptedRows(added.preview)).toHaveLength(2);
    expect(store.writes()).toBe(0);
  });

  it("requires review when an email now resolves to a different member", () => {
    const store = storage();
    const preview = previewRsvpImport("maya@example.test", "evt_01", context);
    const result = applyRsvpImport(preview, {
      ...context,
      members: context.members.map((value) => ({
        ...value,
        id: `new-${value.id}`,
      })),
    });
    expect(result.status).toBe("changed");
    expect(store.writes()).toBe(0);
  });

  it("does not write empty/all-rejected imports and preserves state on storage failure", () => {
    const store = storage();
    for (const text of ["\n \r\n", "invalid\nmissing@example.test"])
      expect(
        applyRsvpImport(previewRsvpImport(text, "evt_01", context), context),
      ).toMatchObject({ status: "imported", count: 0 });
    expect(store.writes()).toBe(0);
    const preview = previewRsvpImport("maya@example.test", "evt_01", context);
    store.corrupt();
    expect(() => applyRsvpImport(preview, context)).toThrow();
    vi.stubGlobal("localStorage", {
      getItem: () => "[]",
      setItem: () => {
        throw new Error("Storage full");
      },
    });
    expect(() => applyRsvpImport(preview, context)).toThrow("Storage full");
    expect(loadRsvps()).toEqual([]);
  });
});
