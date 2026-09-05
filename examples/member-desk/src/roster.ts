import { rosterColumns, toRoster, type Member } from "./model.js";

function csvCell(value: string) {
  // Prefix formula-like text, then quote each whole field. This is an export
  // policy, not a reversible encoding or a guarantee across spreadsheet apps.
  const text = /^\s*[=+@\-＝＋－＠\t\r\n]/u.test(value) ? `'${value}` : value;
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportRoster(members: readonly Member[]) {
  const rows = members.map((value) => toRoster.convert(value));
  const records = [
    rosterColumns,
    ...rows.map((row) => rosterColumns.map((column) => row[column])),
  ];
  return {
    columns: rosterColumns,
    rows,
    csv: records.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n",
  };
}
