import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DUPLICATE_DECISIONS_PATH,
  ERROR_RECORDS_PATH,
  EXTRACTION_SUMMARY_PATH,
  IGNORE_DECISIONS_PATH,
  OBSERVATIONS_PATH,
  PROJECT_ROOT,
  PROPERTY_ID,
} from "../config";
import type {
  DuplicateDecision,
  EntityIndex,
  EntityResolution,
  ErrorRecord,
  EvidenceRef,
  ExtractionSummary,
  IgnoreDecision,
  NormalizedMeta,
  Observation,
  ObservationDecision,
  ObservationKind,
  SourceRegistry,
  SourceRegistryEntry,
  WorkItem,
  WorkItemProcessor,
} from "../types";
import { readJsonLinesIfExists, sha256Text, writeJson, writeJsonLines } from "../utils/fs";

type ExtractionArtifacts = {
  workItems: WorkItem[];
  observations: Observation[];
  ignoreDecisions: IgnoreDecision[];
  duplicateDecisions: DuplicateDecision[];
  errorRecords: ErrorRecord[];
  summary: ExtractionSummary;
};

type JsonRecord = Record<string, unknown>;

const DETERMINISTIC_EXTRACTOR_VERSION = 4;

function absolutePath(relativePath: string) {
  return path.join(PROJECT_ROOT, relativePath);
}

function stableHash(value: unknown) {
  return sha256Text(JSON.stringify(value));
}

function workItemInputHash(workItem: WorkItem) {
  return stableHash({
    extractorVersion: DETERMINISTIC_EXTRACTOR_VERSION,
    workItemId: workItem.workItemId,
    sourceIds: workItem.sourceIds,
    normalizedPaths: workItem.normalizedPaths,
    glimpse: workItem.glimpse,
  });
}

function stableId(prefix: string, value: unknown) {
  return `${prefix}-${stableHash(value).slice(0, 16).toUpperCase()}`;
}

function normalizedMetaPath(normalizedPath: string) {
  if (normalizedPath.endsWith(".md")) return normalizedPath.replace(/\.md$/, ".meta.json");
  if (normalizedPath.endsWith(".jsonl")) return normalizedPath.replace(/\.jsonl$/, ".meta.json");
  return normalizedPath.replace(/\.[^.]+$/, ".meta.json");
}

async function readMeta(source: SourceRegistryEntry): Promise<NormalizedMeta | undefined> {
  const metaPath = source.normalizedPaths.map(normalizedMetaPath)[0];
  if (!metaPath) return undefined;
  try {
    return JSON.parse(await readFile(absolutePath(metaPath), "utf8")) as NormalizedMeta;
  } catch {
    return undefined;
  }
}

async function readJson(pathInProject: string): Promise<unknown> {
  return JSON.parse(await readFile(absolutePath(pathInProject), "utf8"));
}

async function readJsonLines(pathInProject: string): Promise<JsonRecord[]> {
  const text = await readFile(absolutePath(pathInProject), "utf8");
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as JsonRecord);
}

function present(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function compact(value: JsonRecord) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== ""));
}

function uniqueSorted(values: unknown[]) {
  return [...new Set(values.filter(present).map((value) => value.trim()))].sort((a, b) => a.localeCompare(b));
}

function mentionsFrom(...values: unknown[]) {
  const text = values
    .filter((value) => typeof value === "string")
    .join(" ");
  return uniqueSorted(text.match(/\b(?:LIE|HAUS|EH|EIG|MIE|DL|TX|INV|EMAIL|THR|LTR)-[A-Z0-9-]*\d+\b/g) ?? []);
}

function entityLinks(mentions: string[], entityIndex: EntityIndex): EntityResolution[] {
  return mentions
    .filter((mention) => entityIndex.entities[mention])
    .map((mention) => ({ entityId: mention, matchType: "declared_id", reason: "Mention matches canonical entity id." }));
}

function observation(params: {
  workItem: WorkItem;
  inputHash: string;
  sourceIds: string[];
  kind: ObservationKind;
  statement: string;
  evidence: EvidenceRef[];
  decision?: ObservationDecision;
  reason: string;
  createdBy?: WorkItemProcessor;
  attributes?: JsonRecord;
  entityIndex: EntityIndex;
}): Observation {
  const mentions = uniqueSorted([
    ...mentionsFrom(params.statement, JSON.stringify(params.attributes ?? {})),
    ...params.sourceIds.flatMap((sourceId) => mentionsFrom(sourceId)),
  ]);
  return {
    observationId: stableId("OBS", {
      inputHash: params.inputHash,
      kind: params.kind,
      sourceIds: params.sourceIds,
      statement: params.statement,
      attributes: params.attributes ?? {},
    }),
    workItemId: params.workItem.workItemId,
    inputHash: params.inputHash,
    sourceIds: params.sourceIds,
    propertyId: PROPERTY_ID,
    kind: params.kind,
    statement: params.statement,
    mentions,
    entityLinks: entityLinks(mentions, params.entityIndex),
    evidence: params.evidence,
    decision: params.decision ?? "keep",
    reason: params.reason,
    createdBy: params.createdBy ?? "structured_extractor",
    attributes: params.attributes ?? {},
  };
}

