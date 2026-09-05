import { describe, expect, it } from "vitest";
import {
  sharedFieldUses,
  workspaceGraph,
} from "../../examples/member-desk/src/connections.js";
describe("Fieldwork connections", () => {
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
