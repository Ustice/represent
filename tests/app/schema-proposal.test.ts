import { describe, it, expect } from "vitest";
import {
  attendanceNoteProposal,
  schemaDependents,
} from "../../examples/member-desk/src/schema-proposal.js";
import { workspaceGraph } from "../../examples/member-desk/src/workspace-graph.js";
import { registerRsvp } from "../../examples/member-desk/src/rsvps/model.js";

describe("attendance-note contract experiment", () => {
  it("demonstrates required versus optional additions with real parsers and validators", () => {
    for (const mode of ["required", "optional"] as const) {
      const proposal = attendanceNoteProposal(mode);
      expect(
        proposal.samples.map((sample) => [sample.before, sample.after]),
      ).toEqual([
        [true, mode === "optional"],
        [false, true],
        [false, false],
      ]);
      for (const sample of proposal.samples) {
        if (sample.after)
          expect(proposal.request.parse(sample.value)).toEqual(sample.value);
        else expect(() => proposal.request.parse(sample.value)).toThrow();
      }
    }
  });
  it("reaches signup, cancellation, and the email caller without changing the live model", () => {
    const snapshot = structuredClone(workspaceGraph);
    const proposal = attendanceNoteProposal("required");
    expect(schemaDependents(proposal.before, "Attendance note")).toEqual([]);
    const reached = schemaDependents(proposal.after, "Attendance note");
    expect(new Set(reached.map(({ item }) => item.name))).toEqual(
      new Set([
        "RSVP request",
        "Register RSVP",
        "Cancel RSVP",
        "Register RSVP by email",
      ]),
    );
    const caller = reached.find(
      ({ item }) => item.name === "Register RSVP by email",
    );
    expect(caller?.path.map((link) => link.reason.kind)).toEqual([
      "record-field",
      "input",
      "call",
    ]);
    expect(workspaceGraph).toEqual(snapshot);
    expect(registerRsvp.input.parse({ memberId: "m", eventId: "e" })).toEqual({
      memberId: "m",
      eventId: "e",
    });
    expect(() =>
      registerRsvp.input.parse({ memberId: "m", eventId: "e", note: "x" }),
    ).toThrow("Unexpected field");
  });
});
