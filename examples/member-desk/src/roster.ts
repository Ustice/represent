import { rosterColumns, toRoster, type Member } from "./model.js";
import { csvTable } from "./csv.js";

export function exportRoster(members: readonly Member[]) {
  const rows = members.map((value) => toRoster.convert(value));
  return { columns: rosterColumns, rows, csv: csvTable(rosterColumns, rows) };
}
