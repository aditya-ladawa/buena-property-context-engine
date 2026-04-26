import { COVERAGE_REPORT_PATH, PROPERTY_ID } from "../config";
import type { CoverageReport, SourceRegistry, WorkItem } from "../types";
import { writeText } from "../utils/fs";

function eligibleSourceIds(registry: SourceRegistry) {
  return registry.sources
    .filter((source) => source.status === "normalized" && source.normalizedPaths.length > 0)
    .map((source) => source.sourceId)
    .sort();
}

export function validateCoverage(registry: SourceRegistry, workItems: WorkItem[], now = new Date().toISOString()): CoverageReport {
  const eligible = eligibleSourceIds(registry);
  const assignmentCounts = new Map<string, number>();
  const normalizedMissingArtifacts = registry.sources
    .filter((source) => source.status === "normalized" && source.normalizedPaths.length === 0)
    .map((source) => source.sourceId)
    .sort();

  for (const workItem of workItems) {
    for (const sourceId of workItem.sourceIds) {
      assignmentCounts.set(sourceId, (assignmentCounts.get(sourceId) ?? 0) + 1);
    }
  }

  const missingAssignments = eligible.filter((sourceId) => !assignmentCounts.has(sourceId));
  const duplicateAssignments = [...assignmentCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sourceId]) => sourceId)
    .sort();
  const terminalStatuses = new Set(["processed", "ignored", "error"]);
  const terminalWorkItemCount = workItems.filter((workItem) => terminalStatuses.has(workItem.status)).length;

  return {
    generatedAt: now,
    propertyId: PROPERTY_ID,
    sourceCount: registry.sources.length,
    eligibleSourceCount: eligible.length,
    assignedSourceCount: eligible.length - missingAssignments.length,
    duplicateAssignments,
    missingAssignments,
    normalizedMissingArtifacts,
    workItemCount: workItems.length,
    pendingWorkItemCount: workItems.length - terminalWorkItemCount,
    terminalWorkItemCount,
  };
}

export async function writeCoverageReport(report: CoverageReport) {
  const status = report.missingAssignments.length === 0 && report.duplicateAssignments.length === 0 && report.normalizedMissingArtifacts.length === 0 ? "PASS" : "FAIL";
  const lines = [
    "# Coverage Report",
    "",
    `- Property: ${report.propertyId}`,
    `- Generated: ${report.generatedAt}`,
    `- Source assignment status: ${status}`,
    `- Sources: ${report.sourceCount}`,
    `- Eligible normalized sources: ${report.eligibleSourceCount}`,
    `- Assigned normalized sources: ${report.assignedSourceCount}`,
    `- Work items: ${report.workItemCount}`,
    `- Terminal work items: ${report.terminalWorkItemCount}`,
    `- Pending work items: ${report.pendingWorkItemCount}`,
    "",
    "## Missing Assignments",
    "",
    ...(report.missingAssignments.length > 0 ? report.missingAssignments.map((sourceId) => `- ${sourceId}`) : ["- None"]),
    "",
    "## Duplicate Assignments",
    "",
    ...(report.duplicateAssignments.length > 0 ? report.duplicateAssignments.map((sourceId) => `- ${sourceId}`) : ["- None"]),
    "",
    "## Normalized Sources Missing Artifacts",
    "",
    ...(report.normalizedMissingArtifacts.length > 0 ? report.normalizedMissingArtifacts.map((sourceId) => `- ${sourceId}`) : ["- None"]),
    "",
    "## Extraction Outcomes",
    "",
    report.pendingWorkItemCount > 0
      ? "- Work items are queued and pending extraction. Terminal outcome validation starts after extraction writes observations, ignore decisions, or errors."
      : "- All work items have terminal outcomes.",
  ];
  await writeText(COVERAGE_REPORT_PATH, `${lines.join("\n")}\n`);
}
