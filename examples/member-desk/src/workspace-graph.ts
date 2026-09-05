import { graph } from "@represent/core";
import { memberExchange, toPublic, toRoster, profileFor } from "./model.js";
import { eventExchange } from "./events/model.js";
import { rsvpExchange, registerRsvp, cancelRsvp } from "./rsvps/model.js";
import { registerRsvpByEmail } from "./rsvps/import.js";
import { prepareAttendeeRoster } from "./rsvps/export.js";

export const exchanges = [memberExchange, eventExchange, rsvpExchange];
export const workspaceGraph = graph(
  [
    ...exchanges.flatMap(({ encode, decode }) => [encode, decode]),
    toPublic,
    toRoster,
    profileFor,
  ],
  {
    operations: [
      registerRsvp,
      cancelRsvp,
      prepareAttendeeRoster,
      registerRsvpByEmail,
    ],
  },
);

export function sharedFieldUses() {
  const uses: Array<{ path: string; conversion: string }> = [];
  function visit(conversion: string, path: string) {
    const children = workspaceGraph.dependencies.filter(
      ({ parent }) => parent === conversion,
    );
    if (!children.length) {
      uses.push({ path, conversion });
      return;
    }
    for (const child of children)
      visit(
        child.conversion,
        child.field === null ? path : `${path}.${child.field}`,
      );
  }
  for (const exchange of exchanges)
    visit(exchange.encode.name, exchange.encode.from.name);
  return uses;
}
