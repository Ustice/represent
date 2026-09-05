function csvCell(value: string) {
  // Prefix formula-like text, then quote each whole field. This is an export
  // policy, not a reversible encoding or a guarantee across spreadsheet apps.
  const text = /^\s*[=+@\-＝＋－＠\t\r\n]/u.test(value) ? `'${value}` : value;
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvTable<Column extends string>(
  columns: readonly Column[],
  rows: readonly Record<Column, string>[],
) {
  const records = [
    columns,
    ...rows.map((row) => columns.map((column) => row[column])),
  ];
  return records.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
