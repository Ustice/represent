import { createExplorer } from "@represent/explorer";
import "@represent/explorer/style.css";
import { input, model, reading } from "./model.js";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing app root");
const explorer = createExplorer(model);
const value = reading.decode.run(input);
function render() {
  if (!root) return;
  root.innerHTML = `<h1>Installed Represent packages</h1><p>North garden: ${value.temperature}°C · ${value.time.toISOString()}</p>${explorer.render()}`;
}
render();
explorer.bind(root, render);
