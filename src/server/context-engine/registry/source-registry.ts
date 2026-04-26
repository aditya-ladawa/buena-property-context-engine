import { PROPERTY_ID, SCHEMA_VERSION, SOURCE_REGISTRY_PATH } from "../config";
import type { Manifest, SourceRegistry, SourceRegistryEntry } from "../types";
import { writeJson } from "../utils/fs";

function reusablePreviousSource(source: SourceRegistryEntry, previous?: SourceRegistry) {
  const previousSource = previous?.sources.find((candidate) => candidate.rawPath === source.rawPath && candidate.rawSha256 === source.rawSha256 && candidate.kind === source.kind);
  if (!previousSource || previousSource.normalizedPaths.length === 0) return undefined;
  if (!["normalized", "queued", "processed"].includes(previousSource.status)) return undefined;
  return previousSource;
}

export function buildSourceRegistry(manifest: Manifest, previous?: SourceRegistry): SourceRegistry {
  const primaryByHash = new Map<string, SourceRegistryEntry>();
  const sources: SourceRegistryEntry[] = manifest.items.map((item) => ({ ...item, normalizedPaths: [] }));

  for (const source of sources) {
    if (source.status === "deleted") continue;

    if (source.kind === "system_file") {
      source.status = "ignored";
      source.ignoreReason = "System metadata file";
      continue;
    }

    if (source.kind === "unknown") {
      source.status = "ignored";
      source.ignoreReason = "Unsupported source kind";
      continue;
    }

    const primary = primaryByHash.get(source.rawSha256);
    if (primary) {
      source.status = "duplicate";
      source.duplicateOf = primary.sourceId;
      source.duplicateReason = "same_raw_hash";
      primary.aliases = [...(primary.aliases ?? []), source.sourceId];
      continue;
    }

    primaryByHash.set(source.rawSha256, source);

    const previousSource = reusablePreviousSource(source, previous);
    if (previousSource && source.status === "discovered") {
      source.status = "normalized";
      source.normalizedPaths = previousSource.normalizedPaths;
      source.normalizedSha256 = previousSource.normalizedSha256;
    }
  }

  const duplicateCount = sources.filter((source) => source.status === "duplicate").length;
  const ignoredCount = sources.filter((source) => source.status === "ignored").length;

  return {
    schemaVersion: SCHEMA_VERSION,
    propertyId: PROPERTY_ID,
    generatedAt: manifest.generatedAt,
    sourceCount: sources.length,
    duplicateCount,
    ignoredCount,
    sources,
  };
}

export function syncManifestStatuses(manifest: Manifest, registry: SourceRegistry): Manifest {
  const registryBySourceId = new Map(registry.sources.map((source) => [source.sourceId, source]));
  return {
    ...manifest,
    itemCount: manifest.items.length,
    items: manifest.items.map((item) => ({ ...item, status: registryBySourceId.get(item.sourceId)?.status ?? item.status })),
  };
}

export async function writeSourceRegistry(registry: SourceRegistry) {
  registry.duplicateCount = registry.sources.filter((source) => source.status === "duplicate").length;
  registry.ignoredCount = registry.sources.filter((source) => source.status === "ignored").length;
  registry.sourceCount = registry.sources.length;
  await writeJson(SOURCE_REGISTRY_PATH, registry);
}
