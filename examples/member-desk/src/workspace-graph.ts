import { lookupEvent } from "./events/lookup.js";
import { graph } from "@represent/core";
import { memberExchange, toPublic, toRoster, profileFor } from "./model.js";
import { eventExchange } from "./events/model.js";
import { rsvpExchange, registerRsvp, cancelRsvp } from "./rsvps/model.js";
import { registerRsvpByEmail } from "./rsvps/import.js";
import { prepareAttendeeRoster } from "./rsvps/export.js";

const exchanges = [memberExchange, eventExchange, rsvpExchange];
export const workspaceGraph = graph(
  [
    ...exchanges.flatMap(({ encode, decode }) => [encode, decode]),
    toPublic,
    toRoster,
    profileFor,
  ],
  {
    operations: [
      lookupEvent,
      registerRsvp,
      cancelRsvp,
      prepareAttendeeRoster,
      registerRsvpByEmail,
    ],
  },
);
