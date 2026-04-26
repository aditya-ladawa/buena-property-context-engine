import path from "node:path";
import { LATEST_CHANGE_SET_PATH, PROPERTY_ID, SCHEMA_VERSION } from "../config";
import type { ChangeSet, EntityIndex, EntityRecord, FactIndex, FactKind, FactRecord } from "../types";
import { sha256Text, writeJson } from "../utils/fs";

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function stableFactFingerprint(fact: FactRecord) {
  const { updatedAt: _updatedAt, ...stable } = fact;
  return sha256Text(JSON.stringify(stable));
}

function sectionForKind(kind: FactKind) {
  if (kind === "property_profile") return "property-profile";
  if (kind === "building") return "buildings";
  if (kind === "unit") return "units";
  if (kind === "owner") return "owners";
  if (kind === "tenant") return "tenants";
  if (kind === "contractor") return "contractors";
  if (kind === "payment") return "financials";
  if (kind === "invoice") return "invoices";
  if (kind === "document" || kind === "decision") return "documents";
  if (kind === "communication" || kind === "communication_event") return "communications-review";
  if (kind === "issue" || kind === "deadline" || kind === "obligation") return "current-open-issues";
  if (kind === "risk" || kind === "review_item") return "risks-needs-review";
  if (kind === "status_change") return "recent-important-changes";
  return "provenance";
}

function changedFactEntities(fact: FactRecord | undefined) {
  if (!fact) return [];
  return uniqueSorted([
    ...(fact.entities ?? []),
    fact.subjectId ?? "",
    fact.primaryEntityId ?? "",
    fact.fromEntityId ?? "",
    fact.toEntityId ?? "",
    PROPERTY_ID,
  ]);
}

function shouldMaterializeEntity(entity: EntityRecord | undefined) {
  return Boolean(entity && ["property", "building", "unit", "owner", "tenant", "contractor", "invoice", "letter"].includes(entity.type));
}

function affectedViews(facts: FactRecord[], entityIndex?: EntityIndex) {
  const views: string[] = [];
  for (const fact of facts) {
    views.push(`contexts/${PROPERTY_ID}/Context.md#${sectionForKind(fact.kind)}`);
    for (const entityId of changedFactEntities(fact).filter((id) => id !== PROPERTY_ID)) {
      if (entityIndex && !shouldMaterializeEntity(entityIndex.entities[entityId])) continue;
      views.push(path.posix.join("contexts", PROPERTY_ID, "entities", `${entityId}.md`));
    }
  }
  if (facts.length > 0) views.push(`contexts/${PROPERTY_ID}/view-manifest.json`);
  return uniqueSorted(views);
}

export function buildChangeSet(previous: FactIndex | undefined, next: FactIndex, now = new Date().toISOString(), entityIndex?: EntityIndex): ChangeSet {
  const previousById = new Map((previous?.facts ?? []).map((fact) => [fact.factId, fact]));
  const nextById = new Map(next.facts.map((fact) => [fact.factId, fact]));
  const addedFactIds: string[] = [];
  const removedFactIds: string[] = [];
  const modifiedFactIds: string[] = [];
  let unchangedFactCount = 0;

  for (const fact of next.facts) {
    const previousFact = previousById.get(fact.factId);
    if (!previousFact) {
      addedFactIds.push(fact.factId);
      continue;
    }
    if (stableFactFingerprint(previousFact) !== stableFactFingerprint(fact)) modifiedFactIds.push(fact.factId);
    else unchangedFactCount += 1;
  }

  for (const fact of previous?.facts ?? []) {
    if (!nextById.has(fact.factId)) removedFactIds.push(fact.factId);
  }

  const changedFacts = uniqueSorted([...addedFactIds, ...modifiedFactIds, ...removedFactIds])
    .map((factId) => nextById.get(factId) ?? previousById.get(factId))
    .filter((fact): fact is FactRecord => Boolean(fact));

  return {
    schemaVersion: SCHEMA_VERSION,
    propertyId: PROPERTY_ID,
    generatedAt: now,
    previousFactCount: previous?.factCount ?? 0,
    nextFactCount: next.factCount,
    addedFactIds: uniqueSorted(addedFactIds),
    removedFactIds: uniqueSorted(removedFactIds),
    modifiedFactIds: uniqueSorted(modifiedFactIds),
    unchangedFactCount,
    changedSourceIds: uniqueSorted(changedFacts.flatMap((fact) => fact.sourceIds)),
    changedEntities: uniqueSorted(changedFacts.flatMap(changedFactEntities)),
    affectedViews: affectedViews(changedFacts, entityIndex),
  };
}

export async function writeChangeSet(changeSet: ChangeSet) {
  await writeJson(LATEST_CHANGE_SET_PATH, changeSet);
}
