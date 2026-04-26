import { readFile } from "node:fs/promises";
import path from "node:path";
import { PROPERTY_ID, PROJECT_ROOT, WORK_QUEUE_PATH } from "../config";
import type { SourceKind, SourceRegistry, SourceRegistryEntry, WorkItem, WorkItemGlimpse, WorkItemKind, WorkItemProcessor } from "../types";
import { safeFileStem, writeJsonLines } from "../utils/fs";

type EmailMeta = {
  metadata?: {
    headers?: Record<string, string>;
    rowCount?: number;
    filename?: string;
    date?: string;
    contractorId?: string;
    invoiceId?: string;
    letterType?: string;
    letterId?: string;
    flags?: Record<string, boolean>;
    format?: string;
  };
};

type GroupDraft = {
  kind: WorkItemKind;
  groupKey: string;
  sourceIds: string[];
  normalizedPaths: string[];
  reason: string;
  assignedProcessor: WorkItemProcessor;
  incrementalDay?: string;
  sources: SourceRegistryEntry[];
};

function eligibleSources(registry: SourceRegistry) {
  return registry.sources.filter((source) => source.status === "normalized" && source.normalizedPaths.length > 0);
}

function sortedSources(sources: SourceRegistryEntry[]) {
  return [...sources].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function addSourceToDraft(draft: GroupDraft, source: SourceRegistryEntry) {
  draft.sourceIds.push(source.sourceId);
  draft.normalizedPaths.push(...source.normalizedPaths);
  draft.sources.push(source);
}

async function makeWorkItem(draft: GroupDraft): Promise<WorkItem> {
  const sourceIds = [...new Set(draft.sourceIds)].sort();
  const normalizedPaths = [...new Set(draft.normalizedPaths)].sort();
  return {
    workItemId: `WI-${safeFileStem(draft.kind)}-${safeFileStem(draft.groupKey)}`.toUpperCase(),
    propertyId: PROPERTY_ID,
    kind: draft.kind,
    sourceIds,
    normalizedPaths,
    reason: draft.reason,
    assignedProcessor: draft.assignedProcessor,
    status: "pending",
    groupKey: draft.groupKey,
    incrementalDay: draft.incrementalDay,
    glimpse: await buildGlimpse(draft, sourceIds, normalizedPaths),
  };
}

function limitSorted(values: (string | undefined)[], limit = 12) {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

function compactRecord<T>(record: Record<string, T | undefined>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function countByKind(sources: SourceRegistryEntry[]) {
  return sources.reduce<Partial<Record<SourceKind, number>>>((counts, source) => {
    counts[source.kind] = (counts[source.kind] ?? 0) + 1;
    return counts;
  }, {});
}

function dateRange(sources: SourceRegistryEntry[], metadata: EmailMeta[]) {
  const dates = limitSorted([
    ...sources.map((source) => source.sourceDate),
    ...metadata.map((meta) => meta.metadata?.date),
    ...metadata.map((meta) => meta.metadata?.headers?.date).map((date) => normalizeDate(date)),
  ], Number.MAX_SAFE_INTEGER);
  if (dates.length === 0) return undefined;
  return [dates[0], dates[dates.length - 1]] as [string, string];
}

function normalizeDate(value: string | undefined) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10);
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0];
}

function metaPathFor(normalizedPath: string) {
  if (normalizedPath.endsWith(".md")) return normalizedPath.replace(/\.md$/, ".meta.json");
  if (normalizedPath.endsWith(".jsonl")) return normalizedPath.replace(/\.jsonl$/, ".meta.json");
  return normalizedPath.replace(/\.[^.]+$/, ".meta.json");
}

async function readSourceMeta(source: SourceRegistryEntry) {
  const metaPath = source.normalizedPaths.map(metaPathFor)[0];
  if (!metaPath) return {};
  try {
    return JSON.parse(await readFile(path.join(PROJECT_ROOT, metaPath), "utf8")) as EmailMeta;
  } catch {
    return {};
  }
}

