import { operation, runBatch } from "@represent/core";
import { z } from "zod";
import { field } from "../fields.js";
import { registerRsvp, type RsvpContext } from "./model.js";

export const registerRsvpByEmail = operation({
  name: "Register RSVP by email",
  input: field(
    "RSVP email request",
    z
      .object({
        email: z.string().trim().email(),
        eventId: z.string().min(1),
      })
      .strict(),
  ),
  output: registerRsvp.output,
  reads: registerRsvp.reads,
  references: registerRsvp.references,
  perform(request, context: RsvpContext) {
    const matches = context.members.filter(
      ({ email }) => email.toLowerCase() === request.email.toLowerCase(),
    );
    const [member] = matches;
    if (!member) throw new Error("No member has this email address.");
    if (matches.length > 1)
      throw new Error(
        "More than one member has this email address. Use individual signup instead.",
      );
    return registerRsvp.execute(
      { memberId: member.id, eventId: request.eventId },
      context,
    );
  },
});

export function previewRsvpImport(
  text: string,
  eventId: string,
  context: RsvpContext,
) {
  const entries = text
    .split(/\r\n|\n|\r/u)
    .map((email, index) => ({ email: email.trim(), line: index + 1 }))
    .filter(({ email }) => email !== "");
  const result = runBatch(
    registerRsvpByEmail,
    entries.map(({ email }) => ({ email, eventId })),
    {
      context,
      advance: (current, rsvp) => ({
        ...current,
        rsvps: [...current.rsvps, rsvp],
      }),
    },
  );
  return { text, eventId, entries, ...result };
}

export type RsvpImportPreview = ReturnType<typeof previewRsvpImport>;

export function acceptedRows(preview: RsvpImportPreview) {
  return preview.rows.flatMap((row) =>
    row.status === "accepted" ? [row.value] : [],
  );
}

export function importSelection(preview: RsvpImportPreview) {
  return JSON.stringify(
    preview.rows.map((row) =>
      row.status === "accepted"
        ? [row.index, row.value.memberId, row.value.eventId]
        : [row.index, "rejected"],
    ),
  );
}
