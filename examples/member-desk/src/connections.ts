import { serverPanel, bindServer } from "./server-panel.js";
import { playgroundPanel, bindPlayground } from "./playground-panel.js";
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
const views = {
  model: {
    label: "Model explorer",
    panel: () => explorer.render(),
    bind: (render: () => void) => explorer.bind(document, render),
  },
  contract: { label: "Contract lab", panel: contractPanel, bind: bindContract },
  changes: { label: "Change preview", panel: changePanel, bind: bindChanges },
  playground: {
    label: "Conversion playground",
    panel: playgroundPanel,
    bind: bindPlayground,
  },
  server: { label: "Server lab", panel: serverPanel, bind: bindServer },
};
let view: keyof typeof views = "model";
function isView(value: string | undefined): value is keyof typeof views {
  return value !== undefined && Object.hasOwn(views, value);
}
export function connectionsPanel() {
  const tabs = Object.entries(views)
    .map(
      ([key, value]) =>
        `<button type="button" data-workbench="${key}" aria-pressed="${view === key}">${value.label}</button>`,
    )
    .join("");
  return `<div class="workbench-tabs" role="group" aria-label="Development views">${tabs}</div>${views[view].panel()}`;
}
export function bindConnections(render: () => void) {
  views[view].bind(render);
  document
    .querySelectorAll<HTMLButtonElement>("[data-workbench]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const next = button.dataset.workbench;
        if (!isView(next)) return;
        view = next;
        render();
        document
          .querySelector<HTMLButtonElement>(`[data-workbench="${view}"]`)
          ?.focus();
      }),
    );
}
