import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { PROJECT_ROOT, PROPERTY_ID, SEMANTIC_DECISIONS_PATH, SEMANTIC_OBSERVATIONS_PATH, SEMANTIC_SUMMARY_PATH } from "../config";
import type { EntityIndex, EntityLinkRecord, EntityResolution, EvidenceRef, Observation, ObservationDecision, ObservationKind, SemanticDecisionRecord, SemanticExtractionSummary, SourceRegistry, SourceRegistryEntry, WorkItem } from "../types";
import { readJsonLinesIfExists, sha256Text, writeJson, writeJsonLines } from "../utils/fs";
import type { IngestProgressEvent } from "../cli/ingest";

type SemanticArtifacts = {
  observations: Observation[];
  decisions: SemanticDecisionRecord[];
  summary: SemanticExtractionSummary;
};

type KeywordCategory = {
  weight: number;
  terms: string[];
};

type Progress = (event: IngestProgressEvent) => void;

const SEMANTIC_EXTRACTOR_VERSION = 1;
const DEFAULT_GEMINI_TRIAGE_MODEL = "gemma-4-26b-a4b-it";

const KEYWORDS: Record<string, KeywordCategory> = {
  maintenance: { weight: 5, terms: ["mangel", "schaden", "defekt", "reparatur", "instandsetzung", "wasserschaden", "wasser", "feuchtigkeit", "schimmel", "heizung", "warmwasser", "strom", "tuer", "tür", "fenster", "dach", "keller", "aufzug", "treppenhaus", "sprechanlage", "schloss", "rohr", "leitung", "verstopfung"] },
  dispute: { weight: 7, terms: ["beschwerde", "einspruch", "widerspruch", "streit", "minderung", "mietminderung", "mahnung", "verzug", "rueckstand", "rückstand", "anwalt", "rechtsanwalt", "gericht", "fristsetzung", "kuendigung", "kündigung", "abmahnung", "eskalation", "nicht einverstanden"] },
  finance: { weight: 4, terms: ["rechnung", "zahlung", "bezahlt", "offen", "faellig", "fällig", "ueberweisung", "überweisung", "rueckerstattung", "rückerstattung", "gutschrift", "kaution", "miete", "hausgeld", "wirtschaftsplan", "abrechnung", "jahresabrechnung", "betriebskosten", "nebenkosten", "sonderumlage", "saldo", "iban"] },
  governance: { weight: 4, terms: ["etv", "eigentuemerversammlung", "eigentümerversammlung", "versammlung", "beschluss", "beschlussfassung", "protokoll", "tagesordnung", "top", "beirat", "verwaltung", "vollmacht", "umlaufbeschluss", "mehrheit", "abstimmung"] },
  contractor: { weight: 3, terms: ["angebot", "kostenvoranschlag", "auftrag", "beauftragt", "termin", "besichtigung", "vor ort", "monteur", "handwerker", "dienstleister", "firma", "ausfuehrung", "ausführung", "lieferung", "montage", "rueckmeldung", "rückmeldung"] },
  deadline: { weight: 6, terms: ["frist", "bis zum", "spaetestens", "spätestens", "deadline", "erinnerung", "rueckmeldung bis", "rückmeldung bis", "heute", "morgen", "kommende woche", "naechste woche", "nächste woche"] },
  access: { weight: 3, terms: ["zugang", "schluessel", "schlüssel", "wohnung betreten", "terminvereinbarung", "anwesend", "nicht erreichbar", "mieter", "eigentuemer", "eigentümer"] },
  risk: { weight: 8, terms: ["gefahr", "sicherheit", "brand", "brandschutz", "notfall", "evakuierung", "versicherung", "haftung", "polizei", "gesundheit", "unbewohnbar", "einsturz", "stromausfall"] },
  noise: { weight: -4, terms: ["newsletter", "werbung", "automatische antwort", "abwesenheit", "empfangsbestaetigung", "empfangsbestätigung", "zur kenntnis", "fyi"] },
};

