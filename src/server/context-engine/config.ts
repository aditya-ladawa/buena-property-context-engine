import path from "node:path";

export const PROJECT_ROOT = path.resolve(process.cwd());
export const PROPERTY_ID = "LIE-001";
export const DATA_ROOT = path.join(PROJECT_ROOT, "data");
export const WORKDIR_ROOT = path.join(PROJECT_ROOT, "workdir");
export const CONTEXTS_ROOT = path.join(PROJECT_ROOT, "contexts");
export const PROPERTY_CONTEXT_ROOT = path.join(CONTEXTS_ROOT, PROPERTY_ID);

export const MANIFEST_PATH = path.join(WORKDIR_ROOT, "manifest.json");
export const SOURCE_REGISTRY_PATH = path.join(PROPERTY_CONTEXT_ROOT, "source-registry.json");
export const ENTITY_INDEX_PATH = path.join(PROPERTY_CONTEXT_ROOT, "entity-index.json");
export const FACT_INDEX_PATH = path.join(PROPERTY_CONTEXT_ROOT, "fact-index.json");
export const CONTEXT_MD_PATH = path.join(PROPERTY_CONTEXT_ROOT, "Context.md");
export const PATCH_LOG_PATH = path.join(PROPERTY_CONTEXT_ROOT, "patch-log.jsonl");
export const NORMALIZED_ROOT = path.join(WORKDIR_ROOT, "normalized");
export const WORK_QUEUE_PATH = path.join(WORKDIR_ROOT, "work-queue.jsonl");
export const OBSERVATIONS_ROOT = path.join(WORKDIR_ROOT, "observations");
export const OBSERVATIONS_PATH = path.join(OBSERVATIONS_ROOT, "observations.jsonl");
export const IGNORE_DECISIONS_PATH = path.join(OBSERVATIONS_ROOT, "ignore-decisions.jsonl");
export const DUPLICATE_DECISIONS_PATH = path.join(OBSERVATIONS_ROOT, "duplicate-decisions.jsonl");
export const ERROR_RECORDS_PATH = path.join(OBSERVATIONS_ROOT, "error-records.jsonl");
export const EXTRACTION_SUMMARY_PATH = path.join(OBSERVATIONS_ROOT, "summary.json");
export const COVERAGE_REPORT_PATH = path.join(PROPERTY_CONTEXT_ROOT, "coverage-report.md");

export const SCHEMA_VERSION = 1;
export const NORMALIZER_VERSION = 3;
