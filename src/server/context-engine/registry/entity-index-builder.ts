import { readFile } from "node:fs/promises";
import path from "node:path";
import { ENTITY_INDEX_PATH, PROJECT_ROOT, PROPERTY_ID, SCHEMA_VERSION } from "../config";
import type { EntityAlias, EntityIndex, EntityRecord, EntityType, SourceRegistry } from "../types";
import { parseCsv } from "../utils/csv";
import { writeJson } from "../utils/fs";

type Stammdaten = {
  liegenschaft?: Record<string, unknown> & { id?: string; name?: string; strasse?: string; plz?: string; ort?: string; verwalter_email?: string; weg_bankkonto_iban?: string };
  gebaeude?: (Record<string, unknown> & { id: string; hausnr?: string })[];
  einheiten?: (Record<string, unknown> & { id: string; haus_id?: string; einheit_nr?: string })[];
  eigentuemer?: (Record<string, unknown> & { id: string; vorname?: string; nachname?: string; firma?: string | null; email?: string; telefon?: string; iban?: string; einheit_ids?: string[] })[];
  mieter?: (Record<string, unknown> & { id: string; vorname?: string; nachname?: string; email?: string; telefon?: string; iban?: string; einheit_id?: string; eigentuemer_id?: string })[];
  dienstleister?: (Record<string, unknown> & { id: string; firma?: string; branche?: string; ansprechpartner?: string; email?: string; telefon?: string; iban?: string })[];
};

