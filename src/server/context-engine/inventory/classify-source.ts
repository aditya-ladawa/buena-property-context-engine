import path from "node:path";
import type { SourceKind } from "../types";

export type ClassifiedSource = {
  kind: SourceKind;
  declaredIds: string[];
  sourceDate?: string;
  incrementalDay?: string;
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function dateFromFilename(fileName: string) {
  const match = fileName.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function incrementalDayFromPath(rawPath: string) {
  return rawPath.match(/data\/incremental\/(day-\d+)/)?.[1];
}

export function classifySource(rawPath: string): ClassifiedSource {
  const normalized = rawPath.replaceAll("\\", "/");
  const fileName = path.posix.basename(normalized);
  const extension = path.posix.extname(fileName).toLowerCase();
  const ids = unique([
    ...(fileName.match(/EMAIL-\d+/g) ?? []),
    ...(fileName.match(/LTR-\d+/g) ?? []),
    ...(fileName.match(/INV-(?:DUP-|FAKE-)?\d+/g) ?? []),
    ...(fileName.match(/DL-(?:FAKE-)?\d+/g) ?? []),
    ...(fileName.match(/TX-\d+/g) ?? []),
  ]);
  const incrementalDay = incrementalDayFromPath(normalized);

  if (fileName === ".DS_Store" || fileName.startsWith(".~")) {
    return { kind: "system_file", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
  }

  if (fileName === "incremental_manifest.json") {
    return { kind: "incremental_manifest", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
  }

  if (normalized.startsWith("data/stammdaten/") && [".csv", ".json"].includes(extension)) {
    return { kind: "master_data", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
  }

  if (fileName.endsWith("_index.csv") || ["emails_index.csv", "rechnungen_index.csv", "bank_index.csv"].includes(fileName)) {
    return { kind: "index_csv", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
  }

  if (extension === ".eml") {
    return { kind: "email", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
  }

  if (extension === ".pdf" && normalized.includes("/rechnungen/")) {
    return { kind: "invoice_pdf", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
  }

  if (extension === ".pdf" && normalized.includes("/briefe/")) {
    return { kind: "letter_pdf", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
  }

  if (extension === ".csv" && normalized.includes("/bank/")) {
    return { kind: "bank_csv", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
  }

  if (extension === ".xml" && normalized.includes("/bank/")) {
    return { kind: "bank_xml", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
  }

  return { kind: "unknown", declaredIds: ids, sourceDate: dateFromFilename(fileName), incrementalDay };
}

export function deriveSourceId(rawPath: string, declaredIds: string[], rawSha256: string) {
  const normalized = rawPath.replaceAll("\\", "/");
  const fileName = path.posix.basename(normalized);
  const incrementalDay = incrementalDayFromPath(normalized);
  const stem = fileName.replace(/\.[^.]+$/, "");

  const sourceId = declaredIds.find((id) => id.startsWith("EMAIL-") || id.startsWith("LTR-") || id.startsWith("INV-"));
  if (sourceId) return sourceId;

  if (normalized.startsWith("data/stammdaten/")) return `MASTER-${stem.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
  if (fileName === "incremental_manifest.json" && incrementalDay) return `INCR-${incrementalDay.toUpperCase()}-MANIFEST`;
  if (fileName.endsWith("_index.csv")) {
    const scope = incrementalDay ? `${incrementalDay.toUpperCase()}-` : "BASE-";
    return `INDEX-${scope}${stem.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
  }
  if (normalized.includes("/bank/")) {
    const scope = incrementalDay ? `${incrementalDay.toUpperCase()}-` : "BASE-";
    return `BANK-${scope}${stem.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
  }

  return `SRC-${rawSha256.slice(0, 12)}`;
}
