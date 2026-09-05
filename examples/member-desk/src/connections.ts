import { changePanel, bindChanges } from "./change-panel.js";
import { contractPanel, bindContract } from "./contract-panel.js";
import { createExplorer } from "@represent/explorer";
import "@represent/explorer/style.css";
import { workspaceGraph } from "./workspace-graph.js";

const explorer = createExplorer(workspaceGraph, {
  initial: { kind: "representation", name: "Member" },
  shortcuts: [
    { item: { kind: "representation", name: "Member" }, label: "Member" },
    {
      item: { kind: "conversion", name: "Date and ISO timestamp: encode" },
      label: "Shared date encoder",
    },
    {
      item: { kind: "operation", name: "Prepare attendee roster" },
      label: "Attendee export",
    },
    {
      item: { kind: "operation", name: "Register RSVP by email" },
      label: "Email signup",
    },
  ],
});
let view: "model" | "contract" | "changes" = "model";
export function connectionsPanel() {
  return `<div class="workbench-tabs" role="group" aria-label="Development views"><button type="button" data-workbench="model" aria-pressed="${view === "model"}">Model explorer</button><button type="button" data-workbench="contract" aria-pressed="${view === "contract"}">Contract lab</button><button type="button" data-workbench="changes" aria-pressed="${view === "changes"}">Change preview</button></div>${view === "model" ? explorer.render() : view === "contract" ? contractPanel() : changePanel()}`;
}
export function bindConnections(render: () => void) {
  explorer.bind(document, render);
  bindContract(render);
  bindChanges(render);
  document
    .querySelectorAll<HTMLButtonElement>("[data-workbench]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        if (
          button.dataset.workbench === "model" ||
          button.dataset.workbench === "contract" ||
          button.dataset.workbench === "changes"
        )
          view = button.dataset.workbench;
        render();
        document
          .querySelector<HTMLButtonElement>(`[data-workbench="${view}"]`)
          ?.focus();
      }),
    );
}
