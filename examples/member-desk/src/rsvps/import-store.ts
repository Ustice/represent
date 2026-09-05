import type { RsvpContext } from "./model.js";
import {
  acceptedRows,
  importSelection,
  previewRsvpImport,
  type RsvpImportPreview,
} from "./import.js";
import { loadRsvps, saveRsvps } from "./store.js";

export function applyRsvpImport(
  reviewed: RsvpImportPreview,
  context: Omit<RsvpContext, "rsvps">,
) {
  const current = previewRsvpImport(reviewed.text, reviewed.eventId, {
    ...context,
    rsvps: loadRsvps(),
  });
  if (importSelection(current) !== importSelection(reviewed))
    return { status: "changed", preview: current } as const;
  const count = acceptedRows(current).length;
  if (count) saveRsvps(current.context.rsvps);
  return { status: "imported", count, preview: current } as const;
}