function sourceEvidence(source: SourceRegistryEntry, field?: string, lineStart?: number): EvidenceRef {
  return compact({ sourceId: source.sourceId, normalizedPath: source.normalizedPaths[0], field, lineStart, lineEnd: lineStart }) as EvidenceRef;
}

function inferEntityType(source: SourceRegistryEntry, record: JsonRecord) {
  const rawPath = source.rawPath.toLowerCase();
  const id = String(record.id ?? "");
  if (rawPath.includes("einheiten") || id.startsWith("EH-")) return "unit";
  if (rawPath.includes("eigentuemer") || id.startsWith("EIG-")) return "owner";
  if (rawPath.includes("mieter") || id.startsWith("MIE-")) return "tenant";
  if (rawPath.includes("dienstleister") || id.startsWith("DL-")) return "contractor";
  if (rawPath.includes("gebaeude") || id.startsWith("HAUS-")) return "building";
  if (id.startsWith("LIE-")) return "property";
  return "entity";
}

function displayName(record: JsonRecord) {
  const fullName = [record.vorname, record.nachname].filter(present).join(" ");
  return [record.name, record.firma, fullName, record.id].find(present) ?? "unknown";
}

function extractEntityProfile(record: JsonRecord, source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex, field?: string) {
  const id = present(record.id) ? record.id : undefined;
  if (!id) return undefined;
  const entityType = inferEntityType(source, record);
  return observation({
    workItem,
    inputHash,
    sourceIds: [source.sourceId],
    kind: "entity_profile",
    statement: `${entityType} ${id} (${displayName(record)}) is present in canonical master data.`,
    evidence: [sourceEvidence(source, field)],
    reason: "Deterministic master-data row extraction.",
    attributes: { entityId: id, entityType, fields: record },
    entityIndex,
  });
}

async function extractMasterData(source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex) {
  const normalizedPath = source.normalizedPaths.find((candidate) => candidate.endsWith(".json"));
  if (!normalizedPath) return [];
  const value = await readJson(normalizedPath);
  const observations: Observation[] = [];

  if (Array.isArray(value)) {
    for (const record of value.filter((entry): entry is JsonRecord => typeof entry === "object" && entry !== null)) {
      const extracted = extractEntityProfile(record, source, workItem, inputHash, entityIndex);
      if (extracted) observations.push(extracted);
    }
  } else if (typeof value === "object" && value !== null) {
    const data = value as JsonRecord;
    for (const [field, entry] of Object.entries(data)) {
      if (Array.isArray(entry)) {
        for (const record of entry.filter((candidate): candidate is JsonRecord => typeof candidate === "object" && candidate !== null)) {
          const extracted = extractEntityProfile(record, source, workItem, inputHash, entityIndex, field);
          if (extracted) observations.push(extracted);
        }
      } else if (typeof entry === "object" && entry !== null) {
        const extracted = extractEntityProfile(entry as JsonRecord, source, workItem, inputHash, entityIndex, field);
        if (extracted) observations.push(extracted);
      }
    }
  }

  return observations;
}

