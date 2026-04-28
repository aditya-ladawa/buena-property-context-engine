# Technical Implementation

This file documents implementation details only. The README explains the approach and product flow.

## Runtime Boundaries

| Boundary | Code / artifact | Responsibility |
| --- | --- | --- |
| Ingest CLI | `src/server/context-engine/cli/ingest.ts` | Orchestrates the complete context build. |
| Context engine modules | `src/server/context-engine/**` | Scan, normalize, link, extract, reduce, patch, validate. |
| Generated context | `contexts/LIE-001/**` | Committed output inspected by humans and read by the agent. |
| Intermediate state | `workdir/**` | Rebuildable local pipeline state. |
| API and agent | `server/index.ts` | Express routes, LangChain agent, context tools, graph endpoint, voice proxy. |
| UI | `src/routes/**`, `src/components/**` | Ingest controls, chat, graph, artifact preview, direct context editing. |

## Pipeline Order

`runIngest` executes the context build in this order:

```text
scan data/
  -> normalize sources
  -> build source-registry.json
  -> build entity-index.json
  -> build work-queue.jsonl
  -> deterministic extraction
  -> entity linking
  -> semantic extraction
  -> reduce observations into fact-index.json
  -> compute latest-change-set.json
  -> write Context.md
  -> write entity context views
  -> write view-manifest.json
  -> validate coverage-report.md
```

The order matters. Entity linking depends on normalized source metadata and the entity index. Semantic extraction depends on work items and entity links. Context generation depends on the final fact index.

## Artifact Contracts

### Manifest Item

Written to `workdir/manifest.json`.

```ts
type ManifestItem = {
  sourceId: string;
  propertyId: string;
  kind: SourceKind;
  rawPath: string;
  rawSha256: string;
  rawSizeBytes: number;
  discoveredAt: string;
  updatedAt: string;
  status: SourceStatus;
  declaredIds: string[];
  sourceDate?: string;
  incrementalDay?: string;
};
```

Purpose: immutable-ish raw source inventory with change detection.

### Source Registry Entry

Written to `contexts/LIE-001/source-registry.json`.

```ts
type SourceRegistryEntry = ManifestItem & {
  normalizedPaths: string[];
  normalizedSha256?: string;
  normalizerVersion?: number;
  ignoreReason?: string;
  duplicateOf?: string;
  duplicateReason?: string;
  aliases?: string[];
  error?: string;
};
```

Purpose: stable source pointer table. The agent and downstream stages use this to jump from `sourceId` to raw path, normalized path, hashes, and status.

### Work Item

Written to `workdir/work-queue.jsonl`.

```ts
type WorkItem = {
  workItemId: string;
  propertyId: string;
  kind: WorkItemKind;
  sourceIds: string[];
  normalizedPaths: string[];
  reason: string;
  assignedProcessor: WorkItemProcessor;
  status: WorkItemStatus;
  groupKey: string;
  incrementalDay?: string;
  glimpse: WorkItemGlimpse;
};
```

`WorkItemGlimpse` is the bounded routing object:

```ts
type WorkItemGlimpse = {
  summary: string;
  sourceCount: number;
  normalizedArtifactCount: number;
  sourceKinds: Partial<Record<SourceKind, number>>;
  dateRange?: [string, string];
  entityHints: string[];
  labels: string[];
  metrics: Record<string, number>;
  preview: Record<string, unknown>;
};
```

Purpose: avoid sending raw folders to the model. The queue groups sources and provides enough metadata for deterministic routing and semantic triage.

### Entity Index

Written to `contexts/LIE-001/entity-index.json`.

```ts
type EntityRecord = {
  id: string;
  type: EntityType;
  displayName: string;
  canonicalFields: Record<string, unknown>;
  relatedEntityIds: string[];
};

type EntityAlias = {
  entityId: string;
  alias: string;
  aliasType: "id" | "name" | "email" | "phone" | "iban" | "address" | "unit_number" | "invoice_number" | "filename" | "thread_id";
  source: "stammdaten" | "filename" | "index_csv" | "parsed_source";
};
```

