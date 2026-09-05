import {
  compareSchemas,
  dependents,
  graph,
  optional,
  record,
  text,
  type Graph,
} from "@represent/core";
import { toJsonSchema } from "@represent/json-schema";
import { Ajv2020 } from "ajv/dist/2020.js";
import { registerRsvp, rsvpIdentifiers } from "./rsvps/model.js";
import { workspaceGraph } from "./workspace-graph.js";

export function attendanceNoteProposal(mode: "optional" | "required") {
  const note = text("Attendance note", { nonempty: true });
  const request = record("RSVP request", {
    ...rsvpIdentifiers,
    note: mode === "optional" ? optional(note) : note,
  });
  const declarations = graph([], { representations: [request] });
  const names = new Set(declarations.nodes.map((node) => node.name));
  const before = structuredClone(workspaceGraph);
  const after = {
    ...structuredClone(before),
    nodes: [
      ...before.nodes.filter((node) => !names.has(node.name)),
      ...declarations.nodes,
    ],
  };
  const schema = toJsonSchema(request);
  const ajv = new Ajv2020({ strict: true, ownProperties: true });
  const validateBefore = ajv.compile(toJsonSchema(registerRsvp.input));
  const validateAfter = ajv.compile(schema);
  const samples = [
    {
      label: "Existing request",
      value: { memberId: "member-1", eventId: "event-1" },
    },
    {
      label: "Request with a note",
      value: {
        memberId: "member-1",
        eventId: "event-1",
        note: "Arriving after lunch",
      },
    },
    {
      label: "Request with an empty note",
      value: { memberId: "member-1", eventId: "event-1", note: "" },
    },
  ].map((sample) => ({
    ...sample,
    before: validateBefore(sample.value),
    after: validateAfter(sample.value),
  }));
  return {
    request,
    before,
    after,
    schema,
    samples,
    comparison: compareSchemas(before, after),
  };
}
export function schemaDependents(model: Graph, name: string) {
  if (!model.nodes.some((node) => node.name === name)) return [];
  return dependents(model, { kind: "representation", name }).dependents;
}
