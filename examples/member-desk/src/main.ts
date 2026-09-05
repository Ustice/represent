import { renderMembers } from "./members.js";
import { renderEvents } from "./events/page.js";
import "./style.css";

function route() {
  if (location.hash === "#events") renderEvents();
  else renderMembers();
}
window.addEventListener("hashchange", route);
route();
