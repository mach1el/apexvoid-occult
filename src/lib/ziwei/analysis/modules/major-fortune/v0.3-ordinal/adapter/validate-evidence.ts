import type { MajorFortuneOrdinalEvidence } from "../types";

export interface AdapterEvidenceValidationIssue {
  evidenceId: string;
  message: string;
}

/** Adapter output must require physicalFactKind even if core type allows omitting it. */
export function validateAdapterEvidence(
  evidence: MajorFortuneOrdinalEvidence[],
): AdapterEvidenceValidationIssue[] {
  const issues: AdapterEvidenceValidationIssue[] = [];
  for (const e of evidence) {
    const id = e.evidenceId || "<missing-evidenceId>";
    if (!e.evidenceId?.trim()) issues.push({ evidenceId: id, message: "empty evidenceId" });
    if (!e.physicalFactId?.trim()) issues.push({ evidenceId: id, message: "empty physicalFactId" });
    if (!e.physicalFactKind?.trim()) {
      issues.push({ evidenceId: id, message: "empty physicalFactKind (required for adapter output)" });
    }
    if (!e.evidenceClusterId?.trim()) {
      issues.push({ evidenceId: id, message: "empty evidenceClusterId" });
    }
    if (!e.signalFamilyId?.trim()) issues.push({ evidenceId: id, message: "empty signalFamilyId" });
    if (!e.direction) issues.push({ evidenceId: id, message: "missing direction" });
    if (!e.strength) issues.push({ evidenceId: id, message: "missing strength" });
    if (e.temporalScope !== "major-fortune") {
      issues.push({ evidenceId: id, message: `temporalScope must be major-fortune, got ${e.temporalScope}` });
    }
    if (!e.factIds?.length) issues.push({ evidenceId: id, message: "empty factIds" });
    if (!e.sourceIds?.length) issues.push({ evidenceId: id, message: "empty sourceIds" });
    if (!e.claimIds?.length) issues.push({ evidenceId: id, message: "empty claimIds" });
    if (!e.policyStatus) issues.push({ evidenceId: id, message: "missing policyStatus" });
    if (!e.schoolScope?.length) issues.push({ evidenceId: id, message: "empty schoolScope" });
    if (!e.reasonCode?.trim()) issues.push({ evidenceId: id, message: "empty reasonCode" });
  }
  return issues;
}
