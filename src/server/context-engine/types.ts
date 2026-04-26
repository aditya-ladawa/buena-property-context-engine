export type SourceKind =
  | "master_data"
  | "email"
  | "invoice_pdf"
  | "letter_pdf"
  | "bank_csv"
  | "bank_xml"
  | "index_csv"
  | "incremental_manifest"
  | "system_file"
  | "unknown";

export type SourceStatus =
  | "discovered"
  | "normalized"
  | "queued"
  | "processed"
  | "ignored"
  | "duplicate"
  | "changed"
  | "deleted"
  | "error";

export type ManifestItem = {
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

export type Manifest = {
  schemaVersion: number;
  generatedAt: string;
  dataRoot: string;
  itemCount: number;
  items: ManifestItem[];
};

export type DuplicateInfo = {
  duplicateOf?: string;
  duplicateReason?: "same_raw_hash" | "same_normalized_hash" | "same_domain_key" | "same_message_id" | "same_invoice_fields";
  aliases?: string[];
  collisionWith?: string[];
  variantOf?: string;
  variantIndex?: number;
};

export type SourceRegistryEntry = ManifestItem &
  DuplicateInfo & {
    normalizedPaths: string[];
    normalizedSha256?: string;
    normalizerVersion?: number;
    ignoreReason?: string;
    error?: string;
  };

export type SourceRegistry = {
  schemaVersion: number;
  propertyId: string;
  generatedAt: string;
  sourceCount: number;
  duplicateCount: number;
  ignoredCount: number;
  sources: SourceRegistryEntry[];
};

export type NormalizedMeta = {
  sourceId: string;
  propertyId: string;
  kind: SourceKind;
  rawPath: string;
  rawSha256: string;
  normalizedPaths: string[];
  normalizedSha256?: string;
  metadata: Record<string, unknown>;
};

export type EntityType =
  | "property"
  | "building"
  | "unit"
  | "owner"
  | "tenant"
  | "contractor"
  | "invoice"
  | "transaction"
  | "email"
  | "letter";

export type EntityRecord = {
  id: string;
  type: EntityType;
  displayName: string;
  canonicalFields: Record<string, unknown>;
  relatedEntityIds: string[];
};

export type EntityAlias = {
  entityId: string;
  alias: string;
  aliasType: "id" | "name" | "email" | "phone" | "iban" | "address" | "unit_number" | "invoice_number" | "filename" | "thread_id";
  source: "stammdaten" | "filename" | "index_csv" | "parsed_source";
};

export type EntityIndex = {
  schemaVersion: number;
  propertyId: string;
  generatedAt: string;
  entities: Record<string, EntityRecord>;
  aliases: Record<string, EntityAlias[]>;
  stats: Record<string, number>;
};

export type WorkItemKind =
  | "master_data_bundle"
  | "email_thread"
  | "email_single"
  | "invoice_group"
  | "letter_group"
  | "bank_group"
  | "incremental_day";

export type WorkItemProcessor =
  | "structured_extractor"
  | "email_thread_extractor"
  | "pdf_letter_extractor"
  | "invoice_bank_reconciler";

export type WorkItemStatus = "pending" | "processing" | "processed" | "ignored" | "error";

export type WorkItemGlimpse = {
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

export type WorkItem = {
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

export type ObservationKind =
  | "entity_profile"
  | "maintenance_issue"
  | "meeting_decision"
  | "payment"
  | "invoice"
  | "document_metadata"
  | "communication_metadata"
  | "source_bundle"
  | "legal_dispute"
  | "rent_change"
  | "termination"
  | "communication_preference"
  | "noise";

export type ObservationDecision = "keep" | "ignore" | "duplicate" | "needs_review";

export type EntityResolution = {
  entityId: string;
  matchType: "declared_id" | "field_reference" | "candidate";
  reason: string;
};

export type EvidenceRef = {
  sourceId: string;
  normalizedPath?: string;
  quote?: string;
  page?: number;
  field?: string;
  lineStart?: number;
  lineEnd?: number;
};

export type Observation = {
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
  decision: ObservationDecision;
  reason: string;
  createdBy: WorkItemProcessor;
  attributes: Record<string, unknown>;
};

export type IgnoreDecision = {
  decisionId: string;
  workItemId: string;
  inputHash: string;
  sourceIds: string[];
  propertyId: string;
  reason: string;
  createdBy: WorkItemProcessor;
};

export type DuplicateDecision = {
  decisionId: string;
  workItemId: string;
  inputHash: string;
  sourceIds: string[];
  propertyId: string;
  duplicateOf: string;
  reason: string;
  createdBy: WorkItemProcessor;
};

export type ErrorRecord = {
  errorId: string;
  workItemId: string;
  inputHash: string;
  sourceIds: string[];
  propertyId: string;
  error: string;
  createdBy: WorkItemProcessor;
};

export type ExtractionSummary = {
  generatedAt: string;
  propertyId: string;
  workItems: number;
  extractedWorkItems: number;
  reusedWorkItems: number;
  erroredWorkItems: number;
  observations: number;
  ignoreDecisions: number;
  duplicateDecisions: number;
  errorRecords: number;
};

export type FactKind =
  | "property_profile"
  | "building"
  | "unit"
  | "owner"
  | "tenant"
  | "contractor"
  | "payment"
  | "invoice"
  | "document"
  | "communication"
  | "source_bundle"
  | "review_item";

export type FactRecord = {
  factId: string;
  propertyId: string;
  kind: FactKind;
  subjectId?: string;
  statement: string;
  structured: Record<string, unknown>;
  sourceObservationIds: string[];
  sourceIds: string[];
  mentions: string[];
  evidence: EvidenceRef[];
  decision: ObservationDecision;
  updatedAt: string;
};

export type FactIndex = {
  schemaVersion: number;
  propertyId: string;
  generatedAt: string;
  factCount: number;
  stats: Record<string, number>;
  facts: FactRecord[];
};

export type ContextSection = {
  sectionId: string;
  title: string;
  hash: string;
  content: string;
  sourceFactIds: string[];
};

export type PatchLogEntry = {
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

export type CoverageReport = {
  generatedAt: string;
  propertyId: string;
  sourceCount: number;
  eligibleSourceCount: number;
  assignedSourceCount: number;
  duplicateAssignments: string[];
  missingAssignments: string[];
  normalizedMissingArtifacts: string[];
  workItemCount: number;
  pendingWorkItemCount: number;
  terminalWorkItemCount: number;
};
