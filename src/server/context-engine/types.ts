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
