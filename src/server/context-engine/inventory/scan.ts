import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { DATA_ROOT, MANIFEST_PATH, PROJECT_ROOT, PROPERTY_ID, SCHEMA_VERSION } from "../config";
import type { Manifest, ManifestItem } from "../types";
import { readJsonIfExists, toPosixPath, writeJson } from "../utils/fs";
import { classifySource, deriveSourceId } from "./classify-source";
import { sha256File } from "./hash";

export type ScanInventoryOptions = {
  incrementalThroughDay?: string;
};

async function walkFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return walkFiles(entryPath);
      if (entry.isFile()) return [entryPath];
      return [];
    }),
  );
  return files.flat().sort();
}

function shouldIncludeRawPath(rawPath: string, options: ScanInventoryOptions) {
  const incrementalDay = rawPath.match(/^data\/incremental\/(day-\d+)\//)?.[1];
  if (!incrementalDay) return true;
  if (!options.incrementalThroughDay) return false;
  return incrementalDay.localeCompare(options.incrementalThroughDay) <= 0;
}

export async function scanInventory(now = new Date().toISOString(), options: ScanInventoryOptions = {}): Promise<Manifest> {
  const previous = await readJsonIfExists<Manifest>(MANIFEST_PATH);
  const previousByPath = new Map(previous?.items.map((item) => [item.rawPath, item]) ?? []);
  const currentFiles = (await walkFiles(DATA_ROOT)).filter((absolutePath) => shouldIncludeRawPath(toPosixPath(path.relative(PROJECT_ROOT, absolutePath)), options));
  const currentRawPaths = new Set<string>();
  const seenSourceIds = new Map<string, number>();
  const items: ManifestItem[] = [];

  for (const absolutePath of currentFiles) {
    const rawPath = toPosixPath(path.relative(PROJECT_ROOT, absolutePath));
    currentRawPaths.add(rawPath);
    const fileStat = await stat(absolutePath);
    const rawSha256 = await sha256File(absolutePath);
    const classified = classifySource(rawPath);
    const previousItem = previousByPath.get(rawPath);
    const baseSourceId = deriveSourceId(rawPath, classified.declaredIds, rawSha256);
    const seenCount = seenSourceIds.get(baseSourceId) ?? 0;
    seenSourceIds.set(baseSourceId, seenCount + 1);
    const sourceId = seenCount === 0 ? baseSourceId : `${baseSourceId}__${rawSha256.slice(0, 8)}`;
    const status = classified.kind === "system_file" || classified.kind === "unknown"
      ? "ignored"
      : previousItem && previousItem.rawSha256 !== rawSha256
        ? "changed"
        : "discovered";

    items.push({
      sourceId,
      propertyId: PROPERTY_ID,
      kind: classified.kind,
      rawPath,
      rawSha256,
      rawSizeBytes: fileStat.size,
      discoveredAt: previousItem?.discoveredAt ?? now,
      updatedAt: now,
      status,
      declaredIds: classified.declaredIds,
      sourceDate: classified.sourceDate,
      incrementalDay: classified.incrementalDay,
    });
  }

  for (const previousItem of previous?.items ?? []) {
    if (currentRawPaths.has(previousItem.rawPath)) continue;
    items.push({ ...previousItem, status: "deleted", updatedAt: now });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: now,
    dataRoot: toPosixPath(path.relative(PROJECT_ROOT, DATA_ROOT)),
    itemCount: items.length,
    items: items.sort((a, b) => a.rawPath.localeCompare(b.rawPath)),
  };
}

export async function writeManifest(manifest: Manifest) {
  await writeJson(MANIFEST_PATH, manifest);
}
