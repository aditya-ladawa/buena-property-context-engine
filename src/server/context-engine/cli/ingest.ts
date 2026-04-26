import "dotenv/config";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildSourceRegistry, syncManifestStatuses, writeSourceRegistry } from "../registry/source-registry";
import { buildEntityIndex, writeEntityIndex } from "../registry/entity-index-builder";
import { normalizeSources } from "../normalize/normalize";
import type { ScanInventoryOptions } from "../inventory/scan";
import { scanInventory, writeManifest } from "../inventory/scan";
import { buildWorkQueue, writeWorkQueue } from "../work-queue/build-work-queue";
import { validateCoverage, writeCoverageReport } from "../coverage/coverage-validator";
import { runDeterministicExtraction } from "../extract/deterministic-extractor";
import { runSemanticExtraction } from "../extract/semantic-extractor";
import { linkEntities } from "../link/entity-linker";
import { buildFactIndex, writeFactIndex } from "../facts/fact-reducer";
import { writeContextMarkdown } from "../context/generate-context";
import { writeEntityContexts } from "../context/generate-entity-contexts";
import { buildChangeSet, writeChangeSet } from "../changes/change-set";
import { DATA_ROOT, FACT_INDEX_PATH, SOURCE_REGISTRY_PATH } from "../config";
import type { ChangeSet, EntityContextSummary, EntityLinkSummary, ExtractionSummary, FactIndex, SemanticExtractionSummary, SourceRegistry } from "../types";
import { readJsonIfExists } from "../utils/fs";

export type IngestResult = {
  manifestItems: number;
  normalized: number;
  reusedNormalized: number;
  newlyNormalized: number;
  duplicates: number;
  ignored: number;
  entities: number;
  entityStats: Record<string, number>;
  workItems: number;
  entityLinks: EntityLinkSummary;
  extraction: ExtractionSummary;
  semantic: SemanticExtractionSummary;
  facts: {
    factCount: number;
    stats: FactIndex["stats"];
  };
  changes: Pick<ChangeSet, "addedFactIds" | "modifiedFactIds" | "removedFactIds" | "changedEntities" | "affectedViews"> & {
    addedFacts: number;
    modifiedFacts: number;
    removedFacts: number;
    changedEntityCount: number;
    affectedViewCount: number;
  };
  context: {
    sectionCount: number;
    patchedSections: number;
    conflictSections: number;
    contextPath: string;
  };
  entityContexts: EntityContextSummary;
  coverage: {
    eligibleSources: number;
    assignedSources: number;
    missingAssignments: number;
    duplicateAssignments: number;
    pendingWorkItems: number;
  };
};

export type IngestProgressEvent = {
  stage: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  data?: unknown;
};

export type IngestRunOptions = ScanInventoryOptions & {
  onProgress?: (event: IngestProgressEvent) => void;
};