function present(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function personName(record: { vorname?: string; nachname?: string; firma?: string | null }) {
  if (present(record.firma)) return record.firma;
  return [record.vorname, record.nachname].filter(present).join(" ");
}

function addAlias(index: EntityIndex, alias: EntityAlias) {
  const key = alias.alias.trim().toLowerCase();
  if (!key) return;
  const aliases = index.aliases[key] ?? [];
  if (!aliases.some((existing) => existing.entityId === alias.entityId && existing.alias === alias.alias && existing.aliasType === alias.aliasType)) {
    aliases.push(alias);
  }
  index.aliases[key] = aliases;
}

function addEntity(index: EntityIndex, entity: EntityRecord) {
  index.entities[entity.id] = {
    ...entity,
    relatedEntityIds: [...new Set(entity.relatedEntityIds.filter(Boolean))],
  };
  const source = sourceForType(entity.type);
  addAlias(index, { entityId: entity.id, alias: entity.id, aliasType: "id", source });
  addAlias(index, { entityId: entity.id, alias: entity.displayName, aliasType: "name", source });
}

function sourceForType(type: EntityType): EntityAlias["source"] {
  return ["invoice", "email", "letter", "transaction"].includes(type) ? "index_csv" : "stammdaten";
}

function addFieldAlias(index: EntityIndex, entityId: string, alias: unknown, aliasType: EntityAlias["aliasType"], type: EntityType) {
  if (!present(alias)) return;
  addAlias(index, { entityId, alias, aliasType, source: sourceForType(type) });
}

async function addIndexCsvEntities(index: EntityIndex, registry: SourceRegistry) {
  const indexSources = registry.sources.filter((source) => source.status !== "deleted" && source.kind === "index_csv");
  for (const source of indexSources) {
    const raw = await readFile(path.join(PROJECT_ROOT, source.rawPath), "utf8");
    const rows = parseCsv(raw);
    const fileName = path.posix.basename(source.rawPath);

    for (const row of rows) {
      if (fileName === "emails_index.csv" && present(row.id)) {
        addEntity(index, {
          id: row.id,
          type: "email",
          displayName: row.subject || row.id,
          canonicalFields: { ...row, sourceId: row.id, rawPath: source.rawPath },
          relatedEntityIds: [],
        });
        addFieldAlias(index, row.id, row.thread_id, "thread_id", "email");
        addFieldAlias(index, row.id, row.filename, "filename", "email");
      }

      if (fileName === "rechnungen_index.csv" && present(row.id)) {
        addEntity(index, {
          id: row.id,
          type: "invoice",
          displayName: row.rechnungsnr || row.id,
          canonicalFields: { ...row, sourceId: row.id, rawPath: source.rawPath },
          relatedEntityIds: [row.dienstleister_id].filter(present),
        });
        addFieldAlias(index, row.id, row.rechnungsnr, "invoice_number", "invoice");
        addFieldAlias(index, row.id, row.filename, "filename", "invoice");
      }

      if (fileName === "bank_index.csv" && present(row.id)) {
        addEntity(index, {
          id: row.id,
          type: "transaction",
          displayName: `${row.datum ?? ""} ${row.gegen_name ?? ""} ${row.betrag ?? ""}`.trim() || row.id,
          canonicalFields: { ...row, sourceId: row.id, rawPath: source.rawPath },
          relatedEntityIds: [row.referenz_id].filter(present),
        });
      }
    }
  }
}

function addDocumentEntitiesFromRegistry(index: EntityIndex, registry: SourceRegistry) {
  for (const source of registry.sources) {
    if (["deleted", "ignored", "duplicate"].includes(source.status)) continue;
    const fileName = path.posix.basename(source.rawPath);
    const emailId = source.declaredIds.find((id) => id.startsWith("EMAIL-"));
    const invoiceId = source.declaredIds.find((id) => id.startsWith("INV-"));
    const contractorIds = source.declaredIds.filter((id) => id.startsWith("DL-"));
    const letterId = source.declaredIds.find((id) => id.startsWith("LTR-"));

    if (emailId && !index.entities[emailId]) {
      addEntity(index, {
        id: emailId,
        type: "email",
        displayName: fileName,
        canonicalFields: { sourceId: source.sourceId, rawPath: source.rawPath, sourceDate: source.sourceDate },
        relatedEntityIds: [],
      });
      addFieldAlias(index, emailId, fileName, "filename", "email");
    }

    if (invoiceId && !index.entities[invoiceId]) {
      addEntity(index, {
        id: invoiceId,
        type: "invoice",
        displayName: fileName,
        canonicalFields: { sourceId: source.sourceId, rawPath: source.rawPath, sourceDate: source.sourceDate },
        relatedEntityIds: contractorIds,
      });
      addFieldAlias(index, invoiceId, fileName, "filename", "invoice");
    }

    if (letterId && !index.entities[letterId]) {
      addEntity(index, {
        id: letterId,
        type: "letter",
        displayName: fileName,
        canonicalFields: { sourceId: source.sourceId, rawPath: source.rawPath, sourceDate: source.sourceDate },
        relatedEntityIds: [],
      });
      addFieldAlias(index, letterId, fileName, "filename", "letter");
    }
  }
}

export async function buildEntityIndex(registry: SourceRegistry, now = new Date().toISOString()): Promise<EntityIndex> {
  const stammdatenPath = path.join(PROJECT_ROOT, "data/stammdaten/stammdaten.json");
  const stammdaten = JSON.parse(await readFile(stammdatenPath, "utf8")) as Stammdaten;
  const index: EntityIndex = {
    schemaVersion: SCHEMA_VERSION,
    propertyId: PROPERTY_ID,
    generatedAt: now,
    entities: {},
    aliases: {},
    stats: {},
  };

  const liegenschaft = stammdaten.liegenschaft;
  if (liegenschaft?.id) {
    addEntity(index, {
      id: liegenschaft.id,
      type: "property",
      displayName: liegenschaft.name ?? liegenschaft.id,
      canonicalFields: liegenschaft,
      relatedEntityIds: stammdaten.gebaeude?.map((building) => building.id) ?? [],
    });
    addFieldAlias(index, liegenschaft.id, [liegenschaft.strasse, liegenschaft.plz, liegenschaft.ort].filter(present).join(", "), "address", "property");
    addFieldAlias(index, liegenschaft.id, liegenschaft.verwalter_email, "email", "property");
    addFieldAlias(index, liegenschaft.id, liegenschaft.weg_bankkonto_iban, "iban", "property");
  }

  for (const building of stammdaten.gebaeude ?? []) {
    addEntity(index, {
      id: building.id,
      type: "building",
      displayName: `Haus ${building.hausnr ?? building.id}`,
      canonicalFields: building,
      relatedEntityIds: [PROPERTY_ID],
    });
    addFieldAlias(index, building.id, `Haus ${building.hausnr ?? ""}`, "address", "building");
  }

  for (const unit of stammdaten.einheiten ?? []) {
    addEntity(index, {
      id: unit.id,
      type: "unit",
      displayName: `${unit.einheit_nr ?? unit.id} ${unit.haus_id ?? ""}`.trim(),
      canonicalFields: unit,
      relatedEntityIds: [unit.haus_id].filter(present),
    });
    addFieldAlias(index, unit.id, unit.einheit_nr, "unit_number", "unit");
  }

  for (const owner of stammdaten.eigentuemer ?? []) {
    const displayName = personName(owner) || owner.id;
    addEntity(index, {
      id: owner.id,
      type: "owner",
      displayName,
      canonicalFields: owner,
      relatedEntityIds: owner.einheit_ids ?? [],
    });
    addFieldAlias(index, owner.id, owner.email, "email", "owner");
    addFieldAlias(index, owner.id, owner.telefon, "phone", "owner");
    addFieldAlias(index, owner.id, owner.iban, "iban", "owner");
  }

  for (const tenant of stammdaten.mieter ?? []) {
    const displayName = personName(tenant) || tenant.id;
    addEntity(index, {
      id: tenant.id,
      type: "tenant",
      displayName,
      canonicalFields: tenant,
      relatedEntityIds: [tenant.einheit_id, tenant.eigentuemer_id].filter(present),
    });
    addFieldAlias(index, tenant.id, tenant.email, "email", "tenant");
    addFieldAlias(index, tenant.id, tenant.telefon, "phone", "tenant");
    addFieldAlias(index, tenant.id, tenant.iban, "iban", "tenant");
  }

  for (const contractor of stammdaten.dienstleister ?? []) {
    addEntity(index, {
      id: contractor.id,
      type: "contractor",
      displayName: contractor.firma ?? contractor.id,
      canonicalFields: contractor,
      relatedEntityIds: [],
    });
    addFieldAlias(index, contractor.id, contractor.email, "email", "contractor");
    addFieldAlias(index, contractor.id, contractor.telefon, "phone", "contractor");
    addFieldAlias(index, contractor.id, contractor.iban, "iban", "contractor");
    addFieldAlias(index, contractor.id, contractor.ansprechpartner, "name", "contractor");
  }

  await addIndexCsvEntities(index, registry);
  addDocumentEntitiesFromRegistry(index, registry);

  index.stats = Object.values(index.entities).reduce<Record<string, number>>((stats, entity) => {
    stats[entity.type] = (stats[entity.type] ?? 0) + 1;
    return stats;
  }, {});

  return index;
}

export async function writeEntityIndex(index: EntityIndex) {
  await writeJson(ENTITY_INDEX_PATH, index);
}
