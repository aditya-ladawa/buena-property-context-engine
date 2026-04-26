import { readFile } from "node:fs/promises";
import path from "node:path";
import { ENTITY_LINK_SUMMARY_PATH, ENTITY_LINKS_PATH, PROJECT_ROOT, PROPERTY_ID } from "../config";
import type { EntityIndex, EntityLinkCandidate, EntityLinkRecord, EntityLinkSummary, EntityRecord, SourceRegistry, SourceRegistryEntry, WorkItem } from "../types";
import { sha256Text, writeJson, writeJsonLines } from "../utils/fs";

type LinkArtifacts = {
  records: EntityLinkRecord[];
  sourceRecords: EntityLinkRecord[];
  workItemRecords: EntityLinkRecord[];
  summary: EntityLinkSummary;
};

type SearchAlias = {
  entityId: string;
  alias: string;
  normalizedAlias: string;
  matchType: EntityLinkCandidate["matchType"];
};

function stableId(prefix: string, value: unknown) {
  return `${prefix}-${sha256Text(JSON.stringify(value)).slice(0, 16).toUpperCase()}`;
}

function normalizeSearch(value: string) {
  return value
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string, maxLength = 60_000) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function candidateKey(candidate: EntityLinkCandidate) {
  return `${candidate.entityId}:${candidate.matchType}:${candidate.inheritedFrom ?? ""}:${candidate.evidence}`;
}

function addCandidate(candidates: Map<string, EntityLinkCandidate>, entityIndex: EntityIndex, candidate: Omit<EntityLinkCandidate, "entityType">) {
  const entity = entityIndex.entities[candidate.entityId];
  if (!entity) return;
  const next: EntityLinkCandidate = {
    ...candidate,
    entityType: entity.type,
    sourceIds: uniqueSorted(candidate.sourceIds),
  };
  candidates.set(candidateKey(next), next);
}

async function readNormalizedText(source: SourceRegistryEntry) {
  const pieces = [source.rawPath, source.sourceDate ?? "", ...source.declaredIds];
  for (const normalizedPath of source.normalizedPaths) {
    try {
      pieces.push(await readFile(path.join(PROJECT_ROOT, normalizedPath), "utf8"));
    } catch {
      // Missing normalized artifacts are reported by coverage; linker stays best-effort.
    }
  }
  return compactText(pieces.join("\n"));
}

function buildSearchAliases(entityIndex: EntityIndex): SearchAlias[] {
  const aliases: SearchAlias[] = [];
  for (const aliasGroup of Object.values(entityIndex.aliases)) {
    for (const alias of aliasGroup) {
      if (alias.aliasType === "id" || alias.aliasType === "filename") continue;
      const normalizedAlias = normalizeSearch(alias.alias);
      if (!normalizedAlias) continue;
      const usefulShortAlias = alias.aliasType === "email" || alias.aliasType === "iban";
      if (!usefulShortAlias && normalizedAlias.length < 5) continue;
      aliases.push({
        entityId: alias.entityId,
        alias: alias.alias,
        normalizedAlias,
        matchType: alias.aliasType === "email" ? "email" : "alias",
      });
    }
  }
  return aliases.sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length);
}

