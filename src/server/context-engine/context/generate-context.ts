import { readFile } from "node:fs/promises";
import { CONTEXT_MD_PATH, PATCH_LOG_PATH, PROPERTY_ID } from "../config";
import type { ContextSection, EntityIndex, EntityRecord, FactIndex, FactRecord, PatchLogEntry } from "../types";
import { readJsonLinesIfExists, sha256Text, writeJsonLines, writeText } from "../utils/fs";

export type ContextGenerationSummary = {
  sectionCount: number;
  patchedSections: number;
  conflictSections: number;
  contextPath: string;
};

function stableId(prefix: string, value: unknown) {
  return `${prefix}-${sha256Text(JSON.stringify(value)).slice(0, 16).toUpperCase()}`;
}

function hashContent(content: string) {
  return sha256Text(content.trimEnd());
}

function field(record: EntityRecord | undefined, key: string) {
  const value = record?.canonicalFields[key];
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function attr(fact: FactRecord | undefined, key: string) {
  const value = fact?.structured[key];
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function sourceRef(fact: FactRecord | undefined) {
  if (!fact || fact.sourceIds.length === 0) return "";
  return `[${fact.sourceIds.slice(0, 4).join(", ")}${fact.sourceIds.length > 4 ? ", ..." : ""}]`;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function byType(entityIndex: EntityIndex, type: EntityRecord["type"]) {
  return Object.values(entityIndex.entities)
    .filter((entity) => entity.type === type)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function factBySubject(facts: FactRecord[]) {
  const map = new Map<string, FactRecord>();
  for (const fact of facts) {
    if (fact.subjectId) map.set(fact.subjectId, fact);
  }
  return map;
}

function table(headers: string[], rows: string[][]) {
  if (rows.length === 0) return "_No facts available yet._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replace(/\|/g, "\\|")).join(" | ")} |`),
  ].join("\n");
}

function makeSection(sectionId: string, title: string, lines: string[], sourceFactIds: string[]): ContextSection {
  const content = [`## ${title}`, "", ...lines].join("\n").trimEnd();
  return {
    sectionId,
    title,
    hash: hashContent(content),
    content,
    sourceFactIds: uniqueSorted(sourceFactIds),
  };
}

function managedSection(section: ContextSection) {
  return [
    `<!-- BCE:SECTION ${section.sectionId} START hash=${section.hash} -->`,
    section.content,
    `<!-- BCE:SECTION ${section.sectionId} END -->`,
  ].join("\n");
}

function parseNumber(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return `${value < 0 ? "-" : ""}${Math.abs(value).toFixed(2)}`;
}

function signedPaymentAmount(payment: FactRecord) {
  const amount = parseNumber(attr(payment, "amount"));
  const type = attr(payment, "type").toLowerCase();
  if (amount < 0) return amount;
  if (type.includes("debit") || type.includes("ueberweisung") || type.includes("überweisung")) return -Math.abs(amount);
  return amount;
}

function dateValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function factDate(fact: FactRecord) {
  return attr(fact, "date") || String((fact.structured.row as Record<string, unknown> | undefined)?.datum ?? "");
}

function buildPropertySection(entityIndex: EntityIndex, factsBySubject: Map<string, FactRecord>) {
  const property = entityIndex.entities[PROPERTY_ID];
  const fact = factsBySubject.get(PROPERTY_ID);
  const address = [field(property, "strasse"), field(property, "plz"), field(property, "ort")].filter(Boolean).join(", ");
  return makeSection("property-profile", "Property Profile", [
    `- Property ID: ${PROPERTY_ID}. Sources: ${sourceRef(fact)}`,
    `- Name: ${field(property, "name") || property?.displayName || PROPERTY_ID}`,
    `- Address: ${address}`,
    `- Built / renovated: ${field(property, "baujahr") || "unknown"} / ${field(property, "sanierung") || "unknown"}`,
    `- Manager: ${field(property, "verwalter")} (${field(property, "verwalter_email")}, ${field(property, "verwalter_telefon")})`,
    `- Operating account: ${field(property, "weg_bankkonto_iban")} ${field(property, "weg_bankkonto_bank")}`,
    `- Reserve account: ${field(property, "ruecklage_iban")}`,
  ], fact ? [fact.factId] : []);
}

function buildBuildingsSection(entityIndex: EntityIndex, factsBySubject: Map<string, FactRecord>) {
  const rows = byType(entityIndex, "building").map((building) => {
    const fact = factsBySubject.get(building.id);
    return [
      building.id,
      `Haus ${field(building, "hausnr")}`,
      field(building, "einheiten"),
      field(building, "etagen"),
      field(building, "fahrstuhl"),
      field(building, "baujahr"),
      sourceRef(fact),
    ];
  });
  return makeSection("buildings", "Buildings", [table(["ID", "Building", "Units", "Floors", "Elevator", "Built", "Sources"], rows)], rows.flatMap((row) => factsBySubject.get(row[0])?.factId ?? []));
}

function buildUnitsSection(entityIndex: EntityIndex, factsBySubject: Map<string, FactRecord>) {
  const rows = byType(entityIndex, "unit").map((unit) => {
    const fact = factsBySubject.get(unit.id);
    return [unit.id, field(unit, "haus_id"), field(unit, "einheit_nr"), field(unit, "lage"), field(unit, "wohnflaeche_qm"), field(unit, "zimmer"), field(unit, "miteigentumsanteil"), sourceRef(fact)];
  });
  return makeSection("units", "Units", [table(["ID", "Building", "Unit", "Location", "sqm", "Rooms", "MEA", "Sources"], rows)], rows.flatMap((row) => factsBySubject.get(row[0])?.factId ?? []));
}

function buildOwnersSection(entityIndex: EntityIndex, factsBySubject: Map<string, FactRecord>) {
  const rows = byType(entityIndex, "owner").map((owner) => {
    const fact = factsBySubject.get(owner.id);
    return [owner.id, owner.displayName, field(owner, "einheit_ids"), field(owner, "selbstnutzer"), field(owner, "beirat"), field(owner, "email"), sourceRef(fact)];
  });
  return makeSection("owners", "Owners", [table(["ID", "Name", "Units", "Self-user", "Board", "Email", "Sources"], rows)], rows.flatMap((row) => factsBySubject.get(row[0])?.factId ?? []));
}

function buildTenantsSection(entityIndex: EntityIndex, factsBySubject: Map<string, FactRecord>) {
  const rows = byType(entityIndex, "tenant").map((tenant) => {
    const fact = factsBySubject.get(tenant.id);
    return [tenant.id, tenant.displayName, field(tenant, "einheit_id"), field(tenant, "eigentuemer_id"), field(tenant, "mietbeginn"), field(tenant, "mietende") || "active", sourceRef(fact)];
  });
  return makeSection("tenants", "Tenants", [table(["ID", "Name", "Unit", "Owner", "Start", "End", "Sources"], rows)], rows.flatMap((row) => factsBySubject.get(row[0])?.factId ?? []));
}

function buildContractorsSection(entityIndex: EntityIndex, factsBySubject: Map<string, FactRecord>) {
  const rows = byType(entityIndex, "contractor").map((contractor) => {
    const fact = factsBySubject.get(contractor.id);
    return [contractor.id, contractor.displayName, field(contractor, "branche"), field(contractor, "ansprechpartner"), field(contractor, "email"), field(contractor, "telefon"), sourceRef(fact)];
  });
  return makeSection("contractors", "Contractors", [table(["ID", "Company", "Trade", "Contact", "Email", "Phone", "Sources"], rows)], rows.flatMap((row) => factsBySubject.get(row[0])?.factId ?? []));
}

function buildFinancialSection(factIndex: FactIndex) {
  const payments = factIndex.facts.filter((fact) => fact.kind === "payment");
  const dates = payments.map(factDate).filter(Boolean).sort();
  let credits = 0;
  let debits = 0;
  const categories = new Map<string, number>();
  for (const payment of payments) {
    const amount = signedPaymentAmount(payment);
    if (amount >= 0) credits += amount;
    else debits += amount;
    const row = payment.structured.row as Record<string, unknown> | undefined;
    const category = String(row?.kategorie ?? row?.Buchungstext ?? attr(payment, "type") ?? "unknown");
    categories.set(category, (categories.get(category) ?? 0) + 1);
  }
  const recent = [...payments]
    .sort((a, b) => dateValue(factDate(b)) - dateValue(factDate(a)))
    .slice(0, 30)
    .map((payment) => [payment.subjectId ?? "", factDate(payment), attr(payment, "type"), money(signedPaymentAmount(payment)), attr(payment, "counterparty"), attr(payment, "reference"), sourceRef(payment)]);
  return makeSection("financials", "Financials", [
    `- Payment facts: ${payments.length}`,
    `- Date range: ${dates[0] ?? "unknown"} to ${dates[dates.length - 1] ?? "unknown"}`,
    `- Approx. positive inflow total: ${credits.toFixed(2)}`,
    `- Approx. negative outflow total: ${debits.toFixed(2)}`,
    `- Categories: ${[...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => `${name} (${count})`).join(", ")}`,
    "",
    "### Recent Payments",
    "",
    table(["TX", "Date", "Type", "Amount", "Counterparty", "Reference", "Sources"], recent),
  ], payments.map((fact) => fact.factId));
}

function buildInvoicesSection(factIndex: FactIndex) {
  const invoices = factIndex.facts.filter((fact) => fact.kind === "invoice").sort((a, b) => dateValue(attr(b, "date")) - dateValue(attr(a, "date")));
  const completeInvoices = invoices.filter((invoice) => attr(invoice, "gross") && attr(invoice, "gross") !== "unknown gross");
  const metadataOnlyInvoices = invoices.filter((invoice) => !attr(invoice, "gross") || attr(invoice, "gross") === "unknown gross");
  const needsReview = invoices.filter((invoice) => invoice.decision !== "keep");
  const recent = invoices.slice(0, 30).map((invoice) => [
    invoice.subjectId ?? "",
    attr(invoice, "date"),
    attr(invoice, "contractorId"),
    attr(invoice, "invoiceNumber"),
    attr(invoice, "gross") === "unknown gross" ? "PDF text pending" : attr(invoice, "gross"),
    invoice.decision,
    sourceRef(invoice),
  ]);
  const reviewRows = needsReview.map((invoice) => [
    invoice.subjectId ?? "",
    attr(invoice, "date"),
    attr(invoice, "contractorId"),
    attr(invoice, "invoiceNumber"),
    attr(invoice, "gross") === "unknown gross" ? "PDF text pending" : attr(invoice, "gross"),
    invoice.decision,
    sourceRef(invoice),
  ]);
  return makeSection("invoices", "Invoices", [
    `- Invoice facts: ${invoices.length}`,
    `- Amount available from structured index: ${completeInvoices.length}`,
    `- Metadata-only PDF invoices pending text extraction: ${metadataOnlyInvoices.length}`,
    `- Review/anomaly candidates: ${needsReview.length}`,
    "- Complete invoice ledger is in contexts/LIE-001/fact-index.json; Context.md shows review items and latest invoices only.",
    "",
    "### Review Candidates",
    "",
    table(["Invoice", "Date", "Contractor", "Number", "Gross", "Decision", "Sources"], reviewRows),
    "",
    "### Latest Invoices",
    "",
    table(["Invoice", "Date", "Contractor", "Number", "Gross", "Decision", "Sources"], recent),
  ], invoices.map((fact) => fact.factId));
}

function buildDocumentsSection(factIndex: FactIndex) {
  const documents = factIndex.facts.filter((fact) => fact.kind === "document").sort((a, b) => dateValue(attr(b, "date")) - dateValue(attr(a, "date")));
  const byType = new Map<string, number>();
  for (const document of documents) byType.set(attr(document, "letterType") || "unknown", (byType.get(attr(document, "letterType") || "unknown") ?? 0) + 1);
  const decisionDocs = documents.filter((document) => Array.isArray(document.structured.decisions) && document.structured.decisions.length > 0);
  const decisionRows = decisionDocs.map((document) => [document.subjectId ?? "", attr(document, "date"), attr(document, "letterType"), (document.structured.decisions as string[]).slice(0, 3).join("; "), sourceRef(document)]);
  const rows = documents.slice(0, 50).map((document) => [document.subjectId ?? "", attr(document, "date"), attr(document, "letterType"), attr(document, "subject"), attr(document, "amount"), sourceRef(document)]);
  return makeSection("documents", "Letters And Documents", [
    `- Document metadata facts: ${documents.length}`,
    `- Documents with extracted meeting decisions: ${decisionDocs.length}`,
    `- Types: ${[...byType.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} (${count})`).join(", ")}`,
    `- Table below shows latest ${rows.length}; complete structured facts and extracted text are in fact-index.json and normalized PDF markdown.`,
    "",
    "### Extracted Meeting Decisions",
    "",
    table(["Letter", "Date", "Type", "Decisions", "Sources"], decisionRows),
    "",
    "### Latest Documents",
    "",
    table(["Letter", "Date", "Type", "Subject", "Amount", "Sources"], rows),
  ], documents.map((fact) => fact.factId));
}

function buildCommunicationsSection(factIndex: FactIndex) {
  const communications = factIndex.facts.filter((fact) => fact.kind === "communication").sort((a, b) => dateValue(String((b.structured.glimpse as Record<string, unknown> | undefined)?.dateRange?.[1] ?? "")) - dateValue(String((a.structured.glimpse as Record<string, unknown> | undefined)?.dateRange?.[1] ?? "")));
  const highSignalPattern = /mangel|schaden|heizung|dach|aufzug|einspruch|sonderumlage|kaution|jahresabrechnung|beschluss|etv|mahnung|kündigung|kuendigung|wasser|reparatur|angebot/i;
  const highSignal = communications.filter((fact) => highSignalPattern.test(fact.statement) || highSignalPattern.test(JSON.stringify(fact.structured))).slice(0, 100);
  const rows = highSignal.map((fact) => {
    const glimpse = fact.structured.glimpse as Record<string, unknown> | undefined;
    const dateRange = Array.isArray(glimpse?.dateRange) ? glimpse.dateRange.join(" to ") : "";
    const preview = glimpse?.preview as Record<string, unknown> | undefined;
    return [fact.subjectId ?? fact.factId, dateRange, Array.isArray(preview?.subjects) ? preview.subjects.join("; ") : fact.statement, fact.decision, sourceRef(fact)];
  });
  return makeSection("communications-review", "Communications Needing Review", [
    `- Communication metadata facts: ${communications.length}`,
    `- High-signal review candidates shown: ${rows.length}`,
    `- These are header/glimpse facts only. Body-level semantic extraction is the next LLM step.`,
    "",
    table(["Thread/Fact", "Date range", "Subject", "Decision", "Sources"], rows),
  ], communications.map((fact) => fact.factId));
}

function buildProvenanceSection(factIndex: FactIndex) {
  const stats = Object.entries(factIndex.stats).sort((a, b) => a[0].localeCompare(b[0]));
  return makeSection("provenance", "Provenance And Source Of Truth", [
    "- Context.md is a materialized view, not the source of truth.",
    "- Source registry: contexts/LIE-001/source-registry.json",
    "- Entity index: contexts/LIE-001/entity-index.json",
    "- Fact index: contexts/LIE-001/fact-index.json",
    "- Observations: workdir/observations/observations.jsonl",
    "- Patch log: contexts/LIE-001/patch-log.jsonl",
    "",
    table(["Fact kind", "Count"], stats.map(([kind, count]) => [kind, String(count)])),
  ], factIndex.facts.map((fact) => fact.factId));
}

export function buildContextSections(factIndex: FactIndex, entityIndex: EntityIndex): ContextSection[] {
  const subjects = factBySubject(factIndex.facts);
  return [
    buildPropertySection(entityIndex, subjects),
    buildBuildingsSection(entityIndex, subjects),
    buildUnitsSection(entityIndex, subjects),
    buildOwnersSection(entityIndex, subjects),
    buildTenantsSection(entityIndex, subjects),
    buildContractorsSection(entityIndex, subjects),
    buildFinancialSection(factIndex),
    buildInvoicesSection(factIndex),
    buildDocumentsSection(factIndex),
    buildCommunicationsSection(factIndex),
    buildProvenanceSection(factIndex),
  ];
}

function initialContext(factIndex: FactIndex, sections: ContextSection[]) {
  return [
    `# Context: ${PROPERTY_ID}`,
    "",
    `Generated: ${factIndex.generatedAt}`,
    "",
    "This file is a dense materialized view for agents. The source of truth is the structured artifact chain: source registry, entity index, observations, fact index, and patch log.",
    "",
    "Human notes can be added outside BCE managed sections. Managed sections are bounded by BCE markers and carry content hashes for surgical updates.",
    "",
    ...sections.map(managedSection),
    "",
  ].join("\n");
}

function sectionRegex(sectionId: string) {
  return new RegExp(`<!-- BCE:SECTION ${sectionId} START hash=([a-f0-9]+) -->\\n([\\s\\S]*?)\\n<!-- BCE:SECTION ${sectionId} END -->`, "m");
}

async function readTextIfExists(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function patchEntry(section: ContextSection, beforeHash: string | undefined, now: string, reason: string, status: PatchLogEntry["status"] = "applied", expectedBeforeHash?: string): PatchLogEntry {
  return {
    patchId: stableId("PATCH", { sectionId: section.sectionId, beforeHash, expectedBeforeHash, afterHash: section.hash, status, now }),
    propertyId: PROPERTY_ID,
    sectionId: section.sectionId,
    status,
    beforeHash,
    expectedBeforeHash,
    afterHash: section.hash,
    reason,
    sourceFactIds: section.sourceFactIds,
    createdAt: now,
  };
}

function mergeManagedSections(existing: string | undefined, factIndex: FactIndex, sections: ContextSection[], now: string) {
  if (!existing) {
    return {
      markdown: initialContext(factIndex, sections),
      conflicts: 0,
      patches: sections.map((section) => patchEntry(section, undefined, now, "Initial Context.md generation")),
    };
  }

  let markdown = existing;
  const patches: PatchLogEntry[] = [];
  let conflicts = 0;
  for (const section of sections) {
    const next = managedSection(section);
    const regex = sectionRegex(section.sectionId);
    const match = markdown.match(regex);
    if (!match) {
      markdown = `${markdown.trimEnd()}\n\n${next}\n`;
      patches.push(patchEntry(section, undefined, now, "Added missing managed section"));
      continue;
    }

    const markerHash = match[1];
    const existingContent = match[2].trimEnd();
    const existingHash = hashContent(existingContent);
    if (existingHash !== markerHash) {
      conflicts += 1;
      patches.push(patchEntry(section, existingHash, now, "Skipped managed section update because existing section content hash does not match marker; possible human edit inside managed block", "conflict", markerHash));
      continue;
    }

    if (match[0] === next) continue;
    markdown = markdown.replace(regex, next);
    patches.push(patchEntry(section, markerHash, now, "Regenerated managed section from fact-index"));
  }
  return { markdown, patches, conflicts };
}

export async function writeContextMarkdown(factIndex: FactIndex, entityIndex: EntityIndex, now = new Date().toISOString()): Promise<ContextGenerationSummary> {
  const sections = buildContextSections(factIndex, entityIndex);
  const existing = await readTextIfExists(CONTEXT_MD_PATH);
  const { markdown, patches, conflicts } = mergeManagedSections(existing, factIndex, sections, now);
  await writeText(CONTEXT_MD_PATH, markdown.endsWith("\n") ? markdown : `${markdown}\n`);

  if (patches.length > 0) {
    const previousPatches = await readJsonLinesIfExists<PatchLogEntry>(PATCH_LOG_PATH);
    await writeJsonLines(PATCH_LOG_PATH, [...previousPatches, ...patches]);
  } else {
    const previousPatches = await readJsonLinesIfExists<PatchLogEntry>(PATCH_LOG_PATH);
    await writeJsonLines(PATCH_LOG_PATH, previousPatches);
  }

  return {
    sectionCount: sections.length,
    patchedSections: patches.filter((patch) => patch.status === "applied").length,
    conflictSections: conflicts,
    contextPath: "contexts/LIE-001/Context.md",
  };
}
