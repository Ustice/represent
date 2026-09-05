import { asyncOperation, record } from "@represent/core";
import { eventExchange, eventId, type CommunityEvent } from "./model.js";

export interface EventStore {
  readonly load: () => Promise<readonly CommunityEvent[]>;
}
export class EventNotFound extends Error {
  constructor(readonly id: string) {
    super("Event not found");
    this.name = "EventNotFound";
  }
}
export const lookupEvent = asyncOperation({
  name: "Look up event",
  input: record("Event lookup", { id: eventId }),
  output: eventExchange.encode.to,
  reads: [eventExchange.encode.from],
  calls: [eventExchange.encode],
  async perform({ id }, store: EventStore) {
    const event = (await store.load()).find((event) => event.id === id);
    if (!event) throw new EventNotFound(id);
    return eventExchange.encode.convert(event);
  },
});
