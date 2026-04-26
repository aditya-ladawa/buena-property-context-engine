import { pathToFileURL } from "node:url";
import { buildSourceRegistry, syncManifestStatuses, writeSourceRegistry } from "../registry/source-registry";
import { buildEntityIndex, writeEntityIndex } from "../registry/entity-index-builder";
import { normalizeSources } from "../normalize/normalize";
import type { ScanInventoryOptions } from "../inventory/scan";
import { scanInventory, writeManifest } from "../inventory/scan";
import { buildWorkQueue, writeWorkQueue } from "../work-queue/build-work-queue";
import { validateCoverage, writeCoverageReport } from "../coverage/coverage-validator";
import { SOURCE_REGISTRY_PATH } from "../config";
import type { SourceRegistry } from "../types";
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
  coverage: {
    eligibleSources: number;
    assignedSources: number;
    missingAssignments: number;
    duplicateAssignments: number;
    pendingWorkItems: number;
  };
};

function parseArgs(argv: string[]): ScanInventoryOptions {
  const throughArg = argv.find((arg) => arg.startsWith("--incremental-through="));
  if (throughArg) return { incrementalThroughDay: throughArg.split("=")[1] };
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
  const coverage = validateCoverage(normalizedRegistry, workQueue, startedAt);
  const finalManifest = syncManifestStatuses(manifest, normalizedRegistry);

  await writeManifest(finalManifest);
  await writeSourceRegistry(normalizedRegistry);
  await writeEntityIndex(entityIndex);
  await writeWorkQueue(workQueue);
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
    workItems: workQueue.length,
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
  const result = await runIngest(parseArgs(process.argv.slice(2)));

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
