import { readDirectory, sampleMembers } from "./model.js";

export function savedMembers() {
  const saved = localStorage.getItem("represent.fieldwork.members.v1");
  const input: unknown = saved ? JSON.parse(saved) : null;
  return input ? readDirectory(input) : sampleMembers;
}
