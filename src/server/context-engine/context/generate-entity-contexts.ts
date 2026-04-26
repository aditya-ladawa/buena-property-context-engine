import path from "node:path";
import { ENTITY_CONTEXTS_ROOT, PROPERTY_ID, VIEW_MANIFEST_PATH } from "../config";
import type { EntityContextSummary, EntityIndex, EntityRecord, FactIndex, FactRecord } from "../types";
import { safeFileStem, writeJson, writeText } from "../utils/fs";

function field(record: EntityRecord | undefined, key: string) {
  const value = record?.canonicalFields[key];
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function table(headers: string[], rows: string[][]) {
  if (rows.length === 0) return "_No facts available yet._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replace(/\|/g, "\\|")).join(" | ")} |`),
  ].join("\n");
}

function sourceRef(fact: FactRecord | undefined) {
  if (!fact || fact.sourceIds.length === 0) return "";
  return `[${fact.sourceIds.slice(0, 4).join(", ")}${fact.sourceIds.length > 4 ? ", ..." : ""}]`;
}

function factDate(fact: FactRecord) {
  const date = fact.eventDate ?? fact.dueDate ?? fact.validFrom ?? "";
  return Number.isNaN(Date.parse(date)) ? 0 : Date.parse(date);
}

function factsForEntity(facts: FactRecord[], entityId: string) {
  return facts
    .filter((fact) => fact.subjectId === entityId || fact.primaryEntityId === entityId || fact.entities.includes(entityId) || fact.fromEntityId === entityId || fact.toEntityId === entityId)
    .sort((a, b) => factDate(b) - factDate(a) || a.factId.localeCompare(b.factId));
}

function entitiesByType(entityIndex: EntityIndex, type: EntityRecord["type"]) {
  return Object.values(entityIndex.entities).filter((entity) => entity.type === type).sort((a, b) => a.id.localeCompare(b.id));
}

function relatedEntityRows(entity: EntityRecord, entityIndex: EntityIndex) {
  const related = new Map<string, EntityRecord>();
  for (const relatedId of entity.relatedEntityIds) {
    const record = entityIndex.entities[relatedId];
    if (record) related.set(record.id, record);
  }

  if (entity.type === "building") {
    for (const unit of entitiesByType(entityIndex, "unit")) {
      if (field(unit, "haus_id") === entity.id) related.set(unit.id, unit);
    }
  }

  if (entity.type === "unit") {
    for (const owner of entitiesByType(entityIndex, "owner")) {
      const unitIds = Array.isArray(owner.canonicalFields.einheit_ids) ? owner.canonicalFields.einheit_ids : [];
      if (unitIds.includes(entity.id)) related.set(owner.id, owner);
    }
    for (const tenant of entitiesByType(entityIndex, "tenant")) {
      if (field(tenant, "einheit_id") === entity.id) related.set(tenant.id, tenant);
    }
  }

  return [...related.values()]
    .sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`))
    .map((record) => [record.id, record.type, record.displayName]);
}

function evidenceLine(fact: FactRecord) {
  const quote = fact.evidence.find((entry) => entry.quote)?.quote;
  return quote ? quote.replace(/\s+/g, " ").slice(0, 220) : "";
}

function buildEntityContext(entity: EntityRecord, factIndex: FactIndex, entityIndex: EntityIndex) {
  const facts = factsForEntity(factIndex.facts, entity.id);
  const active = facts.filter((fact) => ["issue", "deadline", "obligation", "risk"].includes(fact.kind) || fact.decision !== "keep").slice(0, 40);
  const recent = facts.slice(0, 80);
  return [
    `# Entity Context: ${entity.id}`,
    "",
    `Generated: ${factIndex.generatedAt}`,
    "",
    "This is a generated scoped materialized view. Source of truth remains source-registry, entity-index, observations, fact-index, and patch log.",
    "",
    "## Profile",
    "",
    `- ID: ${entity.id}`,
    `- Type: ${entity.type}`,
    `- Name: ${entity.displayName}`,
    `- Property: ${PROPERTY_ID}`,
    "",
    "## Canonical Fields",
    "",
    table(["Field", "Value"], Object.entries(entity.canonicalFields).map(([key, value]) => [key, Array.isArray(value) ? value.join("; ") : String(value ?? "")])),
    "",
    "## Related Entities",
    "",
    table(["ID", "Type", "Name"], relatedEntityRows(entity, entityIndex)),
    "",
    "## Active / Needs Review",
    "",
    table(["Fact", "Kind", "Date", "Decision", "Statement", "Sources"], active.map((fact) => [fact.factId, fact.kind, fact.eventDate ?? fact.dueDate ?? fact.validFrom ?? "", fact.decision, fact.statement, sourceRef(fact)])),
    "",
    "## Related Facts",
    "",
    table(["Fact", "Kind", "Date", "Statement", "Evidence", "Sources"], recent.map((fact) => [fact.factId, fact.kind, fact.eventDate ?? fact.dueDate ?? fact.validFrom ?? "", fact.statement, evidenceLine(fact), sourceRef(fact)])),
    "",
  ].join("\n");
}

function shouldMaterializeEntity(entity: EntityRecord) {
  return ["property", "building", "unit", "owner", "tenant", "contractor", "invoice", "letter"].includes(entity.type);
}

export async function writeEntityContexts(factIndex: FactIndex, entityIndex: EntityIndex, now = new Date().toISOString()): Promise<EntityContextSummary> {
  const entities = Object.values(entityIndex.entities).filter(shouldMaterializeEntity).sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`));
  const viewEntries = [];
  for (const entity of entities) {
    const fileName = `${safeFileStem(entity.id)}.md`;
    const absolutePath = path.join(ENTITY_CONTEXTS_ROOT, fileName);
    const relativePath = path.posix.join("contexts", PROPERTY_ID, "entities", fileName);
    const facts = factsForEntity(factIndex.facts, entity.id);
    await writeText(absolutePath, buildEntityContext(entity, factIndex, entityIndex));
    viewEntries.push({
      view: relativePath,
      entityId: entity.id,
      entityType: entity.type,
      dependsOnFactIds: facts.map((fact) => fact.factId),
      dependsOnEntities: uniqueSorted([entity.id, ...facts.flatMap((fact) => fact.entities)]),
      generatedAt: now,
    });
  }

  await writeJson(VIEW_MANIFEST_PATH, {
    generatedAt: now,
    propertyId: PROPERTY_ID,
    views: [
      { view: path.posix.join("contexts", PROPERTY_ID, "Context.md"), entityId: PROPERTY_ID, entityType: "property", generatedAt: now },
      ...viewEntries,
    ],
  });

  return {
    generatedAt: now,
    propertyId: PROPERTY_ID,
    entityCount: entities.length,
    writtenEntityContexts: entities.length,
    contextRoot: path.posix.join("contexts", PROPERTY_ID, "entities"),
  };
}