const llmFactSchema = z.object({
  facts: z.array(z.object({
    kind: z.enum(["issue", "decision", "obligation", "deadline", "risk", "status_change", "communication_event"]),
    subtype: z.string().min(1),
    summary: z.string().min(1),
    status: z.enum(["open", "resolved", "unknown", "needs_review"]).default("unknown"),
    priority: z.enum(["low", "medium", "high", "unknown"]).default("unknown"),
    eventDate: z.string().optional(),
    dueDate: z.string().optional(),
    primaryEntityId: z.string().optional(),
    entities: z.array(z.string()).default([]),
    evidence: z.array(z.object({ sourceId: z.string().min(1), quote: z.string().min(1) })).min(1),
    decision: z.enum(["keep", "needs_review", "ignore"]).default("needs_review"),
  })).default([]),
});

function stableId(prefix: string, value: unknown) {
  return `${prefix}-${sha256Text(JSON.stringify(value)).slice(0, 16).toUpperCase()}`;
}

function stableHash(value: unknown) {
  return sha256Text(JSON.stringify(value));
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalizeText(value: string) {
  return value
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .toLowerCase();
}

async function readSourceText(source: SourceRegistryEntry, maxLength = 1_600) {
  const markdownPath = source.normalizedPaths.find((candidate) => candidate.endsWith(".md")) ?? source.normalizedPaths[0];
  if (!markdownPath) return "";
  try {
    const text = await readFile(path.join(PROJECT_ROOT, markdownPath), "utf8");
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  } catch {
    return "";
  }
}

async function readWorkItemText(workItem: WorkItem, sourceById: Map<string, SourceRegistryEntry>, maxTotal = 12_000) {
  const pieces: string[] = [];
  for (const sourceId of workItem.sourceIds.slice(0, 16)) {
    const source = sourceById.get(sourceId);
    if (!source) continue;
    const text = await readSourceText(source);
    pieces.push(`### ${sourceId}\n${text}`);
    if (pieces.join("\n\n").length > maxTotal) break;
  }
  const combined = pieces.join("\n\n");
  return combined.length > maxTotal ? combined.slice(0, maxTotal) : combined;
}

function classify(text: string) {
  const normalized = normalizeText(text);
  const categories: string[] = [];
  let priority = 0;
  for (const [category, config] of Object.entries(KEYWORDS)) {
    if (config.terms.some((term) => normalized.includes(normalizeText(term)))) {
      categories.push(category);
      priority += config.weight;
    }
  }
  return { categories: uniqueSorted(categories), priority };
}

type SemanticModel = {
  client: GoogleGenAI;
  model: string;
};

function workItemInputHash(workItem: WorkItem, linkRecord: EntityLinkRecord | undefined, selectionLimit: number, modelName: string) {
  return stableHash({
    extractorVersion: SEMANTIC_EXTRACTOR_VERSION,
    selectionLimit,
    modelName,
    workItemId: workItem.workItemId,
    sourceIds: workItem.sourceIds,
    normalizedPaths: workItem.normalizedPaths,
    glimpse: workItem.glimpse,
    linkedEntities: linkRecord?.candidateLinks.map((candidate) => [candidate.entityId, candidate.matchType, candidate.inheritedFrom]).sort(),
  });
}

function reusedRecords<T extends { workItemId: string; inputHash: string }>(records: T[]) {
  const grouped = new Map<string, T[]>();
  for (const record of records) grouped.set(`${record.workItemId}:${record.inputHash}`, [...(grouped.get(`${record.workItemId}:${record.inputHash}`) ?? []), record]);
  return grouped;
}

function decisionRecord(params: Omit<SemanticDecisionRecord, "decisionId" | "propertyId" | "createdAt"> & { now: string }): SemanticDecisionRecord {
  return {
    decisionId: stableId("SEMDEC", { workItemId: params.workItemId, inputHash: params.inputHash, decision: params.decision, reason: params.reason }),
    propertyId: PROPERTY_ID,
    workItemId: params.workItemId,
    inputHash: params.inputHash,
    sourceIds: params.sourceIds,
    categories: params.categories,
    decision: params.decision,
    reason: params.reason,
    linkedEntityIds: params.linkedEntityIds,
    createdAt: params.now,
  };
}

function semanticModelName() {
  return process.env.GEMINI_TRIAGE_MODEL ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_TRIAGE_MODEL;
}

function createModel(): SemanticModel | undefined {
  if (!process.env.GEMINI_API_KEY) return undefined;
  return {
    client: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
    model: semanticModelName(),
  };
}

function parseJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("Model did not return a JSON object.");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return JSON.parse(cleaned.slice(start, index + 1));
  }
  throw new Error("Model returned an unterminated JSON object.");
}