function baseGlimpse(draft: GroupDraft, sourceIds: string[], normalizedPaths: string[], metadata: EmailMeta[]): Omit<WorkItemGlimpse, "summary" | "labels" | "metrics" | "preview"> {
  return {
    sourceCount: sourceIds.length,
    normalizedArtifactCount: normalizedPaths.length,
    sourceKinds: countByKind(draft.sources),
    dateRange: dateRange(draft.sources, metadata),
    entityHints: limitSorted(draft.sources.flatMap((source) => source.declaredIds)),
  };
}

async function buildGlimpse(draft: GroupDraft, sourceIds: string[], normalizedPaths: string[]): Promise<WorkItemGlimpse> {
  const metadata = await Promise.all(sortedSources(draft.sources).map(readSourceMeta));
  const base = baseGlimpse(draft, sourceIds, normalizedPaths, metadata);
  const fileNames = limitSorted(draft.sources.map((source) => path.posix.basename(source.rawPath)), 8);
  const rowCount = metadata.reduce((sum, meta) => sum + (typeof meta.metadata?.rowCount === "number" ? meta.metadata.rowCount : 0), 0);

  if (draft.kind === "email_thread") {
    const headers = metadata.map((meta) => meta.metadata?.headers ?? {});
    const subjects = limitSorted(headers.map((header) => header.subject), 6);
    const participants = limitSorted(headers.flatMap((header) => [header.from, header.to]), 8);
    return {
      ...base,
      summary: `${sourceIds.length} email message${sourceIds.length === 1 ? "" : "s"} grouped as a thread about ${subjects[0] ?? "an unknown subject"}.`,
      labels: ["email", "thread", sourceMonth(draft.sources[0])],
      metrics: { messageCount: sourceIds.length },
      preview: { subjects, participants },
    };
  }

  if (draft.kind === "invoice_group") {
    const contractorIds = limitSorted(metadata.map((meta) => meta.metadata?.contractorId), 4);
    const invoiceIds = limitSorted(metadata.map((meta) => meta.metadata?.invoiceId), 4);
    const flagged = metadata.filter((meta) => Object.values(meta.metadata?.flags ?? {}).some(Boolean)).length;
    return {
      ...base,
      summary: `${sourceIds.length} invoice source${sourceIds.length === 1 ? "" : "s"} for ${contractorIds[0] ?? "unknown contractor"}.`,
      labels: ["invoice", "pdf-metadata"],
      metrics: { invoiceSourceCount: sourceIds.length, flaggedFilenameCount: flagged },
      preview: { invoiceIds, contractorIds, fileNames },
    };
  }

  if (draft.kind === "letter_group") {
    const letterTypes = limitSorted(metadata.map((meta) => meta.metadata?.letterType), 6);
    const letterIds = limitSorted(metadata.map((meta) => meta.metadata?.letterId), 6);
    return {
      ...base,
      summary: `${sourceIds.length} letter source${sourceIds.length === 1 ? "" : "s"} grouped by ${letterTypes[0] ?? "letter type"}.`,
      labels: ["letter", "pdf-metadata"],
      metrics: { letterSourceCount: sourceIds.length },
      preview: { letterTypes, letterIds, fileNames },
    };
  }

  if (draft.kind === "bank_group") {
    const formats = limitSorted(metadata.map((meta) => meta.metadata?.format), 4);
    return {
      ...base,
      summary: `${sourceIds.length} bank source${sourceIds.length === 1 ? "" : "s"} with ${rowCount} parsed CSV row${rowCount === 1 ? "" : "s"}.`,
      labels: ["bank", "ledger", "reconciliation"],
      metrics: { parsedRowCount: rowCount, bankSourceCount: sourceIds.length },
      preview: { formats, fileNames },
    };
  }

  if (draft.kind === "incremental_day") {
    return {
      ...base,
      summary: `${draft.incrementalDay ?? draft.groupKey} daily drop with ${sourceIds.length} new source${sourceIds.length === 1 ? "" : "s"}.`,
      labels: ["incremental", draft.incrementalDay ?? draft.groupKey],
      metrics: { newSourceCount: sourceIds.length, parsedRowCount: rowCount },
      preview: compactRecord({ incrementalDay: draft.incrementalDay, fileNames }),
    };
  }

  if (draft.kind === "master_data_bundle") {
    return {
      ...base,
      summary: "Canonical master data plus base index files for property identity, entity alignment, and starting ledger/document indexes.",
      labels: ["master-data", "identity", "indexes"],
      metrics: { parsedRowCount: rowCount, sourceFileCount: sourceIds.length },
      preview: { fileNames },
    };
  }

  return {
    ...base,
    summary: `${draft.kind} containing ${sourceIds.length} source${sourceIds.length === 1 ? "" : "s"}.`,
    labels: [draft.kind],
    metrics: { sourceCount: sourceIds.length, parsedRowCount: rowCount },
    preview: { fileNames },
  };
}

