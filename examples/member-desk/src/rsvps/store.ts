import {
  cancelRsvp,
  readRsvps,
  registerRsvp,
  rsvpExchange,
  type RsvpContext,
  type Rsvp,
  type RsvpRequest,
} from "./model.js";

const storageKey = "represent.fieldwork.rsvps.v1";
export function loadRsvps() {
  const saved = localStorage.getItem(storageKey);
  const input: unknown = saved ? JSON.parse(saved) : [];
  return readRsvps(input);
}

export function changeRsvp(
  action: "register" | "cancel",
  request: RsvpRequest,
  context: Omit<RsvpContext, "rsvps">,
) {
  const rsvps = loadRsvps();
  const operation = action === "register" ? registerRsvp : cancelRsvp;
  const result = operation.execute(request, { ...context, rsvps });
  const next =
    action === "register"
      ? [...rsvps, result]
      : rsvps.filter(
          (value) =>
            value.memberId !== result.memberId ||
            value.eventId !== result.eventId,
        );
  saveRsvps(next);
  return result;
}

export function saveRsvps(rsvps: readonly Rsvp[]) {
  localStorage.setItem(
    storageKey,
    JSON.stringify(rsvps.map(rsvpExchange.encode.convert)),
  );
}
