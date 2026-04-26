import { FACT_INDEX_PATH, PROPERTY_ID, SCHEMA_VERSION } from "../config";
import type { EntityIndex, FactIndex, FactKind, FactRecord, Observation, ObservationDecision } from "../types";
import { sha256Text, writeJson } from "../utils/fs";

function stableId(prefix: string, value: unknown) {
  return `${prefix}-${sha256Text(JSON.stringify(value)).slice(0, 16).toUpperCase()}`;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function uniqueEvidence<T>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function factKindForEntityType(entityType: string | undefined): FactKind {
  if (entityType === "property") return "property_profile";
  if (entityType === "building") return "building";
  if (entityType === "unit") return "unit";
  if (entityType === "owner") return "owner";
  if (entityType === "tenant") return "tenant";
  if (entityType === "contractor") return "contractor";
  return "review_item";
}

function decisionRank(decision: ObservationDecision) {
  if (decision === "keep") return 0;
  if (decision === "needs_review") return 1;
  if (decision === "duplicate") return 2;
  return 3;
}

function betterDecision(current: ObservationDecision, next: ObservationDecision) {
  return decisionRank(next) < decisionRank(current) ? next : current;
}

function factSubject(observation: Observation) {
  const attributes = asRecord(observation.attributes);
  if (observation.kind === "entity_profile") return stringField(attributes, "entityId");
  if (observation.kind === "payment") return stringField(attributes, "transactionId");
  if (observation.kind === "invoice") return stringField(attributes, "invoiceId");
  if (observation.kind === "document_metadata") return stringField(attributes, "letterId");
  if (observation.kind === "communication_metadata") return stringField(attributes, "threadId") ?? observation.workItemId;
  return observation.mentions[0] ?? observation.sourceIds[0];
}

function factKind(observation: Observation): FactKind {
  const attributes = asRecord(observation.attributes);
  if (observation.kind === "entity_profile") return factKindForEntityType(stringField(attributes, "entityType"));
  if (observation.kind === "payment") return "payment";
  if (observation.kind === "invoice") return "invoice";
  if (observation.kind === "document_metadata") return "document";
  if (observation.kind === "communication_metadata") return "communication";
  if (observation.kind === "source_bundle") return "source_bundle";
  return "review_item";
}

function factKey(observation: Observation) {
  const kind = factKind(observation);
  const subjectId = factSubject(observation);
  return `${kind}:${subjectId ?? observation.observationId}`;
}

function canonicalStructured(observation: Observation, entityIndex: EntityIndex) {
  const attributes = asRecord(observation.attributes);
  const entityId = stringField(attributes, "entityId");
  if (entityId && entityIndex.entities[entityId]) {
    return {
      ...attributes,
      canonicalEntity: entityIndex.entities[entityId],
    };
  }
  return attributes;
}

function makeFact(observation: Observation, entityIndex: EntityIndex, now: string): FactRecord {
  const kind = factKind(observation);
  const subjectId = factSubject(observation);
  return {
    factId: stableId("FACT", { kind, subjectId, statement: observation.statement }),
    propertyId: PROPERTY_ID,
    kind,
    subjectId,
    statement: observation.statement,
    structured: canonicalStructured(observation, entityIndex),
    sourceObservationIds: [observation.observationId],
    sourceIds: uniqueSorted(observation.sourceIds),
    mentions: uniqueSorted(observation.mentions),
    evidence: uniqueEvidence(observation.evidence),
    decision: observation.decision,
    updatedAt: now,
  };
}

function mergeFact(existing: FactRecord, observation: Observation, entityIndex: EntityIndex, now: string): FactRecord {
  const structured = canonicalStructured(observation, entityIndex);
  return {
    ...existing,
    structured: { ...structured, mergedObservationCount: existing.sourceObservationIds.length + 1 },
    sourceObservationIds: uniqueSorted([...existing.sourceObservationIds, observation.observationId]),
    sourceIds: uniqueSorted([...existing.sourceIds, ...observation.sourceIds]),
    mentions: uniqueSorted([...existing.mentions, ...observation.mentions]),
    evidence: uniqueEvidence([...existing.evidence, ...observation.evidence]),
    decision: betterDecision(existing.decision, observation.decision),
    updatedAt: now,
  };
}

export function buildFactIndex(observations: Observation[], entityIndex: EntityIndex, now = new Date().toISOString()): FactIndex {
  const byKey = new Map<string, FactRecord>();
  for (const observation of observations) {
    if (observation.decision === "ignore" || observation.decision === "duplicate") continue;
    const key = factKey(observation);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeFact(existing, observation, entityIndex, now) : makeFact(observation, entityIndex, now));
  }

  const facts = [...byKey.values()].sort((a, b) => `${a.kind}:${a.subjectId ?? a.factId}`.localeCompare(`${b.kind}:${b.subjectId ?? b.factId}`));
  const stats = facts.reduce<Record<string, number>>((counts, fact) => {
    counts[fact.kind] = (counts[fact.kind] ?? 0) + 1;
    return counts;
  }, {});

  return {
    schemaVersion: SCHEMA_VERSION,
    propertyId: PROPERTY_ID,
    generatedAt: now,
    factCount: facts.length,
    stats,
    facts,
  };
}

export async function writeFactIndex(factIndex: FactIndex) {
  await writeJson(FACT_INDEX_PATH, factIndex);
}
