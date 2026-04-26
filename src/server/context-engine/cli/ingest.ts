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

export async function runIngest(options: ScanInventoryOptions = {}): Promise<IngestResult> {
  const startedAt = new Date().toISOString();
  const manifest = await scanInventory(startedAt, options);
  const previousRegistry = await readJsonIfExists<SourceRegistry>(SOURCE_REGISTRY_PATH);
  const registry = buildSourceRegistry(manifest, previousRegistry);
  const reusedNormalized = registry.sources.filter((source) => source.status === "normalized" && source.normalizedPaths.length > 0).length;
  const normalizedRegistry = await normalizeSources(registry);
  const entityIndex = await buildEntityIndex(normalizedRegistry, startedAt);
  const workQueue = await buildWorkQueue(normalizedRegistry);
  const entityLinks = await linkEntities(normalizedRegistry, workQueue, entityIndex, startedAt);
  const extraction = await runDeterministicExtraction(workQueue, normalizedRegistry, entityIndex, startedAt);
  const semantic = await runSemanticExtraction(extraction.workItems, normalizedRegistry, entityIndex, entityLinks.records, startedAt);
  const previousFactIndex = await readJsonIfExists<FactIndex>(FACT_INDEX_PATH);
  const factIndex = buildFactIndex([...extraction.observations, ...semantic.observations], entityIndex, startedAt);
  const changeSet = buildChangeSet(previousFactIndex, factIndex, startedAt, entityIndex);
  const context = await writeContextMarkdown(factIndex, entityIndex, startedAt);
  const entityContexts = await writeEntityContexts(factIndex, entityIndex, startedAt);
  const coverage = validateCoverage(normalizedRegistry, extraction.workItems, startedAt);
  const finalManifest = syncManifestStatuses(manifest, normalizedRegistry);

  await writeManifest(finalManifest);
  await writeSourceRegistry(normalizedRegistry);
  await writeEntityIndex(entityIndex);
  await writeWorkQueue(extraction.workItems);
  await writeFactIndex(factIndex);
  await writeChangeSet(changeSet);
  await writeCoverageReport(coverage);

  const normalizedCount = normalizedRegistry.sources.filter((source) => source.status === "normalized").length;
  const duplicateCount = normalizedRegistry.sources.filter((source) => source.status === "duplicate").length;
  const ignoredCount = normalizedRegistry.sources.filter((source) => source.status === "ignored").length;

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