function entityList(linkRecord: EntityLinkRecord | undefined, entityIndex: EntityIndex) {
  return (linkRecord?.candidateLinks ?? [])
    .filter((candidate) => entityIndex.entities[candidate.entityId])
    .slice(0, 40)
    .map((candidate) => {
      const entity = entityIndex.entities[candidate.entityId];
      return `- ${candidate.entityId} (${entity.type}, ${entity.displayName}): ${candidate.reason}; evidence=${candidate.evidence}`;
    })
    .join("\n");
}

async function callExtractor(model: SemanticModel, workItem: WorkItem, text: string, linkRecord: EntityLinkRecord | undefined, entityIndex: EntityIndex) {
  const allowedEntities = entityList(linkRecord, entityIndex);
  const systemInstruction = [
        "You extract durable property-management facts from German emails.",
        "Return strict JSON only. No prose, no markdown.",
        "Use only the provided candidate entity IDs. If no entity is clearly supported, use LIE-001 and decision needs_review.",
        "Every fact must have an exact short quote from the source text as evidence.",
        "Ignore greetings, thanks, newsletters, and pure acknowledgements unless they change status, create an obligation, set a deadline, or prove resolution.",
      ].join("\n");
  const contents = [
        `Work item: ${workItem.workItemId}`,
        `Source IDs: ${workItem.sourceIds.join(", ")}`,
        "Candidate entities:",
        allowedEntities || `- ${PROPERTY_ID} (property): fallback property scope`,
        "",
        "JSON schema:",
        '{"facts":[{"kind":"issue|decision|obligation|deadline|risk|status_change|communication_event","subtype":"string","summary":"string","status":"open|resolved|unknown|needs_review","priority":"low|medium|high|unknown","eventDate":"YYYY-MM-DD optional","dueDate":"YYYY-MM-DD optional","primaryEntityId":"candidate ID optional","entities":["candidate IDs"],"evidence":[{"sourceId":"source id","quote":"exact quote"}],"decision":"keep|needs_review|ignore"}]}',
        "",
        "Source text:",
        text,
      ].join("\n");
  const result = await model.client.models.generateContent({
    model: model.model,
    contents,
    config: {
      systemInstruction,
      temperature: 0,
      responseMimeType: "application/json",
    },
  });
  return llmFactSchema.parse(parseJson(result.text ?? ""));
}

function makeObservation(params: {
  workItem: WorkItem;
  inputHash: string;
  kind: ObservationKind;
  statement: string;
  decision: ObservationDecision;
  reason: string;
  attributes: Record<string, unknown>;
  evidence: EvidenceRef[];
  entityIds: string[];
}): Observation {
  const entityLinks: EntityResolution[] = params.entityIds.map((entityId) => ({ entityId, matchType: "candidate", reason: "Selected from deterministic entity-link candidates by semantic extractor." }));
  return {
    observationId: stableId("SEMOBS", { inputHash: params.inputHash, kind: params.kind, statement: params.statement, sourceIds: params.workItem.sourceIds, attributes: params.attributes }),
    workItemId: params.workItem.workItemId,
    inputHash: params.inputHash,
    sourceIds: params.workItem.sourceIds,
    propertyId: PROPERTY_ID,
    kind: params.kind,
    statement: params.statement,
    mentions: uniqueSorted(params.entityIds),
    entityLinks,
    evidence: params.evidence,
    decision: params.decision,
    reason: params.reason,
    createdBy: "semantic_extractor",
    attributes: params.attributes,
  };
}

