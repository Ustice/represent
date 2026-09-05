import {
  compareAcceptance,
  compareSchemas,
  conversion,
  dependents,
  graph,
  optional,
  record,
  text,
  tracePath,
  type AcceptanceSample,
  type Graph,
} from "@represent/core";
import { toJsonSchema } from "@represent/json-schema";
import { Ajv2020 } from "ajv/dist/2020.js";
import { registerRsvp, rsvpIdentifiers } from "./rsvps/model.js";
import { workspaceGraph } from "./workspace-graph.js";

export interface NoteProposal {
  field: string;
  mode: "optional" | "required";
  nonempty: boolean;
  defaultValue: string;
}
export const defaultNoteProposal: NoteProposal = {
  field: "note",
  mode: "required",
  nonempty: true,
  defaultValue: "No note supplied",
};
export function exampleRequests(field: string): AcceptanceSample[] {
  const existing = { memberId: "member-1", eventId: "event-1" };
  return [
    { label: "Existing request", value: existing },
    {
      label: "Request with a note",
      value: { ...existing, [field]: "Arriving after lunch" },
    },
    {
      label: "Request with an empty note",
      value: { ...existing, [field]: "" },
    },
  ];
}
export function parseProposalSamples(source: string): AcceptanceSample[] {
  const parsed: unknown = JSON.parse(source);
  if (!Array.isArray(parsed))
    throw new Error("Samples must be a JSON array of { label, value } objects");
  return parsed.map((entry: unknown, index) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("label" in entry) ||
      typeof entry.label !== "string" ||
      !Object.hasOwn(entry, "value") ||
      !("value" in entry)
    )
      throw new Error(`Sample ${index + 1} needs a string label and a value`);
    return { label: entry.label, value: entry.value };
  });
}
export function attendanceNoteProposal(
  settings: NoteProposal,
  inputs: readonly AcceptanceSample[],
) {
  if (
    !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(settings.field) ||
    Object.hasOwn(rsvpIdentifiers, settings.field)
  )
    throw new Error(
      "Choose a new field name beginning with a letter; memberId and eventId already exist",
    );
  const note = text("Attendance note", { nonempty: settings.nonempty });
  const request = record("RSVP request", {
    ...rsvpIdentifiers,
    [settings.field]: settings.mode === "optional" ? optional(note) : note,
  });
  const declarations = graph([], { representations: [request] });
  const names = new Set(declarations.nodes.map((node) => node.name));
  const before = structuredClone(workspaceGraph);
  const after = structuredClone({
    ...before,
    nodes: [
      ...before.nodes.filter((node) => !names.has(node.name)),
      ...declarations.nodes,
    ],
  });
  const schema = toJsonSchema(request);
  const currentSchema = toJsonSchema(registerRsvp.input);
  const ajv = new Ajv2020({ strict: true, ownProperties: true });
  const validateBefore = ajv.compile(currentSchema);
  const validateAfter = ajv.compile(schema);
  const copy = (value: unknown): unknown => structuredClone(value);
  const acceptance = compareAcceptance({
    before: registerRsvp.input,
    after: request,
    samples: inputs,
    copy,
  });
  const samples = acceptance.samples.map((sample) => ({
    label: sample.label,
    value: sample.input,
    before: validateBefore(sample.input),
    after: validateAfter(sample.input),
  }));
  const migration = conversion({
    name: "Supply an attendance note",
    from: registerRsvp.input,
    to: request,
    map: (value) => ({ ...value, [settings.field]: settings.defaultValue }),
  });
  const migrations = inputs.map((sample) => ({
    label: sample.label,
    trace: tracePath([migration], copy(sample.value), { snapshot: copy }),
  }));
  return {
    request,
    before,
    after,
    schema,
    currentSchema,
    samples,
    acceptance,
    migrations,
    comparison: compareSchemas(before, after),
  };
}
export function schemaDependents(model: Graph, name: string) {
  if (!model.nodes.some((node) => node.name === name)) return [];
  return dependents(model, { kind: "representation", name }).dependents;
}