Purpose: canonical identity layer. This prevents the agent from repeatedly guessing whether `DL-012`, `Elektro Schmidt`, and a filename mention refer to the same contractor.

### Entity Link Record

Written to `workdir/entity-links/entity-links.jsonl`.

```ts
type EntityLinkRecord = {
  recordId: string;
  propertyId: string;
  targetType: "source" | "work_item";
  sourceId?: string;
  workItemId?: string;
  sourceIds: string[];
  sourceDate?: string;
  candidateLinks: EntityLinkCandidate[];
  decision: "linked" | "property_only" | "ambiguous" | "unlinked" | "error";
  reason: string;
  createdAt: string;
};
```

Purpose: links sources/work items to entities using declared IDs, aliases, emails, filenames, known relationships, and aggregate hints.

### Observation

Written to `workdir/observations/observations.jsonl` and `workdir/semantic/observations.jsonl`.

```ts
type Observation = {
  observationId: string;
  workItemId: string;
  inputHash: string;
  sourceIds: string[];
  propertyId: string;
  kind: ObservationKind;
  statement: string;
  mentions: string[];
  entityLinks: EntityResolution[];
  evidence: EvidenceRef[];
  decision: "keep" | "ignore" | "duplicate" | "needs_review";
  reason: string;
  createdBy: WorkItemProcessor;
  attributes: Record<string, unknown>;
};
```

Purpose: extracted claims before final fact reduction.

### Fact Record

Written to `contexts/LIE-001/fact-index.json`.

```ts
type FactRecord = {
  factId: string;
  propertyId: string;
  kind: FactKind;
  subjectId?: string;
  statement: string;
  structured: Record<string, unknown>;
  sourceObservationIds: string[];
  sourceIds: string[];
  mentions: string[];
  entities: string[];
  primaryEntityId?: string;
  eventDate?: string;
  validFrom?: string;
  validTo?: string;
  dueDate?: string;
  relationshipType?: RelationshipType;
  fromEntityId?: string;
  toEntityId?: string;
  evidence: EvidenceRef[];
  decision: "keep" | "ignore" | "duplicate" | "needs_review";
  updatedAt: string;
};
```

Purpose: durable source-backed statement layer. `Context.md` and entity views are generated from facts.

### View Manifest Entry

Written to `contexts/LIE-001/view-manifest.json`.

```ts
type ViewManifestEntry = {
  view: string;
  entityId: string;
  entityType: EntityType;
  dependsOnFactIds?: string[];
  dependsOnEntities?: string[];
  generatedAt: string;
};
```

Purpose: view dependency tracking. If a fact/entity changes, the system can know which materialized views are affected.

### Patch Log Entry

Written to `contexts/LIE-001/patch-log.jsonl`.

```ts
type PatchLogEntry = {
  patchId: string;
  propertyId: string;
  sectionId: string;
  status: "applied" | "conflict";
  beforeHash?: string;
  expectedBeforeHash?: string;
  afterHash: string;
  reason: string;
  sourceFactIds: string[];
  createdAt: string;
};
```

Purpose: append-only section update audit.

### Correction Entry

Written to `contexts/LIE-001/corrections.jsonl`.

```ts
type ContextCorrection = {
  correctionId: string;
  propertyId: string;
  status: "proposed" | "accepted" | "rejected";
  correction: string;
  reason: string;
  targetSectionId?: string;
  targetSectionHash?: string;
  targetFactIds: string[];
  targetEntityIds: string[];
  targetSourceIds: string[];
  provenance: { type: "chat_thread" | "manual"; threadId?: string };
  createdAt: string;
};
```

Purpose: user/agent feedback without directly mutating generated facts.

## ID And Hash Strategy

