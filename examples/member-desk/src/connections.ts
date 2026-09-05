import { graph } from "@represent/core";
import { memberExchange, toPublic, toRoster } from "./model.js";
import { eventExchange } from "./events/model.js";
import { rsvpExchange, registerRsvp, cancelRsvp } from "./rsvps/model.js";
import { prepareAttendeeRoster } from "./rsvps/export.js";
import { escapeHtml, json } from "./ui.js";

const exchanges = [memberExchange, eventExchange, rsvpExchange];
export const workspaceGraph = graph(
  [
    ...exchanges.flatMap(({ encode, decode }) => [encode, decode]),
    toPublic,
    toRoster,
  ],
  { operations: [registerRsvp, cancelRsvp, prepareAttendeeRoster] },
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

export function connectionsPanel() {
  const uses = sharedFieldUses();
  const shared = [...new Set(uses.map(({ conversion }) => conversion))];
  return `<div class="panel-heading"><div><span class="eyebrow">REPRESENT IN FIELDWORK</span><h2>Follow the shared pieces.</h2></div><span class="pill">${exchanges.length} record codecs</span></div>
    <p class="muted panel-intro">These field connections come from the codecs that run the app, including the optional deadline's wrapped date codec.</p>
    ${shared
      .map(
        (conversion) =>
          `<div class="shared-codec"><strong>${escapeHtml(conversion)}</strong><ul>${uses
            .filter((use) => use.conversion === conversion)
            .map(({ path }) => `<li>${escapeHtml(path)}</li>`)
            .join("")}</ul></div>`,
      )
      .join("")}
    <h3>What feeds each operation?</h3>
    <div class="edge-list">${workspaceGraph.operations.map((op) => `<div class="edge"><span aria-hidden="true">↳</span><div><strong>${escapeHtml(op.name)}</strong><p>${escapeHtml(op.input)} → ${escapeHtml(op.output)}</p><p>Reads: ${op.reads.map(escapeHtml).join(" · ")}</p></div></div>`).join("")}</div>
    <h3>How the records connect</h3>
    <div class="edge-list">${workspaceGraph.references.map((ref) => `<div class="edge"><span aria-hidden="true">↗</span><div><strong>${escapeHtml(ref.name)}</strong><p>${escapeHtml(ref.from)}.${escapeHtml(ref.field)} → ${escapeHtml(ref.to)}.${escapeHtml(ref.key)}</p></div></div>`).join("")}</div>
    <p class="graph-caption">The roster reads current members, events, and RSVPs. A saved name, email, or event-time change appears in the next export. These are declared dependencies; Represent does not infer reads from function bodies. The references shown here also perform the app's lookups.</p>
    <details class="data-details"><summary>View workspace graph <span>JSON ↗</span></summary><pre>${json(workspaceGraph)}</pre></details>`;
}
