import { readFile } from "node:fs/promises";
import path from "node:path";
import { PROPERTY_ID, PROJECT_ROOT, WORK_QUEUE_PATH } from "../config";
import type { SourceRegistry, SourceRegistryEntry, WorkItem, WorkItemKind, WorkItemProcessor } from "../types";
import { safeFileStem, writeJsonLines } from "../utils/fs";

type EmailMeta = {
  metadata?: {
    headers?: Record<string, string>;
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
}

function makeWorkItem(draft: GroupDraft): WorkItem {
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
  }, baseSources.filter((source) => source.kind === "master_data" || source.kind === "index_csv"));

  addDraft(groups, {
    kind: "bank_group",
    groupKey: "base-bank-ledger",
    sourceIds: [],
    normalizedPaths: [],
    reason: "Historical bank CSV/XML files are processed together for transaction reconciliation.",
    assignedProcessor: "invoice_bank_reconciler",
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
    }, daySources);
  }

  return [...groups.values()].map(makeWorkItem).sort((a, b) => a.workItemId.localeCompare(b.workItemId));
}

export async function writeWorkQueue(workItems: WorkItem[]) {
  await writeJsonLines(WORK_QUEUE_PATH, workItems);
}
