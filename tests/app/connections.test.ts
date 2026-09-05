import { describe, expect, it } from "vitest";
import { dependents } from "../../packages/represent/src/index.js";
import {
  memberExchange,
  profileFor,
} from "../../examples/member-desk/src/model.js";
import { workspaceGraph } from "../../examples/member-desk/src/workspace-graph.js";
describe("Fieldwork connections", () => {
  it("finds member consumers without inferring RSVP writes or cancellation dependencies", () => {
    const result = dependents(workspaceGraph, {
      kind: "representation",
      name: "Member",
    });
    const items = result.dependents.map(({ item }) => item);
    expect(items).toContainEqual({
      kind: "operation",
      name: "Prepare attendee roster",
    });
    expect(items).toContainEqual({ kind: "operation", name: "Register RSVP" });
    expect(items).toContainEqual({ kind: "conversion", name: profileFor.name });
    expect(items).not.toContainEqual({
      kind: "operation",
      name: "Cancel RSVP",
    });
    expect(items).not.toContainEqual({ kind: "representation", name: "RSVP" });
    expect(items).not.toContainEqual({
      kind: "representation",
      name: "Attendee roster",
    });
    const attendee = result.dependents.find(
      ({ item }) =>
        item.kind === "operation" && item.name === "Prepare attendee roster",
    );
    expect(attendee?.path).toEqual([
      {
        dependency: { kind: "representation", name: "Member" },
        dependent: { kind: "operation", name: "Prepare attendee roster" },
        reason: { kind: "read" },
      },
    ]);
  });
  it("traces the shared encoder to the actual public-profile route and every event field use", () => {
    const result = dependents(workspaceGraph, {
      kind: "conversion",
      name: "Date and ISO timestamp: encode",
    });
    const profile = result.dependents.find(
      ({ item }) => item.kind === "conversion" && item.name === profileFor.name,
    );
    expect(profile?.path.map(({ dependent }) => dependent.name)).toEqual([
      memberExchange.encode.name,
      profileFor.name,
    ]);
    const event = result.dependents.find(
      ({ item }) =>
        item.kind === "conversion" && item.name === "Event exchange: encode",
    );
    expect(profile?.path[0]?.reason).toEqual({
      kind: "field",
      field: "joinedAt",
    });
    expect(
      result.dependents
        .find(
          ({ item }) =>
            item.kind === "conversion" && item.name === "RSVP exchange: encode",
        )
        ?.via.map(({ reason }) => reason),
    ).toEqual([{ kind: "field", field: "signedUpAt" }]);
    expect(event?.via.map(({ reason }) => reason)).toEqual([
      { kind: "field", field: "endsAt" },
      { kind: "field", field: "startsAt" },
      { kind: "field", field: "rsvpBy" },
    ]);
    expect(
      result.dependents
        .filter(({ item }) => item.kind === "operation")
        .map(({ item }) => item.name),
    ).toEqual(["Prepare attendee roster", "Look up event"]);
    expect(
      result.dependents.some(
        ({ item }) =>
          item.kind === "conversion" &&
          item.name === "Date and ISO timestamp: decode",
      ),
    ).toBe(false);
  });
  it("exposes the roster's state and executable references alongside signup and cancellation", () => {
    expect(workspaceGraph.operations).toEqual([
      {
        name: "Look up event",
        input: "Event lookup",
        output: "Event API",
        reads: ["Event"],
        references: [],
        calls: [{ kind: "conversion", name: "Event exchange: encode" }],
      },
      {
        name: "Register RSVP",
        input: "RSVP request",
        output: "RSVP",
        reads: ["Member", "Event", "RSVP"],
        references: ["RSVP member", "RSVP event"],
        calls: [],
      },
      {
        name: "Cancel RSVP",
        input: "RSVP request",
        output: "RSVP",
        reads: ["RSVP"],
        references: [],
        calls: [],
      },
      {
        name: "Prepare attendee roster",
        input: "Attendee roster request",
        output: "Attendee roster",
        reads: ["Event", "RSVP", "Member"],
        references: ["RSVP event", "RSVP member"],
        calls: [
          { kind: "conversion", name: "Event exchange: encode" },
          { kind: "conversion", name: "Date and ISO timestamp: encode" },
        ],
      },
      {
        name: "Register RSVP by email",
        input: "RSVP email request",
        output: "RSVP",
        reads: ["Member"],
        references: [],
        calls: [{ kind: "operation", name: "Register RSVP" }],
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
});