function isoGermanDate(value: unknown) {
  if (!present(value)) return undefined;
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function paymentObservation(row: JsonRecord, source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex, lineStart: number) {
  const transactionId = String(row.id ?? row["Kundenreferenz (End-to-End)"] ?? `row-${lineStart}`);
  const date = String(row.datum ?? isoGermanDate(row.Buchungstag) ?? "unknown date");
  const type = String(row.typ ?? row.Buchungstext ?? "payment");
  const amount = String(row.betrag ?? row.Betrag ?? "unknown amount");
  const counterparty = String(row.gegen_name ?? row["Beguenstigter/Zahlungspflichtiger"] ?? "unknown counterparty");
  const reference = String(row.verwendungszweck ?? row.Verwendungszweck ?? "");
  return observation({
    workItem,
    inputHash,
    sourceIds: [source.sourceId],
    kind: "payment",
    statement: `Payment ${transactionId} is ${type} ${amount} on ${date} with ${counterparty}${reference ? ` for ${reference}` : ""}.`,
    evidence: [sourceEvidence(source, "jsonl_row", lineStart)],
    decision: present(String(row.error_types ?? "")) ? "needs_review" : "keep",
    reason: "Deterministic bank/index row extraction.",
    attributes: compact({ transactionId, date, type, amount, counterparty, reference, row }),
    entityIndex,
  });
}

function invoiceObservation(row: JsonRecord, source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex, lineStart?: number) {
  const invoiceId = String(row.id ?? row.invoiceId ?? source.declaredIds.find((id) => id.startsWith("INV-")) ?? source.sourceId);
  const contractorId = String(row.dienstleister_id ?? row.contractorId ?? source.declaredIds.find((id) => id.startsWith("DL-")) ?? "unknown contractor");
  const invoiceNumber = String(row.rechnungsnr ?? row.invoiceNumber ?? invoiceId);
  const gross = String(row.brutto ?? row.gross ?? row.grossAmount ?? "unknown gross");
  const net = String(row.netto ?? row.netAmount ?? "");
  const vat = String(row.mwst ?? row.vatAmount ?? "");
  const date = String(row.datum ?? row.date ?? source.sourceDate ?? "unknown date");
  return observation({
    workItem,
    inputHash,
    sourceIds: [source.sourceId],
    kind: "invoice",
    statement: `Invoice ${invoiceId} (${invoiceNumber}) is dated ${date} for ${contractorId} with gross amount ${gross}${net ? `, net ${net}` : ""}${vat ? `, VAT ${vat}` : ""}.`,
    evidence: [sourceEvidence(source, lineStart ? "jsonl_row" : "pdf_text", lineStart)],
    decision: JSON.stringify(row).includes("FAKE") || JSON.stringify(row).includes("DUP-") ? "needs_review" : "keep",
    reason: lineStart ? "Deterministic invoice index row extraction." : "Deterministic invoice PDF text extraction.",
    attributes: compact({ invoiceId, contractorId, invoiceNumber, date, gross, net, vat, row }),
    entityIndex,
  });
}

function emailMetadataObservation(row: JsonRecord, source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex, lineStart?: number) {
  const emailId = String(row.id ?? source.declaredIds.find((id) => id.startsWith("EMAIL-")) ?? source.sourceId);
  const threadId = String(row.thread_id ?? "");
  const subject = String(row.subject ?? row.headers?.["subject"] ?? "unknown subject");
  const date = String(row.datetime ?? row.headers?.["date"] ?? source.sourceDate ?? "unknown date");
  return observation({
    workItem,
    inputHash,
    sourceIds: [source.sourceId],
    kind: "communication_metadata",
    statement: `Email ${emailId}${threadId ? ` in thread ${threadId}` : ""} is dated ${date} with subject ${subject}.`,
    evidence: [sourceEvidence(source, lineStart ? "jsonl_row" : "email_headers", lineStart)],
    decision: "needs_review",
    reason: "Deterministic email metadata only; semantic body extraction is reserved for the LLM extractor.",
    attributes: compact({ emailId, threadId, subject, date, row }),
    entityIndex,
  });
}

function letterObservation(row: JsonRecord, source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex) {
  const letterId = String(row.letterId ?? source.declaredIds.find((id) => id.startsWith("LTR-")) ?? source.sourceId);
  const letterType = String(row.letterType ?? "unknown letter type");
  const date = String(row.date ?? source.sourceDate ?? "unknown date");
  const subject = String(row.subject ?? letterType);
  const decisions = Array.isArray(row.decisions) ? row.decisions : [];
  const amount = String(row.amount ?? "");
  return observation({
    workItem,
    inputHash,
    sourceIds: [source.sourceId],
    kind: "document_metadata",
    statement: `Letter ${letterId} is a ${letterType} document dated ${date}${subject && subject !== letterType ? ` about ${subject}` : ""}${decisions.length > 0 ? ` with ${decisions.length} extracted meeting decision(s)` : ""}${amount ? ` and amount ${amount}` : ""}.`,
    evidence: [sourceEvidence(source, "pdf_text")],
    reason: "Deterministic letter PDF text extraction.",
    attributes: compact({ letterId, letterType, date, subject, decisions, amount, row }),
    entityIndex,
  });
}

async function extractIndexRows(source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex) {
  const normalizedPath = source.normalizedPaths.find((candidate) => candidate.endsWith(".jsonl"));
  if (!normalizedPath) return [];
  const rows = await readJsonLines(normalizedPath);
  const fileName = path.posix.basename(source.rawPath);
  return rows.map((row, index) => {
    if (fileName === "bank_index.csv") return paymentObservation(row, source, workItem, inputHash, entityIndex, index + 1);
    if (fileName === "rechnungen_index.csv") return invoiceObservation(row, source, workItem, inputHash, entityIndex, index + 1);
    if (fileName === "emails_index.csv") return emailMetadataObservation(row, source, workItem, inputHash, entityIndex, index + 1);
    return observation({
      workItem,
      inputHash,
      sourceIds: [source.sourceId],
      kind: "source_bundle",
      statement: `Index row ${index + 1} exists in ${fileName}.`,
      evidence: [sourceEvidence(source, "jsonl_row", index + 1)],
      reason: "Deterministic generic index row extraction.",
      attributes: { row },
      entityIndex,
    });
  });
}

async function extractBankRows(source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex) {
  const normalizedPath = source.normalizedPaths.find((candidate) => candidate.endsWith(".jsonl"));
  if (!normalizedPath) {
    return [observation({
      workItem,
      inputHash,
      sourceIds: [source.sourceId],
      kind: "source_bundle",
      statement: `Bank source ${source.sourceId} is available as ${path.posix.basename(source.rawPath)}.`,
      evidence: [sourceEvidence(source, "source_metadata")],
      reason: "Bank source is registered, but deterministic row extraction is only enabled for normalized JSONL files.",
      attributes: { rawPath: source.rawPath, normalizedPaths: source.normalizedPaths },
      entityIndex,
    })];
  }
  const rows = await readJsonLines(normalizedPath);
  return rows.map((row, index) => paymentObservation(row, source, workItem, inputHash, entityIndex, index + 1));
}

async function extractPdfMetadata(source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex) {
  const meta = await readMeta(source);
  const metadata = (meta?.metadata ?? {}) as JsonRecord;
  if (source.kind === "invoice_pdf") return [invoiceObservation(metadata, source, workItem, inputHash, entityIndex)];
  if (source.kind === "letter_pdf") return [letterObservation(metadata, source, workItem, inputHash, entityIndex)];
  return [];
}

async function extractEmailMetadata(source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex) {
  const meta = await readMeta(source);
  const metadata = (meta?.metadata ?? {}) as JsonRecord;
  return [emailMetadataObservation({ headers: metadata.headers ?? {}, id: source.sourceId }, source, workItem, inputHash, entityIndex)];
}

async function extractSourceBundle(source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex) {
  return [observation({
    workItem,
    inputHash,
    sourceIds: [source.sourceId],
    kind: "source_bundle",
    statement: `Source ${source.sourceId} is part of ${workItem.kind} ${workItem.groupKey}.`,
    evidence: [sourceEvidence(source, "source_metadata")],
    reason: "Deterministic source registration observation.",
    attributes: { rawPath: source.rawPath, normalizedPaths: source.normalizedPaths, sourceKind: source.kind },
    entityIndex,
  })];
}

async function extractSource(source: SourceRegistryEntry, workItem: WorkItem, inputHash: string, entityIndex: EntityIndex) {
  if (source.kind === "master_data") return extractMasterData(source, workItem, inputHash, entityIndex);
  if (source.kind === "index_csv") return extractIndexRows(source, workItem, inputHash, entityIndex);
  if (source.kind === "bank_csv" || source.kind === "bank_xml") return extractBankRows(source, workItem, inputHash, entityIndex);
  if (source.kind === "invoice_pdf" || source.kind === "letter_pdf") return extractPdfMetadata(source, workItem, inputHash, entityIndex);
  if (source.kind === "email") return extractEmailMetadata(source, workItem, inputHash, entityIndex);
  return extractSourceBundle(source, workItem, inputHash, entityIndex);
}

async function extractWorkItem(workItem: WorkItem, sourceById: Map<string, SourceRegistryEntry>, inputHash: string, entityIndex: EntityIndex) {
  if (workItem.kind === "email_thread") {
    return [observation({
      workItem,
      inputHash,
      sourceIds: workItem.sourceIds,
      kind: "communication_metadata",
      statement: workItem.glimpse.summary,
      evidence: workItem.sourceIds.map((sourceId) => sourceById.get(sourceId)).filter((source): source is SourceRegistryEntry => Boolean(source)).map((source) => sourceEvidence(source, "email_headers")),
      decision: "needs_review",
      reason: "Thread-level header glimpse extracted deterministically; email body extraction is reserved for the LLM extractor.",
      attributes: { glimpse: workItem.glimpse },
      entityIndex,
    })];
  }

  const observations = await Promise.all(
    workItem.sourceIds.map(async (sourceId) => {
      const source = sourceById.get(sourceId);
      if (!source) return [];
      return extractSource(source, workItem, inputHash, entityIndex);
    }),
  );
  return observations.flat();
}

function reusedRecords<T extends { workItemId: string; inputHash: string }>(records: T[]) {
  const grouped = new Map<string, T[]>();
  for (const record of records) grouped.set(`${record.workItemId}:${record.inputHash}`, [...(grouped.get(`${record.workItemId}:${record.inputHash}`) ?? []), record]);
  return grouped;
}

export async function runDeterministicExtraction(workItems: WorkItem[], registry: SourceRegistry, entityIndex: EntityIndex, now = new Date().toISOString()): Promise<ExtractionArtifacts> {
  const previousObservations = reusedRecords(await readJsonLinesIfExists<Observation>(OBSERVATIONS_PATH));
  const previousIgnores = reusedRecords(await readJsonLinesIfExists<IgnoreDecision>(IGNORE_DECISIONS_PATH));
  const previousDuplicates = reusedRecords(await readJsonLinesIfExists<DuplicateDecision>(DUPLICATE_DECISIONS_PATH));
  const sourceById = new Map(registry.sources.map((source) => [source.sourceId, source]));

  const observations: Observation[] = [];
  const ignoreDecisions: IgnoreDecision[] = [];
  const duplicateDecisions: DuplicateDecision[] = [];
  const errorRecords: ErrorRecord[] = [];
  const updatedWorkItems: WorkItem[] = [];
  let reusedWorkItems = 0;
  let extractedWorkItems = 0;

  for (const workItem of workItems) {
    const inputHash = workItemInputHash(workItem);
    const key = `${workItem.workItemId}:${inputHash}`;
    const reusedObservationRecords = previousObservations.get(key) ?? [];
    const reusedIgnoreRecords = previousIgnores.get(key) ?? [];
    const reusedDuplicateRecords = previousDuplicates.get(key) ?? [];

    if (reusedObservationRecords.length > 0 || reusedIgnoreRecords.length > 0 || reusedDuplicateRecords.length > 0) {
      observations.push(...reusedObservationRecords);
      ignoreDecisions.push(...reusedIgnoreRecords);
      duplicateDecisions.push(...reusedDuplicateRecords);
      updatedWorkItems.push({ ...workItem, status: "processed" });
      reusedWorkItems += 1;
      continue;
    }

    try {
      const extracted = await extractWorkItem(workItem, sourceById, inputHash, entityIndex);
      observations.push(...extracted);
      updatedWorkItems.push({ ...workItem, status: "processed" });
      extractedWorkItems += 1;
    } catch (error) {
      errorRecords.push({
        errorId: stableId("ERR", { inputHash, workItemId: workItem.workItemId, error: error instanceof Error ? error.message : String(error) }),
        workItemId: workItem.workItemId,
        inputHash,
        sourceIds: workItem.sourceIds,
        propertyId: PROPERTY_ID,
        error: error instanceof Error ? error.message : String(error),
        createdBy: workItem.assignedProcessor,
      });
      updatedWorkItems.push({ ...workItem, status: "error" });
    }
  }

  observations.sort((a, b) => a.observationId.localeCompare(b.observationId));
  ignoreDecisions.sort((a, b) => a.decisionId.localeCompare(b.decisionId));
  duplicateDecisions.sort((a, b) => a.decisionId.localeCompare(b.decisionId));
  errorRecords.sort((a, b) => a.errorId.localeCompare(b.errorId));

  const summary: ExtractionSummary = {
    generatedAt: now,
    propertyId: PROPERTY_ID,
    workItems: workItems.length,
    extractedWorkItems,
    reusedWorkItems,
    erroredWorkItems: errorRecords.length,
    observations: observations.length,
    ignoreDecisions: ignoreDecisions.length,
    duplicateDecisions: duplicateDecisions.length,
    errorRecords: errorRecords.length,
  };

  await writeJsonLines(OBSERVATIONS_PATH, observations);
  await writeJsonLines(IGNORE_DECISIONS_PATH, ignoreDecisions);
  await writeJsonLines(DUPLICATE_DECISIONS_PATH, duplicateDecisions);
  await writeJsonLines(ERROR_RECORDS_PATH, errorRecords);
  await writeJson(EXTRACTION_SUMMARY_PATH, summary);

  return { workItems: updatedWorkItems, observations, ignoreDecisions, duplicateDecisions, errorRecords, summary };
}
