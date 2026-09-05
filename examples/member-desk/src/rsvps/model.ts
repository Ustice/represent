import { operation, recordCodec, reference } from "@represent/core";
import { z } from "zod";
import { dateTime, field, parser } from "../fields.js";
import { member, type Member } from "../model.js";
import { eventExchange, type CommunityEvent } from "../events/model.js";

const identifiers = { memberId: z.string().min(1), eventId: z.string().min(1) };
export const rsvpExchange = recordCodec({
  name: "RSVP exchange",
  from: "RSVP",
  to: "RSVP API",
  fields: {
    memberId: field("Member reference", identifiers.memberId),
    eventId: field("Event reference", identifiers.eventId),
    signedUpAt: dateTime,
  },
});
export type Rsvp = ReturnType<typeof rsvpExchange.decode.run>;
export const rsvpMember = reference({
  name: "RSVP member",
  from: rsvpExchange.encode.from,
  field: "memberId",
  to: member,
  key: "id",
});
export const rsvpEvent = reference({
  name: "RSVP event",
  from: rsvpExchange.encode.from,
  field: "eventId",
  to: eventExchange.encode.from,
  key: "id",
});
const request = field("RSVP request", z.object(identifiers).strict());
export type RsvpRequest = ReturnType<typeof request.parse>;
export interface RsvpContext {
  members: readonly Member[];
  events: readonly CommunityEvent[];
  rsvps: readonly Rsvp[];
  now: Date;
}
const sameSignup = (left: RsvpRequest, right: RsvpRequest) =>
  left.memberId === right.memberId && left.eventId === right.eventId;

export function signupClosesAt(event: CommunityEvent) {
  return event.rsvpBy ?? event.startsAt;
}

export const registerRsvp = operation({
  name: "Register RSVP",
  input: request,
  output: rsvpExchange.encode.from,
  reads: [member, eventExchange.encode.from, rsvpExchange.encode.from],
  references: [rsvpMember, rsvpEvent],
  perform(value, context: RsvpContext) {
    if (!rsvpMember.resolve(value, context.members))
      throw new Error("This member is not in the directory.");
    const event = rsvpEvent.resolve(value, context.events);
    if (!event) throw new Error("This event is not in the schedule.");
    if (context.rsvps.some((rsvp) => sameSignup(rsvp, value)))
      throw new Error("This member is already attending.");
    const now = dateTime.encode.from.parse(context.now);
    if (now >= signupClosesAt(event))
      throw new Error("Signups have closed for this event.");
    return { ...value, signedUpAt: now };
  },
});
export const cancelRsvp = operation({
  name: "Cancel RSVP",
  input: request,
  output: rsvpExchange.encode.from,
  reads: [rsvpExchange.encode.from],
  perform(value, context: RsvpContext) {
    const existing = context.rsvps.find((rsvp) => sameSignup(rsvp, value));
    if (!existing) throw new Error("This member is not attending this event.");
    return existing;
  },
});

export function readRsvps(input: unknown) {
  const rsvps = parser(z.array(z.unknown()))(input).map((value) =>
    rsvpExchange.decode.run(value),
  );
  const identities = rsvps.map(({ memberId, eventId }) =>
    JSON.stringify([memberId, eventId]),
  );
  if (new Set(identities).size !== identities.length)
    throw new Error("Saved RSVPs contain duplicate signups.");
  return rsvps;
}
