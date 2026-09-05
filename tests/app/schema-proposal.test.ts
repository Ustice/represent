import { describe, it, expect } from "vitest";
import {
  attendanceNoteProposal,
  defaultNoteProposal,
  exampleRequests,
  parseProposalSamples,
  schemaDependents,
} from "../../examples/member-desk/src/schema-proposal.js";
import { workspaceGraph } from "../../examples/member-desk/src/workspace-graph.js";
import { registerRsvp } from "../../examples/member-desk/src/rsvps/model.js";

describe("attendance-note contract experiment", () => {
  it("demonstrates required versus optional additions with real parsers and validators", () => {
    for (const mode of ["required", "optional"] as const) {
      const proposal = attendanceNoteProposal(
        { ...defaultNoteProposal, mode },
        exampleRequests("note"),
      );
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
    const proposal = attendanceNoteProposal(
      defaultNoteProposal,
      exampleRequests("note"),
    );
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
  it("previews renamed fields, directional counterexamples, and validated migration output", () => {
    const settings = {
      ...defaultNoteProposal,
      field: "arrival",
      defaultValue: "Not specified",
    };
    const proposal = attendanceNoteProposal(
      settings,
      exampleRequests("arrival"),
    );
    expect(proposal.acceptance.beforeToAfter).toEqual({
      status: "counterexamples",
      tested: 1,
      witnesses: [0],
    });
    expect(proposal.acceptance.afterToBefore).toEqual({
      status: "counterexamples",
      tested: 1,
      witnesses: [1],
    });
    expect(proposal.migrations[0]?.trace).toMatchObject({
      status: "completed",
      output: {
        memberId: "member-1",
        eventId: "event-1",
        arrival: "Not specified",
      },
    });
    expect(proposal.migrations[1]?.trace).toMatchObject({
      status: "failed",
      steps: [{ status: "failed", error: { stage: "input" } }],
    });
    const invalidDefault = attendanceNoteProposal(
      { ...settings, defaultValue: "" },
      exampleRequests("arrival"),
    );
    expect(invalidDefault.migrations[0]?.trace).toMatchObject({
      status: "failed",
      steps: [{ status: "failed", error: { stage: "output" } }],
    });
    const emptyAllowed = attendanceNoteProposal(
      { ...settings, nonempty: false, defaultValue: "" },
      exampleRequests("arrival"),
    );
    expect(emptyAllowed.samples[2]?.after).toBe(true);
    expect(emptyAllowed.migrations[0]?.trace).toMatchObject({
      status: "completed",
      output: { arrival: "" },
    });
  });
  it("parses editable sample JSON and rejects invalid proposals without changing the live request", () => {
    const samples = parseProposalSamples(
      '[{"label":"Custom","value":{"memberId":"m","eventId":"e"}}]',
    );
    const proposal = attendanceNoteProposal(
      { ...defaultNoteProposal, mode: "optional" },
      samples,
    );
    expect(proposal.acceptance.beforeToAfter.status).toBe("no-counterexamples");
    for (const field of ["memberId", "eventId", "", "__proto__"])
      expect(() =>
        attendanceNoteProposal({ ...defaultNoteProposal, field }, samples),
      ).toThrow("Choose a new field name");
    for (const source of [
      "null",
      "{}",
      '[{"label":"Missing value"}]',
      '[{"label":3,"value":null}]',
    ])
      expect(() => parseProposalSamples(source)).toThrow();
    expect(parseProposalSamples('[{"label":"Null","value":null}]')).toEqual([
      { label: "Null", value: null },
    ]);
  });
});
