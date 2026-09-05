import { operation } from "@represent/core";
import { z } from "zod";
import { dateTime, field } from "../fields.js";
import { member, type Member } from "../model.js";
import { eventExchange, type CommunityEvent } from "../events/model.js";
import { csvTable } from "../csv.js";
import { rsvpExchange, rsvpEvent, rsvpMember, type Rsvp } from "./model.js";

const rowSchema = z.object({
  "Event ID": z.string(),
  Event: z.string(),
  "Starts (UTC)": z.iso.datetime(),
  "Ends (UTC)": z.iso.datetime(),
  "Member ID": z.string(),
  "Full name": z.string(),
  Email: z.email(),
  Role: z.enum(["Member", "Organizer"]),
  "Signed up (UTC)": z.iso.datetime(),
});
export const attendeeColumns = rowSchema.keyof().options;

export interface AttendeeContext {
  members: readonly Member[];
  events: readonly CommunityEvent[];
  rsvps: readonly Rsvp[];
}

export const prepareAttendeeRoster = operation({
  name: "Prepare attendee roster",
  input: field(
    "Attendee roster request",
    z.object({ eventId: z.string().min(1) }).strict(),
  ),
  output: field("Attendee roster", z.array(rowSchema)),
  reads: [eventExchange.encode.from, rsvpExchange.encode.from, member],
  references: [rsvpEvent, rsvpMember],
  perform(request, context: AttendeeContext) {
    const event = rsvpEvent.resolve(request, context.events);
    if (!event) throw new Error("This event is not in the schedule.");
    const savedEvent = eventExchange.encode.convert(event);
    const seen = new Set<string>();
    return context.rsvps
      .filter(({ eventId }) => eventId === event.id)
      .map((value) => {
        const rsvp = rsvpExchange.encode.from.parse(value);
        if (seen.has(rsvp.memberId))
          throw new Error("This event has duplicate signups.");
        seen.add(rsvp.memberId);
        const attendee = rsvpMember.resolve(rsvp, context.members);
        if (!attendee)
          throw new Error(
            `Member ${rsvp.memberId} is missing from the directory. Repair or cancel this RSVP before exporting.`,
          );
        const savedMember = member.parse(attendee);
        return {
          "Event ID": savedEvent.id,
          Event: savedEvent.title,
          "Starts (UTC)": savedEvent.startsAt,
          "Ends (UTC)": savedEvent.endsAt,
          "Member ID": savedMember.id,
          "Full name": savedMember.name,
          Email: savedMember.email,
          Role: savedMember.role,
          "Signed up (UTC)": dateTime.encode.convert(rsvp.signedUpAt),
        };
      });
  },
});

export function exportAttendees(eventId: string, context: AttendeeContext) {
  const rows = prepareAttendeeRoster.execute({ eventId }, context);
  return {
    columns: attendeeColumns,
    rows,
    csv: csvTable(attendeeColumns, rows),
  };
}