async function latestIncrementalDay() {
  const incrementalRoot = path.join(DATA_ROOT, "incremental");
  const entries = await readdir(incrementalRoot, { withFileTypes: true });
  const days = entries
    .filter((entry) => entry.isDirectory() && /^day-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  return days.at(-1);
}

async function parseArgs(argv: string[]): Promise<ScanInventoryOptions> {
  const throughArg = argv.find((arg) => arg.startsWith("--incremental-through="));
  if (throughArg) return { incrementalThroughDay: throughArg.split("=")[1] };
  if (argv.includes("--latest-incremental")) {
    const latest = await latestIncrementalDay();
    if (!latest) throw new Error("No data/incremental/day-* folders found.");
    return { incrementalThroughDay: latest };
  }
  if (argv.includes("--all-incremental")) return { incrementalThroughDay: "day-99" };
  return {};
}

export async function runIngest(options: IngestRunOptions = {}): Promise<IngestResult> {
  const progress = (event: IngestProgressEvent) => options.onProgress?.(event);
  const startedAt = new Date().toISOString();
  progress({ stage: "scan", level: "info", message: "Scanning source inventory." });
  const manifest = await scanInventory(startedAt, options);
  progress({ stage: "scan", level: "success", message: `Inventory scan found ${manifest.itemCount} source file(s).` });

  progress({ stage: "registry", level: "info", message: "Building source registry and reuse map." });
  const previousRegistry = await readJsonIfExists<SourceRegistry>(SOURCE_REGISTRY_PATH);
  const registry = buildSourceRegistry(manifest, previousRegistry);
  const reusedNormalized = registry.sources.filter((source) => source.status === "normalized" && source.normalizedPaths.length > 0).length;
  progress({ stage: "registry", level: "success", message: `Registry has ${registry.sourceCount} sources, ${registry.duplicateCount} duplicates, ${registry.ignoredCount} ignored.` });

  progress({ stage: "normalize", level: "info", message: "Normalizing raw source files into markdown/json artifacts." });
  const normalizedRegistry = await normalizeSources(registry);
  const normalizedCount = normalizedRegistry.sources.filter((source) => source.status === "normalized").length;
  const duplicateCount = normalizedRegistry.sources.filter((source) => source.status === "duplicate").length;
  const ignoredCount = normalizedRegistry.sources.filter((source) => source.status === "ignored").length;
  progress({ stage: "normalize", level: "success", message: `Normalization complete: ${normalizedCount} normalized, ${normalizedCount - reusedNormalized} new, ${reusedNormalized} reused.` });

  progress({ stage: "entities", level: "info", message: "Building entity index from master data and parsed sources." });
  const entityIndex = await buildEntityIndex(normalizedRegistry, startedAt);
  progress({ stage: "entities", level: "success", message: `Entity index contains ${Object.keys(entityIndex.entities).length} entities.`, data: entityIndex.stats });

  progress({ stage: "queue", level: "info", message: "Building bounded work queue for extraction." });
  const workQueue = await buildWorkQueue(normalizedRegistry);
  progress({ stage: "queue", level: "success", message: `Work queue contains ${workQueue.length} item(s).` });

  progress({ stage: "entity_linking", level: "info", message: "Linking sources and work items to candidate entities." });
  const entityLinks = await linkEntities(normalizedRegistry, workQueue, entityIndex, startedAt);
  progress({ stage: "entity_linking", level: "success", message: `Entity linking complete: ${entityLinks.summary.sourceRecords} source records, ${entityLinks.summary.workItemRecords} work-item records, ${entityLinks.summary.unlinkedRecords} unlinked.` });

  progress({ stage: "deterministic_extraction", level: "info", message: "Running deterministic source-backed extraction." });
  const extraction = await runDeterministicExtraction(workQueue, normalizedRegistry, entityIndex, startedAt);
  progress({ stage: "deterministic_extraction", level: extraction.summary.erroredWorkItems > 0 ? "warning" : "success", message: `Deterministic extraction produced ${extraction.observations.length} observations with ${extraction.summary.erroredWorkItems} errored work item(s).` });

  progress({ stage: "semantic_extraction", level: "info", message: "Running semantic triage and bounded Gemini/Gemma extraction for high-signal email threads." });
  const semantic = await runSemanticExtraction(extraction.workItems, normalizedRegistry, entityIndex, entityLinks.records, startedAt, progress);
  progress({ stage: "semantic_extraction", level: semantic.summary.erroredWorkItems > 0 ? "warning" : "success", message: `Semantic extraction selected ${semantic.summary.selectedForDeepExtraction} thread(s), extracted ${semantic.summary.extractedWorkItems}, reused ${semantic.summary.reusedWorkItems}, deferred ${semantic.summary.deferredWorkItems}.` });

  progress({ stage: "facts", level: "info", message: "Reducing observations into durable facts." });
  const previousFactIndex = await readJsonIfExists<FactIndex>(FACT_INDEX_PATH);
  const factIndex = buildFactIndex([...extraction.observations, ...semantic.observations], entityIndex, startedAt);
  const changeSet = buildChangeSet(previousFactIndex, factIndex, startedAt, entityIndex);
  progress({ stage: "facts", level: "success", message: `Fact index contains ${factIndex.factCount} facts. Changes: +${changeSet.addedFactIds.length}, ~${changeSet.modifiedFactIds.length}, -${changeSet.removedFactIds.length}.` });

  progress({ stage: "context", level: "info", message: "Materializing property Context.md with managed-section conflict protection." });
  const context = await writeContextMarkdown(factIndex, entityIndex, startedAt);
  progress({ stage: "context", level: context.conflictSections > 0 ? "warning" : "success", message: `Context materialized: ${context.patchedSections} patched section(s), ${context.conflictSections} conflict(s).` });

  progress({ stage: "entity_contexts", level: "info", message: "Writing entity-specific context views." });
  const entityContexts = await writeEntityContexts(factIndex, entityIndex, startedAt);
  progress({ stage: "entity_contexts", level: "success", message: `Wrote ${entityContexts.writtenEntityContexts} entity context view(s).` });

  progress({ stage: "coverage", level: "info", message: "Validating source coverage and work-item assignment." });
  const coverage = validateCoverage(normalizedRegistry, extraction.workItems, startedAt);
  const finalManifest = syncManifestStatuses(manifest, normalizedRegistry);
  progress({ stage: "coverage", level: coverage.missingAssignments.length > 0 || coverage.pendingWorkItemCount > 0 ? "warning" : "success", message: `Coverage validated: ${coverage.assignedSourceCount}/${coverage.eligibleSourceCount} sources assigned, ${coverage.pendingWorkItemCount} pending work item(s).` });

  progress({ stage: "write_artifacts", level: "info", message: "Writing manifest, registry, entity index, work queue, fact index, change set, and coverage report." });
  await writeManifest(finalManifest);
  await writeSourceRegistry(normalizedRegistry);
  await writeEntityIndex(entityIndex);
  await writeWorkQueue(extraction.workItems);
  await writeFactIndex(factIndex);
  await writeChangeSet(changeSet);
  await writeCoverageReport(coverage);
  progress({ stage: "write_artifacts", level: "success", message: "All ingest artifacts written." });

  return {
    manifestItems: finalManifest.itemCount,
    normalized: normalizedCount,
    reusedNormalized,
    newlyNormalized: normalizedCount - reusedNormalized,
    duplicates: duplicateCount,
    ignored: ignoredCount,
    entities: Object.keys(entityIndex.entities).length,
    entityStats: entityIndex.stats,
    workItems: extraction.workItems.length,
    entityLinks: entityLinks.summary,
    extraction: extraction.summary,
    semantic: semantic.summary,
    facts: {
      factCount: factIndex.factCount,
      stats: factIndex.stats,
    },
    changes: {
      addedFacts: changeSet.addedFactIds.length,
      modifiedFacts: changeSet.modifiedFactIds.length,
      removedFacts: changeSet.removedFactIds.length,
      changedEntityCount: changeSet.changedEntities.length,
      affectedViewCount: changeSet.affectedViews.length,
      addedFactIds: changeSet.addedFactIds.slice(0, 20),
      modifiedFactIds: changeSet.modifiedFactIds.slice(0, 20),
      removedFactIds: changeSet.removedFactIds.slice(0, 20),
      changedEntities: changeSet.changedEntities.slice(0, 40),
      affectedViews: changeSet.affectedViews.slice(0, 40),
    },
    context,
    entityContexts,
    coverage: {
      eligibleSources: coverage.eligibleSourceCount,
      assignedSources: coverage.assignedSourceCount,
      missingAssignments: coverage.missingAssignments.length,
      duplicateAssignments: coverage.duplicateAssignments.length,
      pendingWorkItems: coverage.pendingWorkItemCount,
    },
  };
}

async function main() {
  const result = await runIngest(await parseArgs(process.argv.slice(2)));

  console.log(
    JSON.stringify(
      result,
      null,
      2,
    ),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