function directEntityMentions(text: string) {
  return text.match(/\b(?:LIE|HAUS|EH|EIG|MIE|DL|TX|INV|EMAIL|LTR)-[A-Z0-9-]*\d+\b/g) ?? [];
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function dateWithin(sourceDate: string | undefined, validFrom: string | undefined, validTo: string | undefined) {
  if (!sourceDate) return true;
  const date = Date.parse(sourceDate);
  if (Number.isNaN(date)) return true;
  const from = validFrom ? Date.parse(validFrom) : undefined;
  const to = validTo ? Date.parse(validTo) : undefined;
  if (from && !Number.isNaN(from) && date < from) return false;
  if (to && !Number.isNaN(to) && date > to) return false;
  return true;
}

function propagateRelated(candidates: Map<string, EntityLinkCandidate>, entityIndex: EntityIndex, source: SourceRegistryEntry) {
  const queue = [...candidates.values()];
  const seen = new Set(queue.map((candidate) => candidate.entityId));

  for (const candidate of queue) {
    const entity = entityIndex.entities[candidate.entityId];
    if (!entity) continue;
    const valid = entity.type !== "tenant" || dateWithin(source.sourceDate, asString(entity.canonicalFields.mietbeginn), asString(entity.canonicalFields.mietende));
    const related = valid ? entity.relatedEntityIds : [];
    for (const relatedEntityId of related) {
      if (!entityIndex.entities[relatedEntityId]) continue;
      addCandidate(candidates, entityIndex, {
        entityId: relatedEntityId,
        matchType: "relationship",
        reason: `Related to ${candidate.entityId} through canonical entity graph${entity.type === "tenant" ? " valid on source date" : ""}.`,
        evidence: `${candidate.entityId} -> ${relatedEntityId}`,
        sourceIds: candidate.sourceIds,
        inheritedFrom: candidate.entityId,
      });
      if (!seen.has(relatedEntityId)) {
        seen.add(relatedEntityId);
        const relatedEntity = entityIndex.entities[relatedEntityId];
        if (relatedEntity) queue.push({ ...candidate, entityId: relatedEntityId, entityType: relatedEntity.type, inheritedFrom: candidate.entityId });
      }
    }

    if (entity.type === "building" && entity.id !== PROPERTY_ID) {
      addCandidate(candidates, entityIndex, {
        entityId: PROPERTY_ID,
        matchType: "relationship",
        reason: `Building ${entity.id} belongs to property ${PROPERTY_ID}.`,
        evidence: `${entity.id} -> ${PROPERTY_ID}`,
        sourceIds: candidate.sourceIds,
        inheritedFrom: entity.id,
      });
    }
  }
}

function decide(candidates: EntityLinkCandidate[]) {
  const substantive = candidates.filter((candidate) => !["property", "email", "letter"].includes(candidate.entityType));
  if (substantive.length > 0) return { decision: "linked" as const, reason: `Linked to ${substantive.length} substantive entity candidate(s).` };
  if (candidates.some((candidate) => candidate.entityId === PROPERTY_ID)) return { decision: "property_only" as const, reason: "Only property-level scope was established." };
  return { decision: "unlinked" as const, reason: "No deterministic entity link was found." };
}

async function linkSource(source: SourceRegistryEntry, entityIndex: EntityIndex, aliases: SearchAlias[], now: string): Promise<EntityLinkRecord> {
  const candidates = new Map<string, EntityLinkCandidate>();
  addCandidate(candidates, entityIndex, {
    entityId: PROPERTY_ID,
    matchType: "property_scope",
    reason: "Source registry property scope.",
    evidence: source.propertyId,
    sourceIds: [source.sourceId],
  });

  for (const declaredId of source.declaredIds) {
    addCandidate(candidates, entityIndex, {
      entityId: declaredId,
      matchType: "declared_id",
      reason: "Source declared ID matches canonical entity ID.",
      evidence: declaredId,
      sourceIds: [source.sourceId],
    });
  }

  const text = await readNormalizedText(source);
  for (const entityId of directEntityMentions(text)) {
    addCandidate(candidates, entityIndex, {
      entityId,
      matchType: "declared_id",
      reason: "Source text contains canonical entity ID.",
      evidence: entityId,
      sourceIds: [source.sourceId],
    });
  }

  const normalizedText = normalizeSearch(text);
  for (const alias of aliases) {
    if (!normalizedText.includes(alias.normalizedAlias)) continue;
    addCandidate(candidates, entityIndex, {
      entityId: alias.entityId,
      matchType: alias.matchType,
      reason: `Normalized source text matched ${alias.matchType} alias.`,
      evidence: alias.alias,
      sourceIds: [source.sourceId],
    });
  }

  propagateRelated(candidates, entityIndex, source);
  const candidateLinks = [...candidates.values()].sort((a, b) => `${a.entityType}:${a.entityId}:${a.matchType}`.localeCompare(`${b.entityType}:${b.entityId}:${b.matchType}`));
  const { decision, reason } = decide(candidateLinks);
  return {
    recordId: stableId("EL", { targetType: "source", sourceId: source.sourceId, candidates: candidateLinks.map((candidate) => candidateKey(candidate)) }),
    propertyId: PROPERTY_ID,
    targetType: "source",
    sourceId: source.sourceId,
    sourceIds: [source.sourceId],
    sourceDate: source.sourceDate,
    candidateLinks,
    decision,
    reason,
    createdAt: now,
  };
}

function aggregateWorkItem(workItem: WorkItem, sourceRecords: EntityLinkRecord[], entityIndex: EntityIndex, now: string): EntityLinkRecord {
  const candidates = new Map<string, EntityLinkCandidate>();
  for (const record of sourceRecords) {
    for (const candidate of record.candidateLinks) {
      const entity = entityIndex.entities[candidate.entityId];
      if (!entity) continue;
      const existing = [...candidates.values()].find((item) => item.entityId === candidate.entityId && item.matchType === candidate.matchType && item.inheritedFrom === candidate.inheritedFrom);
      if (existing) {
        existing.sourceIds = uniqueSorted([...existing.sourceIds, ...candidate.sourceIds]);
        continue;
      }
      addCandidate(candidates, entityIndex, {
        entityId: candidate.entityId,
        matchType: candidate.matchType === "property_scope" ? "property_scope" : "work_item_aggregate",
        reason: candidate.matchType === "property_scope" ? candidate.reason : `Aggregated from source-level ${candidate.matchType} link in work item ${workItem.workItemId}.`,
        evidence: candidate.evidence,
        sourceIds: candidate.sourceIds,
        inheritedFrom: candidate.inheritedFrom,
      });
    }
  }
  const candidateLinks = [...candidates.values()].sort((a, b) => `${a.entityType}:${a.entityId}:${a.matchType}`.localeCompare(`${b.entityType}:${b.entityId}:${b.matchType}`));
  const { decision, reason } = decide(candidateLinks);
  return {
    recordId: stableId("EL", { targetType: "work_item", workItemId: workItem.workItemId, candidates: candidateLinks.map((candidate) => candidateKey(candidate)) }),
    propertyId: PROPERTY_ID,
    targetType: "work_item",
    workItemId: workItem.workItemId,
    sourceIds: workItem.sourceIds,
    sourceDate: workItem.glimpse.dateRange?.[1] ?? workItem.glimpse.dateRange?.[0],
    candidateLinks,
    decision,
    reason,
    createdAt: now,
  };
}

function makeSummary(records: EntityLinkRecord[], now: string): EntityLinkSummary {
  return {
    generatedAt: now,
    propertyId: PROPERTY_ID,
    sourceRecords: records.filter((record) => record.targetType === "source").length,
    workItemRecords: records.filter((record) => record.targetType === "work_item").length,
    linkedRecords: records.filter((record) => record.decision === "linked").length,
    propertyOnlyRecords: records.filter((record) => record.decision === "property_only").length,
    ambiguousRecords: records.filter((record) => record.decision === "ambiguous").length,
    unlinkedRecords: records.filter((record) => record.decision === "unlinked").length,
    errorRecords: records.filter((record) => record.decision === "error").length,
  };
}

export async function linkEntities(registry: SourceRegistry, workItems: WorkItem[], entityIndex: EntityIndex, now = new Date().toISOString()): Promise<LinkArtifacts> {
  const aliases = buildSearchAliases(entityIndex);
  const eligibleSources = registry.sources.filter((source) => source.status === "normalized" && source.normalizedPaths.length > 0);
  const sourceRecords: EntityLinkRecord[] = [];

  for (const source of eligibleSources) {
    try {
      sourceRecords.push(await linkSource(source, entityIndex, aliases, now));
    } catch (error) {
      sourceRecords.push({
        recordId: stableId("EL", { targetType: "source", sourceId: source.sourceId, error: error instanceof Error ? error.message : String(error) }),
        propertyId: PROPERTY_ID,
        targetType: "source",
        sourceId: source.sourceId,
        sourceIds: [source.sourceId],
        sourceDate: source.sourceDate,
        candidateLinks: [],
        decision: "error",
        reason: error instanceof Error ? error.message : String(error),
        createdAt: now,
      });
    }
  }

  const sourceRecordById = new Map(sourceRecords.map((record) => [record.sourceId, record]));
  const workItemRecords = workItems.map((workItem) => aggregateWorkItem(
    workItem,
    workItem.sourceIds.map((sourceId) => sourceRecordById.get(sourceId)).filter((record): record is EntityLinkRecord => Boolean(record)),
    entityIndex,
    now,
  ));

  const records = [...sourceRecords, ...workItemRecords].sort((a, b) => `${a.targetType}:${a.sourceId ?? a.workItemId}`.localeCompare(`${b.targetType}:${b.sourceId ?? b.workItemId}`));
  const summary = makeSummary(records, now);
  await writeJsonLines(ENTITY_LINKS_PATH, records);
  await writeJson(ENTITY_LINK_SUMMARY_PATH, summary);
  return { records, sourceRecords, workItemRecords, summary };
}

export function linkedEntityIds(record: EntityLinkRecord | undefined) {
  return uniqueSorted(record?.candidateLinks.map((candidate) => candidate.entityId) ?? []);
}

export function entityRecordMap(records: EntityLinkRecord[]) {
  return new Map(records.map((record) => [record.workItemId ?? record.sourceId ?? record.recordId, record]));
}
