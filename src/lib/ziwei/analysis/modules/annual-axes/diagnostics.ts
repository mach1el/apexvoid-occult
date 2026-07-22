import { emptyAnnualAxesDiagnostics, type AnnualAxesDiagnostics } from "./types";

export { emptyAnnualAxesDiagnostics };

/** Collapse duplicate diagnostic entries accumulated across the six domains
 * into a stable, deterministically ordered list per field. */
export function dedupeAnnualAxesDiagnostics(diagnostics: AnnualAxesDiagnostics): AnnualAxesDiagnostics {
  const dedupeSorted = (values: string[]): string[] => Array.from(new Set(values)).sort();

  return {
    invalidKnowledge: dedupeSorted(diagnostics.invalidKnowledge),
    missingAnnualPalaceNames: dedupeSorted(diagnostics.missingAnnualPalaceNames),
    unresolvedAnnualTargets: dedupeSorted(diagnostics.unresolvedAnnualTargets),
    unknownStars: dedupeSorted(diagnostics.unknownStars),
    unknownMutagens: dedupeSorted(diagnostics.unknownMutagens),
    forbiddenSchoolMarkers: dedupeSorted(diagnostics.forbiddenSchoolMarkers),
    missingRequiredAnnualFacts: dedupeSorted(diagnostics.missingRequiredAnnualFacts),
    incompleteChartPalaces: dedupeSorted(diagnostics.incompleteChartPalaces),
    duplicateNatalPalaceNames: dedupeSorted(diagnostics.duplicateNatalPalaceNames),
    missingDomainAnchor: dedupeSorted(diagnostics.missingDomainAnchor),
    ambiguousDomainAnchor: dedupeSorted(diagnostics.ambiguousDomainAnchor),
    missingAnnualHeadPalace: dedupeSorted(diagnostics.missingAnnualHeadPalace),
    duplicateAnnualHeadPalaces: dedupeSorted(diagnostics.duplicateAnnualHeadPalaces),
    annualHeadPointerFlagMismatch: dedupeSorted(diagnostics.annualHeadPointerFlagMismatch),
    missingSmallLimitPalace: dedupeSorted(diagnostics.missingSmallLimitPalace),
    invalidAnnualFocusPalace: dedupeSorted(diagnostics.invalidAnnualFocusPalace),
    missingAnnualFocusFrameNodes: dedupeSorted(diagnostics.missingAnnualFocusFrameNodes),
    unsupportedSchoolPolicy: dedupeSorted(diagnostics.unsupportedSchoolPolicy),
  };
}
