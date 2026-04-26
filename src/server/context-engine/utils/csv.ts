export function detectDelimiter(headerLine: string) {
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

export function parseCsv(text: string, delimiter = detectDelimiter(text.split(/\r?\n/, 1)[0] ?? "")) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((candidate) => candidate.some((value) => value.trim() !== ""));
  const [headers = [], ...dataRows] = nonEmptyRows;

  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), dataRow[index]?.trim() ?? ""])),
  );
}

export function toJsonLines(rows: Record<string, string>[]) {
  return rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
}
