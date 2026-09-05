import { describe, expect, it } from "vitest";
import {
  sharedFieldUses,
  workspaceGraph,
} from "../../examples/member-desk/src/connections.js";
describe("Fieldwork connections", () => {
  it("exposes the roster's state and executable references alongside signup and cancellation", () => {
    expect(workspaceGraph.operations).toEqual([
      {
        name: "Register RSVP",
        input: "RSVP request",
        output: "RSVP",
        reads: ["Member", "Event", "RSVP"],
        references: ["RSVP member", "RSVP event"],
      },
      {
        name: "Cancel RSVP",
        input: "RSVP request",
        output: "RSVP",
        reads: ["RSVP"],
        references: [],
      },
      {
        name: "Prepare attendee roster",
        input: "Attendee roster request",
        output: "Attendee roster",
        reads: ["Event", "RSVP", "Member"],
        references: ["RSVP event", "RSVP member"],
      },
    ]);
    expect(workspaceGraph.references).toEqual([
      {
        name: "RSVP member",
        from: "RSVP",
        field: "memberId",
        to: "Member",
        key: "id",
      },
      {
        name: "RSVP event",
        from: "RSVP",
        field: "eventId",
        to: "Event",
        key: "id",
      },
    ]);
  });
  it("exposes Fieldwork's actual shared date uses, including the wrapped deadline", () => {
    expect(sharedFieldUses()).toEqual([
      { path: "Member.joinedAt", conversion: "Date and ISO timestamp: encode" },
      { path: "Event.startsAt", conversion: "Date and ISO timestamp: encode" },
      { path: "Event.endsAt", conversion: "Date and ISO timestamp: encode" },
      { path: "Event.rsvpBy", conversion: "Date and ISO timestamp: encode" },
      { path: "RSVP.signedUpAt", conversion: "Date and ISO timestamp: encode" },
    ]);
    expect(
      workspaceGraph.edges.filter(
        ({ name }) => name === "Date and ISO timestamp: encode",
      ),
    ).toHaveLength(1);
  });
});
