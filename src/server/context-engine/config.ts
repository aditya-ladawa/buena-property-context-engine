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
export const CORRECTIONS_PATH = path.join(PROPERTY_CONTEXT_ROOT, "corrections.jsonl");
export const ENTITY_CONTEXTS_ROOT = path.join(PROPERTY_CONTEXT_ROOT, "entities");
export const VIEW_MANIFEST_PATH = path.join(PROPERTY_CONTEXT_ROOT, "view-manifest.json");
export const NORMALIZED_ROOT = path.join(WORKDIR_ROOT, "normalized");
export const WORK_QUEUE_PATH = path.join(WORKDIR_ROOT, "work-queue.jsonl");
export const ENTITY_LINKS_ROOT = path.join(WORKDIR_ROOT, "entity-links");
export const ENTITY_LINKS_PATH = path.join(ENTITY_LINKS_ROOT, "entity-links.jsonl");
export const ENTITY_LINK_SUMMARY_PATH = path.join(ENTITY_LINKS_ROOT, "summary.json");
export const OBSERVATIONS_ROOT = path.join(WORKDIR_ROOT, "observations");
export const OBSERVATIONS_PATH = path.join(OBSERVATIONS_ROOT, "observations.jsonl");
export const IGNORE_DECISIONS_PATH = path.join(OBSERVATIONS_ROOT, "ignore-decisions.jsonl");
export const DUPLICATE_DECISIONS_PATH = path.join(OBSERVATIONS_ROOT, "duplicate-decisions.jsonl");
export const ERROR_RECORDS_PATH = path.join(OBSERVATIONS_ROOT, "error-records.jsonl");
export const EXTRACTION_SUMMARY_PATH = path.join(OBSERVATIONS_ROOT, "summary.json");
export const SEMANTIC_ROOT = path.join(WORKDIR_ROOT, "semantic");
export const SEMANTIC_OBSERVATIONS_PATH = path.join(SEMANTIC_ROOT, "observations.jsonl");
export const SEMANTIC_DECISIONS_PATH = path.join(SEMANTIC_ROOT, "decisions.jsonl");
export const SEMANTIC_SUMMARY_PATH = path.join(SEMANTIC_ROOT, "summary.json");
export const CHANGES_ROOT = path.join(WORKDIR_ROOT, "changes");
export const LATEST_CHANGE_SET_PATH = path.join(CHANGES_ROOT, "latest-change-set.json");
export const COVERAGE_REPORT_PATH = path.join(PROPERTY_CONTEXT_ROOT, "coverage-report.md");

export const SCHEMA_VERSION = 1;
export const NORMALIZER_VERSION = 4;
