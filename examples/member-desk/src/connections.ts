import { graph } from "@represent/core";
import { memberExchange, toPublic, toRoster } from "./model.js";
import { eventExchange } from "./events/model.js";
import { rsvpExchange, registerRsvp, cancelRsvp } from "./rsvps/model.js";
import { escapeHtml, json } from "./ui.js";

const exchanges = [memberExchange, eventExchange, rsvpExchange];
export const workspaceGraph = graph([
  ...exchanges.flatMap(({ encode, decode }) => [encode, decode]),
  toPublic,
  toRoster,
]);

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
    <div class="edge-list">${[registerRsvp, cancelRsvp].map((op) => `<div class="edge"><span aria-hidden="true">↳</span><div><strong>${escapeHtml(op.name)}</strong><p>${escapeHtml(op.input.name)} → ${escapeHtml(op.output.name)}</p></div></div>`).join("")}</div>
    <p class="graph-caption">Operations validate requests and results against an explicit context. Fieldwork resolves member/event references and enforces signup rules. Those domain relationships are not inferred from field names.</p>
    <details class="data-details"><summary>View conversion graph <span>JSON ↗</span></summary><pre>${json(workspaceGraph)}</pre></details>`;
}