function sourceMonth(source: SourceRegistryEntry) {
  return source.sourceDate?.slice(0, 7) ?? source.rawPath.match(/\/(\d{4}-\d{2})\//)?.[1] ?? "undated";
}

function firstDeclared(source: SourceRegistryEntry, prefix: string) {
  return source.declaredIds.find((id) => id.startsWith(prefix));
}

function fileStem(source: SourceRegistryEntry) {
  return path.posix.basename(source.rawPath).replace(/\.[^.]+$/, "");
}

async function readEmailHeaders(source: SourceRegistryEntry) {
  const metaPath = source.normalizedPaths.find((normalizedPath) => normalizedPath.endsWith(".md"))?.replace(/\.md$/, ".meta.json");
  if (!metaPath) return {};
  try {
    const meta = JSON.parse(await readFile(path.join(PROJECT_ROOT, metaPath), "utf8")) as EmailMeta;
    return meta.metadata?.headers ?? {};
  } catch {
    return {};
  }
}

function normalizedSubject(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/^\s*(re|aw|fw|fwd):\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMessageId(value: string | undefined) {
  return value?.replace(/[<>]/g, "").trim().toLowerCase();
}

function emailFallbackKey(source: SourceRegistryEntry, headers: Record<string, string>) {
  const subject = normalizedSubject(headers.subject) || "no-subject";
  const contact = (headers.from ?? headers.to ?? "unknown-contact").toLowerCase().replace(/\s+/g, " ").trim();
  return `${sourceMonth(source)}:${subject}:${contact}`;
}

async function addEmailGroups(groups: Map<string, GroupDraft>, sources: SourceRegistryEntry[]) {
  const messageIdToKey = new Map<string, string>();

  for (const source of sortedSources(sources)) {
    const headers = await readEmailHeaders(source);
    const messageId = cleanMessageId(headers["message-id"]);
    const references = [headers["in-reply-to"], headers.references]
      .filter(Boolean)
      .flatMap((value) => value!.split(/\s+/).map(cleanMessageId).filter(Boolean));
    const knownReference = references.map((reference) => messageIdToKey.get(reference)).find(Boolean);
    const groupKey = knownReference ?? emailFallbackKey(source, headers);
    if (messageId) messageIdToKey.set(messageId, groupKey);

    const existing = groups.get(groupKey) ?? {
      kind: "email_thread",
      groupKey,
      sourceIds: [],
      normalizedPaths: [],
      reason: "Email conversation grouped by Message-ID/In-Reply-To/References, with subject/contact/month fallback.",
      assignedProcessor: "email_thread_extractor",
      sources: [],
    };
    addSourceToDraft(existing, source);
    groups.set(groupKey, existing);
  }
}

function addDraft(groups: Map<string, GroupDraft>, draft: GroupDraft, sources: SourceRegistryEntry[]) {
  for (const source of sortedSources(sources)) addSourceToDraft(draft, source);
  if (draft.sourceIds.length > 0) groups.set(draft.groupKey, draft);
}

function addInvoiceGroups(groups: Map<string, GroupDraft>, sources: SourceRegistryEntry[]) {
  const byKey = new Map<string, SourceRegistryEntry[]>();
  for (const source of sortedSources(sources)) {
    const invoiceId = firstDeclared(source, "INV-") ?? source.sourceId;
    const contractorId = firstDeclared(source, "DL-") ?? "unknown-contractor";
    const key = `${contractorId}:${invoiceId}`;
    byKey.set(key, [...(byKey.get(key) ?? []), source]);
  }
  for (const [groupKey, groupSources] of byKey) {
    addDraft(groups, {
      kind: "invoice_group",
      groupKey,
      sourceIds: [],
      normalizedPaths: [],
      reason: "Invoice grouped by invoice ID and contractor ID from filename/index metadata.",
      assignedProcessor: "invoice_bank_reconciler",
      sources: [],
    }, groupSources);
  }
}

function addLetterGroups(groups: Map<string, GroupDraft>, sources: SourceRegistryEntry[]) {
  const byKey = new Map<string, SourceRegistryEntry[]>();
  for (const source of sortedSources(sources)) {
    const name = fileStem(source);
    const letterType = name.replace(/^\d{8}_/, "").replace(/_LTR-\d+$/, "") || "unknown-letter";
    const key = `${sourceMonth(source)}:${letterType}`;
    byKey.set(key, [...(byKey.get(key) ?? []), source]);
  }
  for (const [groupKey, groupSources] of byKey) {
    addDraft(groups, {
      kind: "letter_group",
      groupKey,
      sourceIds: [],
      normalizedPaths: [],
      reason: "Letters grouped by month and letter type from deterministic filename metadata.",
      assignedProcessor: "pdf_letter_extractor",
      sources: [],
    }, groupSources);
  }
}

export async function buildWorkQueue(registry: SourceRegistry): Promise<WorkItem[]> {
  const sources = eligibleSources(registry);
  const baseSources = sources.filter((source) => !source.incrementalDay);
  const incrementalSources = sources.filter((source) => source.incrementalDay);
  const groups = new Map<string, GroupDraft>();

  addDraft(groups, {
    kind: "master_data_bundle",
    groupKey: "base-master-data-and-indexes",
    sourceIds: [],
    normalizedPaths: [],
    reason: "Canonical master data and base index CSVs establish schema alignment and entity identities.",
    assignedProcessor: "structured_extractor",
    sources: [],
  }, baseSources.filter((source) => source.kind === "master_data" || source.kind === "index_csv"));

  addDraft(groups, {
    kind: "bank_group",
    groupKey: "base-bank-ledger",
    sourceIds: [],
    normalizedPaths: [],
    reason: "Historical bank CSV/XML files are processed together for transaction reconciliation.",
    assignedProcessor: "invoice_bank_reconciler",
    sources: [],
  }, baseSources.filter((source) => source.kind === "bank_csv" || source.kind === "bank_xml"));

  await addEmailGroups(groups, baseSources.filter((source) => source.kind === "email"));
  addInvoiceGroups(groups, baseSources.filter((source) => source.kind === "invoice_pdf"));
  addLetterGroups(groups, baseSources.filter((source) => source.kind === "letter_pdf"));

  const incrementalByDay = new Map<string, SourceRegistryEntry[]>();
  for (const source of sortedSources(incrementalSources)) {
    const day = source.incrementalDay ?? "unknown-day";
    incrementalByDay.set(day, [...(incrementalByDay.get(day) ?? []), source]);
  }
  for (const [day, daySources] of incrementalByDay) {
    addDraft(groups, {
      kind: "incremental_day",
      groupKey: day,
      sourceIds: [],
      normalizedPaths: [],
      reason: "Incremental daily drop is processed atomically so downstream patches can be scoped to the changed day.",
      assignedProcessor: "structured_extractor",
      incrementalDay: day,
      sources: [],
    }, daySources);
  }

  return (await Promise.all([...groups.values()].map(makeWorkItem))).sort((a, b) => a.workItemId.localeCompare(b.workItemId));
}

export async function writeWorkQueue(workItems: WorkItem[]) {
  await writeJsonLines(WORK_QUEUE_PATH, workItems);
}