| Mechanism | Implementation purpose |
| --- | --- |
| `rawSha256` | Detect raw source changes and deduplicate identical raw files. |
| `normalizedSha256` | Detect changes after parsing/extraction/normalization. |
| `inputHash` | Cache/reuse extraction outputs when a work item and linked entities are unchanged. |
| `stableId(prefix, value)` | Generates deterministic IDs such as `FACT-*`, `PATCH-*`, `CORR-*` from structured content. |
| `section hash` | Guards `Context.md` managed sections from accidental overwrite. |

The technical goal is repeatability: if the input artifacts do not change, generated IDs and outputs should remain stable.

## Source Classification

Implemented in:

```text
src/server/context-engine/inventory/classify-source.ts
src/server/context-engine/inventory/scan.ts
```

Classification uses path and filename conventions to produce source kinds such as:

```text
master_data
email
invoice_pdf
letter_pdf
bank_csv
bank_xml
index_csv
incremental_manifest
system_file
unknown
```

`classify-source.ts` also extracts declared IDs such as `EMAIL-*`, `LTR-*`, and `INV-*` when present in filenames or metadata.

## Normalization

Implemented in:

```text
src/server/context-engine/normalize/normalize.ts
src/server/context-engine/normalize/pdf.ts
```

Normalization writes extracted artifacts and `.meta.json` sidecars. Examples:

| Source kind | Normalized output |
| --- | --- |
| master data | JSON tables under `workdir/normalized/master-data/` |
| bank CSV | JSONL rows under `workdir/normalized/bank/` |
| index CSV | JSONL rows under `workdir/normalized/indexes/` |
| email | Markdown/text plus metadata under `workdir/normalized/emails/` |
| invoice PDF | Extracted text/markdown plus metadata under `workdir/normalized/invoices/` |
| letter PDF | Extracted text/markdown plus metadata under `workdir/normalized/letters/` |

Every normalized artifact is linked back to a source registry entry through `normalizedPaths` and `normalizedSha256`.

## Work Queue Construction

Implemented in:

```text
src/server/context-engine/work-queue/build-work-queue.ts
```

Grouping rules:

| Work item kind | Grouping behavior |
| --- | --- |
| `master_data_bundle` | Bundles canonical property master data. |
| `email_thread` | Groups related email messages into a thread. |
| `email_single` | Keeps unthreaded emails as individual work items. |
| `invoice_group` | Groups invoice sources by invoice/contractor patterns. |
| `letter_group` | Groups letters by type/date/entity patterns. |
| `bank_group` | Groups bank/index rows for payment extraction. |
| `incremental_day` | Groups simulated daily deltas. |

The glimpse is intentionally small. It is a routing payload, not a final summary.

## Entity Index Construction

Implemented in:

```text
src/server/context-engine/registry/entity-index-builder.ts
```

Entity records are created from German property-management source schemas:

| Entity type | Example IDs |
| --- | --- |
| property | `LIE-001` |
| building | `HAUS-12` |
| unit | `EH-001` |
| owner | `EIG-001` |
| tenant | `MIE-001` |
| contractor | `DL-012` |
| invoice | `INV-DUP-00192` |
| letter | `LTR-0131` |
| email | `EMAIL-06531` |

Aliases include names, emails, phone numbers, IBANs, filenames, invoice numbers, thread IDs, and unit numbers.

## Entity Linking

Implemented in:

```text
src/server/context-engine/link/entity-linker.ts
```

Linking produces source-level and work-item-level link records. Match types include:

```text
property_scope
declared_id
alias
email
filename
relationship
work_item_aggregate
```

The linker returns `linked`, `property_only`, `ambiguous`, `unlinked`, or `error`. Ambiguity is preserved instead of forcing a low-confidence match.

## Extraction

### Deterministic Extraction

Implemented in:

```text
src/server/context-engine/extract/deterministic-extractor.ts
```

Used for structured data where an LLM is unnecessary:

| Input | Output observation/fact kinds |
| --- | --- |
| property master data | `property_profile` |
| building rows | `building` |
| unit rows | `unit` |
| owner rows | `owner`, `relationship` |
| tenant rows | `tenant`, `relationship` |
| contractor rows | `contractor` |
| bank rows | `payment` |
| invoice metadata/index rows | `invoice` |
| letter metadata | `document` |
| email metadata | `communication` |

