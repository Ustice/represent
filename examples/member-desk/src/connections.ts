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
export function connectionsPanel() {
  return explorer.render();
}
export function bindConnections(render: () => void) {
  explorer.bind(document, render);
}
