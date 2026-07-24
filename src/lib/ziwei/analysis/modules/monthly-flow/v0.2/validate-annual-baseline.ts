import type { AnnualBaselineInput, AnnualBaselineValidationResult } from "./types";

export function validateAnnualBaseline(
  baseline: AnnualBaselineInput | null
): AnnualBaselineValidationResult {
  if (!baseline) {
    return {
      status: "unavailable",
      reasonCodes: ["annual-baseline-unavailable"]
    };
  }

  if (
    !Number.isFinite(baseline.score) ||
    baseline.score < 0 ||
    baseline.score > 100 ||
    !baseline.sourceModule?.trim() ||
    !baseline.sourceContractVersion?.trim() ||
    !baseline.sourceEngineVersion?.trim()
  ) {
    return {
      status: "unavailable",
      reasonCodes: ["annual-baseline-invalid"]
    };
  }

  return {
    status: "resolved",
    reasonCodes: []
  };
}