### Semantic Extraction

Implemented in:

```text
src/server/context-engine/extract/semantic-extractor.ts
```

Semantic extraction is bounded:

```text
work item -> inputHash -> reuse check -> deterministic triage -> selected high-signal items -> Gemini extraction -> Zod validation -> semantic observations
```

It does not deep-read every email thread. It ranks candidates using glimpse text, metadata, linked entities, source text, recency, and high-signal categories. Non-selected or low-signal items remain metadata-only, ignored, deferred, or needs-review.

## Fact Reduction

Implemented in:

```text
src/server/context-engine/facts/fact-reducer.ts
```

Reduction responsibilities:

```text
observations[]
  -> stable FACT IDs
  -> merge observation provenance
  -> preserve evidence refs
  -> assign primary entity
  -> assign relationship fields
  -> preserve decision keep/needs_review/ignore/duplicate
  -> write fact-index.json
```

The fact index is the main structured truth used by generated views.

## Change Set

Implemented in:

```text
src/server/context-engine/changes/change-set.ts
```

The change set compares previous and next `fact-index.json`:

```ts
type ChangeSet = {
  addedFactIds: string[];
  removedFactIds: string[];
  modifiedFactIds: string[];
  unchangedFactCount: number;
  changedSourceIds: string[];
  changedEntities: string[];
  affectedViews: string[];
};
```

`affectedViews` uses fact kinds and entity IDs to identify `Context.md` sections and entity markdown files that should be considered stale.

## Context.md Generation

Implemented in:

```text
src/server/context-engine/context/generate-context.ts
```

Generation builds deterministic sections from `fact-index.json` and `entity-index.json`.

Sections include:

```text
property-profile
buildings
units
owners
tenants
contractors
financials
invoices
documents
current-open-issues
recent-important-changes
risks-needs-review
communications-review
provenance
```

Managed section format:

```md
<!-- BCE:SECTION <sectionId> START hash=<contentHash> -->
## Section Title
...
<!-- BCE:SECTION <sectionId> END -->
```

Patch behavior:

```text
if section missing:
  append generated section and log applied patch
else if current section content hash != marker hash:
  do not overwrite; log conflict patch
else if generated section differs:
  replace section and log applied patch
else:
  no-op
```

## Entity Context Generation

Implemented in:

```text
src/server/context-engine/context/generate-entity-contexts.ts
```

Each entity view contains:

```text
profile
canonical fields
related entities
active / needs review facts
related facts
evidence/source references
```

The generator also writes `view-manifest.json`, mapping views to fact IDs and entity IDs.

## Protected User Blocks

Implemented in:

```text
src/server/context-engine/context/user-blocks.ts
```

Functions:

| Function | Behavior |
| --- | --- |
| `extractUserBlocks` | Returns all `<user>...</user>` blocks. |
| `validateHumanAuthority` | Ensures protected blocks are unchanged and in the same order. |
| `markUserContextChanges` | Diffs current vs edited markdown and wraps insert/replace/delete changes in protected user blocks. |
| `mergeUserBlocksIntoCandidate` | Blocks candidate output if protected blocks changed. |

Protected block format:

```md
<user id="USEREDIT-..." author="frontend-user" created_at="..." action="insert|replace|delete">
...
</user>
```

## Agent Runtime

Implemented in:

```text
server/index.ts
```

Agent tools:

| Tool | Reads/writes |
| --- | --- |
| `read_property_context` | Reads `contexts/LIE-001/Context.md`. |
| `read_entity_context` | Reads `contexts/LIE-001/entities/<entityId>.md`. |
| `append_context_note` | Writes note outside BCE managed sections. |
| `create_context_correction` | Appends JSONL correction to `corrections.jsonl`. |
| `search_local_services` | Calls Tavily for external vendor search. |
| `write_todos` | Updates visible chat todo state. |