function observationsFromModel(workItem: WorkItem, inputHash: string, parsed: z.infer<typeof llmFactSchema>, linkRecord: EntityLinkRecord | undefined, entityIndex: EntityIndex) {
  const allowed = new Set([PROPERTY_ID, ...(linkRecord?.candidateLinks.map((candidate) => candidate.entityId) ?? [])]);
  const observations: Observation[] = [];
  for (const fact of parsed.facts) {
    const evidence = fact.evidence
      .filter((entry) => workItem.sourceIds.includes(entry.sourceId) && entry.quote.trim().length > 0)
      .map((entry) => ({ sourceId: entry.sourceId, quote: entry.quote.trim().slice(0, 500) }));
    if (evidence.length === 0 || fact.decision === "ignore") continue;
    const entityIds = uniqueSorted([...fact.entities, fact.primaryEntityId ?? PROPERTY_ID, PROPERTY_ID].filter((entityId) => allowed.has(entityId) && entityIndex.entities[entityId]));
    observations.push(makeObservation({
      workItem,
      inputHash,
      kind: fact.kind,
      statement: fact.summary,
      decision: fact.decision,
      reason: "LLM semantic extraction from high-signal email thread, bounded by deterministic entity candidates.",
      evidence,
      entityIds,
      attributes: {
        subjectId: stableId("SEMFACT", { kind: fact.kind, subtype: fact.subtype, summary: fact.summary, entities: entityIds, sourceIds: workItem.sourceIds }),
        subtype: fact.subtype,
        status: fact.status,
        priority: fact.priority,
        eventDate: fact.eventDate,
        dueDate: fact.dueDate,
        primaryEntityId: entityIds.includes(fact.primaryEntityId ?? "") ? fact.primaryEntityId : entityIds[0],
        entities: entityIds,
      },
    }));
  }
  return observations;
}

function priorityForSelection(workItem: WorkItem, categories: string[]) {
  const categoryScore = categories.reduce((sum, category) => sum + (KEYWORDS[category]?.weight ?? 0), 0);
  const recency = workItem.incrementalDay ? 8 : 0;
  const complexity = Math.min(workItem.sourceIds.length, 8);
  return categoryScore + recency + complexity;
}

export async function runSemanticExtraction(workItems: WorkItem[], registry: SourceRegistry, entityIndex: EntityIndex, entityLinkRecords: EntityLinkRecord[], now = new Date().toISOString(), progress?: Progress): Promise<SemanticArtifacts> {
  const selectionLimit = Number.parseInt(process.env.SEMANTIC_EXTRACT_LIMIT ?? "25", 10);
  progress?.({ stage: "semantic_extraction", level: "info", message: `Semantic extractor configured with limit ${selectionLimit}.` });
  const sourceById = new Map(registry.sources.map((source) => [source.sourceId, source]));
  const linkByWorkItem = new Map(entityLinkRecords.filter((record) => record.targetType === "work_item" && record.workItemId).map((record) => [record.workItemId!, record]));
  const previousObservations = reusedRecords(await readJsonLinesIfExists<Observation>(SEMANTIC_OBSERVATIONS_PATH));
  const previousDecisions = reusedRecords((await readJsonLinesIfExists<SemanticDecisionRecord>(SEMANTIC_DECISIONS_PATH)).filter((decision) => decision.decision !== "error"));
  const modelName = semanticModelName();
  const model = createModel();
  progress?.({ stage: "semantic_extraction", level: model ? "info" : "warning", message: model ? `Gemini/Gemma model ready: ${modelName}.` : "GEMINI_API_KEY unavailable; high-signal threads will be marked needs_review instead of deep extracted." });

  const observations: Observation[] = [];
  const decisions: SemanticDecisionRecord[] = [];
  const candidates: { workItem: WorkItem; inputHash: string; categories: string[]; linkedEntityIds: string[]; priority: number; text: string }[] = [];
  let reusedWorkItems = 0;

  for (const workItem of workItems) {
    const linkRecord = linkByWorkItem.get(workItem.workItemId);
    const inputHash = workItemInputHash(workItem, linkRecord, selectionLimit, modelName);
    const key = `${workItem.workItemId}:${inputHash}`;
    const reusedDecisionRecords = previousDecisions.get(key) ?? [];
    const reusedObservationRecords = previousObservations.get(key) ?? [];
    if (reusedDecisionRecords.length > 0 || reusedObservationRecords.length > 0) {
      decisions.push(...reusedDecisionRecords);
      observations.push(...reusedObservationRecords);
      reusedWorkItems += 1;
      continue;
    }

    const linkedEntityIds = uniqueSorted(linkRecord?.candidateLinks.map((candidate) => candidate.entityId) ?? [PROPERTY_ID]);
    if (workItem.kind !== "email_thread") {
      decisions.push(decisionRecord({ workItemId: workItem.workItemId, inputHash, sourceIds: workItem.sourceIds, categories: [], decision: "metadata_only", reason: "Non-email work item is handled by deterministic extractors in this pass.", linkedEntityIds, now }));
      continue;
    }

    const text = await readWorkItemText(workItem, sourceById);
    const { categories, priority } = classify(`${workItem.glimpse.summary}\n${JSON.stringify(workItem.glimpse.preview)}\n${text}`);
    const actionable = categories.some((category) => category !== "noise") && priority > 0;
    if (!actionable) {
      decisions.push(decisionRecord({ workItemId: workItem.workItemId, inputHash, sourceIds: workItem.sourceIds, categories, decision: categories.includes("noise") ? "ignore" : "metadata_only", reason: "Email thread has no high-signal property-management terms after deterministic triage.", linkedEntityIds, now }));
      continue;
    }

    candidates.push({ workItem, inputHash, categories, linkedEntityIds, priority: priorityForSelection(workItem, categories), text });
  }

  candidates.sort((a, b) => b.priority - a.priority || b.workItem.sourceIds.length - a.workItem.sourceIds.length || a.workItem.workItemId.localeCompare(b.workItem.workItemId));
  const selected = candidates.slice(0, Math.max(0, selectionLimit));
  const selectedIds = new Set(selected.map((candidate) => candidate.workItem.workItemId));
  progress?.({ stage: "semantic_triage", level: "info", message: `Semantic triage found ${candidates.length} high-signal email thread(s); ${selected.length} selected for deep model extraction, ${Math.max(0, candidates.length - selected.length)} deferred.` });
  let extractedWorkItems = 0;
  let erroredWorkItems = 0;
  let deepIndex = 0;

  for (const candidate of candidates) {
    const linkRecord = linkByWorkItem.get(candidate.workItem.workItemId);
    if (!selectedIds.has(candidate.workItem.workItemId)) {
      progress?.({ stage: "semantic_triage", level: "info", message: `Deferred ${candidate.workItem.workItemId}: bounded selection limit ${selectionLimit}.`, data: { workItemId: candidate.workItem.workItemId, sourceIds: candidate.workItem.sourceIds, categories: candidate.categories, priority: candidate.priority } });
      decisions.push(decisionRecord({ workItemId: candidate.workItem.workItemId, inputHash: candidate.inputHash, sourceIds: candidate.workItem.sourceIds, categories: candidate.categories, decision: "deferred", reason: `High-signal thread deferred after bounded selection limit ${selectionLimit}.`, linkedEntityIds: candidate.linkedEntityIds, now }));
      continue;
    }
    if (!model) {
      progress?.({ stage: "semantic_model", level: "warning", message: `Skipped model extraction for ${candidate.workItem.workItemId}: missing GEMINI_API_KEY.`, data: { workItemId: candidate.workItem.workItemId, sourceIds: candidate.workItem.sourceIds, categories: candidate.categories } });
      decisions.push(decisionRecord({ workItemId: candidate.workItem.workItemId, inputHash: candidate.inputHash, sourceIds: candidate.workItem.sourceIds, categories: candidate.categories, decision: "needs_review", reason: "High-signal thread selected, but GEMINI_API_KEY is not available.", linkedEntityIds: candidate.linkedEntityIds, now }));
      continue;
    }

    try {
      deepIndex += 1;
      progress?.({ stage: "semantic_model", level: "info", message: `Calling ${model.model} for ${candidate.workItem.workItemId} (${deepIndex}/${selected.length}).`, data: { workItemId: candidate.workItem.workItemId, sourceIds: candidate.workItem.sourceIds, categories: candidate.categories, linkedEntityIds: candidate.linkedEntityIds, textChars: candidate.text.length } });
      const parsed = await callExtractor(model, candidate.workItem, candidate.text, linkRecord, entityIndex);
      const extracted = observationsFromModel(candidate.workItem, candidate.inputHash, parsed, linkRecord, entityIndex);
      observations.push(...extracted);
      decisions.push(decisionRecord({ workItemId: candidate.workItem.workItemId, inputHash: candidate.inputHash, sourceIds: candidate.workItem.sourceIds, categories: candidate.categories, decision: "deep_extract", reason: `Google GenAI ${model.model} extracted ${extracted.length} durable semantic observation(s).`, linkedEntityIds: candidate.linkedEntityIds, now }));
      extractedWorkItems += 1;
      progress?.({ stage: "semantic_model", level: "success", message: `${model.model} extracted ${extracted.length} durable observation(s) from ${candidate.workItem.workItemId}.`, data: { workItemId: candidate.workItem.workItemId, observationIds: extracted.map((observation) => observation.observationId), sourceIds: candidate.workItem.sourceIds } });
    } catch (error) {
      progress?.({ stage: "semantic_model", level: "error", message: `${model.model} failed for ${candidate.workItem.workItemId}: ${error instanceof Error ? error.message : String(error)}`, data: { workItemId: candidate.workItem.workItemId, sourceIds: candidate.workItem.sourceIds } });
      decisions.push(decisionRecord({ workItemId: candidate.workItem.workItemId, inputHash: candidate.inputHash, sourceIds: candidate.workItem.sourceIds, categories: candidate.categories, decision: "error", reason: error instanceof Error ? error.message : String(error), linkedEntityIds: candidate.linkedEntityIds, now }));
      erroredWorkItems += 1;
    }
  }

  observations.sort((a, b) => a.observationId.localeCompare(b.observationId));
  decisions.sort((a, b) => a.decisionId.localeCompare(b.decisionId));
  const summary: SemanticExtractionSummary = {
    generatedAt: now,
    propertyId: PROPERTY_ID,
    workItems: workItems.length,
    decisionedWorkItems: decisions.length,
    selectedForDeepExtraction: selected.length,
    extractedWorkItems,
    reusedWorkItems,
    deferredWorkItems: decisions.filter((decision) => decision.decision === "deferred").length,
    erroredWorkItems,
    observations: observations.length,
    decisions: decisions.length,
  };

  await writeJsonLines(SEMANTIC_OBSERVATIONS_PATH, observations);
  await writeJsonLines(SEMANTIC_DECISIONS_PATH, decisions);
  await writeJson(SEMANTIC_SUMMARY_PATH, summary);
  progress?.({ stage: "semantic_extraction", level: erroredWorkItems > 0 ? "warning" : "success", message: `Semantic artifacts written: ${observations.length} observations, ${decisions.length} decisions.`, data: summary });
  return { observations, decisions, summary };
}