Agent pointer traversal is implemented by tool policy and artifact structure:

```text
question mentions entity ID
  -> read_entity_context(entityId)
  -> parse related facts/source IDs/entities from markdown
  -> if broad context needed, read_property_context()
  -> if correction requested, create_context_correction(target IDs)
```

The LLM chooses the next pointer from generated context. It should not invent target IDs that are not present in entity views, facts, source registry, or user-provided corrections.

## Context Graph Endpoint

Implemented in:

```text
server/index.ts -> buildContextGraph()
```

Graph construction:

```text
read entity-index.json
read fact-index.json
select property/building/unit/owner/tenant/contractor entities
add review/anomaly invoice nodes
add edges from relatedEntityIds
add relationship fact edges
add invoice_link edges from invoice facts
return nodes and edges to UI
```

This graph is a view over generated artifacts, not a separate source of truth.

## Coverage Validation

Implemented in:

```text
src/server/context-engine/coverage/coverage-validator.ts
```

Checks:

```text
eligible normalized sources assigned to work items
duplicate assignments absent
normalized artifacts exist
work items reached terminal outcomes
```

Current committed run:

```text
Sources: 6886
Eligible normalized sources: 6883
Assigned normalized sources: 6883
Work items: 4498
Pending work items: 0
Status: PASS
```

## File Responsibilities

| File | Technical role |
| --- | --- |
| `src/server/context-engine/config.ts` | Path constants, property ID, schema version, normalizer version. |
| `src/server/context-engine/types.ts` | Shared TypeScript contracts. |
| `src/server/context-engine/inventory/scan.ts` | Data scan and manifest write. |
| `src/server/context-engine/inventory/classify-source.ts` | Source kind and ID classification. |
| `src/server/context-engine/inventory/hash.ts` | Raw file SHA-256 helper. |
| `src/server/context-engine/normalize/normalize.ts` | Normalized artifact generation. |
| `src/server/context-engine/normalize/pdf.ts` | PDF text extraction. |
| `src/server/context-engine/registry/source-registry.ts` | Source registry generation. |
| `src/server/context-engine/registry/entity-index-builder.ts` | Entity and alias index generation. |
| `src/server/context-engine/work-queue/build-work-queue.ts` | Work item grouping and glimpse generation. |
| `src/server/context-engine/link/entity-linker.ts` | Source/work-item to entity linking. |
| `src/server/context-engine/extract/deterministic-extractor.ts` | Structured extraction. |
| `src/server/context-engine/extract/semantic-extractor.ts` | Gemini semantic extraction for selected unstructured items. |
| `src/server/context-engine/facts/fact-reducer.ts` | Observation-to-fact reduction. |
| `src/server/context-engine/changes/change-set.ts` | Fact diff and affected-view calculation. |
| `src/server/context-engine/context/generate-context.ts` | `Context.md` section generation and patch logging. |
| `src/server/context-engine/context/generate-entity-contexts.ts` | Entity markdown view and view manifest generation. |
| `src/server/context-engine/context/user-blocks.ts` | Protected human edit handling. |
| `src/server/context-engine/coverage/coverage-validator.ts` | Coverage report generation. |
| `src/server/context-engine/cli/ingest.ts` | Pipeline orchestration. |
| `src/server/context-engine/cli/simulate-incremental.ts` | Simulated incremental data generation. |
| `src/server/context-engine/utils/fs.ts` | JSON/JSONL/text filesystem helpers and hashing utilities. |
| `src/server/context-engine/utils/csv.ts` | CSV parsing. |
| `server/index.ts` | API, agent tools, graph endpoint, context edit endpoints, ingest streaming, voice proxy. |
| `src/routes/chat.tsx` | Main agent UI, graph, artifact preview, context edit UI, voice controls. |
| `src/routes/ingest.tsx` | Ingest control UI. |
| `src/routes/index.tsx` | Overview UI. |
| `src/remotion/ContextTraceVideo.tsx` | Demo video composition. |
