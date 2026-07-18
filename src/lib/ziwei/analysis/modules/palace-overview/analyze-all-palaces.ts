import {
  indexFactsByPalace,
  normalizeNatalFacts,
  type ZiweiSchool,
} from "../../facts";
import {
  loadPalaceOverviewKnowledgeV1,
  loadPalaceOverviewSemanticKnowledgeV1,
  type PalaceOverviewKnowledgeV1,
  type PalaceOverviewSemanticKnowledgeV1,
} from "../../knowledge";
import type { ChartData } from "@/types/chart";
import { analyzePalace } from "./analyze-palace";
import { emptyDiagnostics } from "./collect-evidence";
import {
  emptySemanticDiagnostics,
  type PalaceOverviewDiagnostics,
  type PalaceOverviewResult,
  type PalaceOverviewSemanticDiagnostics,
} from "./types";

export interface AnalyzeAllPalacesOptions {
  school: ZiweiSchool;
  knowledge?: PalaceOverviewKnowledgeV1;
  semanticKnowledge?: PalaceOverviewSemanticKnowledgeV1;
}

export interface AnalyzeAllPalacesResult {
  results: PalaceOverviewResult[];
  diagnostics: PalaceOverviewDiagnostics;
  knowledgeValid: boolean;
  knowledgeIssues?: string[];
  /** V1.2 — independent of knowledgeValid: a broken semantic pack never
   *  disables numeric V1.1 scoring. */
  semanticStatus: "available" | "unavailable";
  semanticIssues?: string[];
  semanticDiagnostics: PalaceOverviewSemanticDiagnostics;
}

/**
 * Analyze all 12 palaces. Normalizes natal facts and loads knowledge once.
 */
export function analyzeAllPalaces(
  chart: ChartData,
  options: AnalyzeAllPalacesOptions,
): AnalyzeAllPalacesResult {
  const diagnostics = emptyDiagnostics();
  const loaded =
    options.knowledge != null
      ? { ok: true as const, knowledge: options.knowledge }
      : loadPalaceOverviewKnowledgeV1();

  // V1.2: semantic knowledge is loaded/validated fully independently of the
  // numeric bundle above — a broken semantic pack must never affect V1.1.
  const semanticLoaded =
    options.semanticKnowledge != null
      ? { ok: true as const, knowledge: options.semanticKnowledge }
      : loadPalaceOverviewSemanticKnowledgeV1();
  const semanticStatus: "available" | "unavailable" = semanticLoaded.ok
    ? "available"
    : "unavailable";
  const semanticIssues = semanticLoaded.ok
    ? undefined
    : semanticLoaded.issues.map((i) => `${i.path}: ${i.message}`);
  const semanticDiagnostics = emptySemanticDiagnostics();

  if (!loaded.ok) {
    return {
      results: [],
      diagnostics,
      knowledgeValid: false,
      knowledgeIssues: loaded.issues.map((i) => `${i.path}: ${i.message}`),
      semanticStatus,
      semanticIssues,
      semanticDiagnostics,
    };
  }

  const { facts, duplicateIds } = normalizeNatalFacts(chart, {
    school: options.school,
  });
  diagnostics.duplicateFacts.push(...duplicateIds);
  const factsByPalace = indexFactsByPalace(facts);

  const results: PalaceOverviewResult[] = [];
  for (const palace of chart.palaces) {
    // Per-palace diagnostics bucket — share global unknown lists carefully.
    const localDiag = emptyDiagnostics();
    const result = analyzePalace({
      chart,
      palaceIndex: palace.index,
      school: options.school,
      factsByPalace,
      knowledge: loaded.knowledge,
      duplicateFactIds: duplicateIds,
      diagnostics: localDiag,
      semanticKnowledge: semanticLoaded.ok ? semanticLoaded.knowledge : undefined,
      semanticDiagnostics,
    });
    results.push(result);
    diagnostics.unknownStars.push(...localDiag.unknownStars);
    diagnostics.missingBrightness.push(...localDiag.missingBrightness);
    diagnostics.unmappedTransformations.push(
      ...localDiag.unmappedTransformations,
    );
    diagnostics.contextOnlyFacts.push(...localDiag.contextOnlyFacts);
    diagnostics.ruleHits.push(...localDiag.ruleHits);
  }

  // Dedupe diagnostic lists
  diagnostics.unknownStars = [...new Set(diagnostics.unknownStars)];
  diagnostics.missingBrightness = [...new Set(diagnostics.missingBrightness)];
  diagnostics.unmappedTransformations = [
    ...new Set(diagnostics.unmappedTransformations),
  ];
  diagnostics.contextOnlyFacts = [...new Set(diagnostics.contextOnlyFacts)];
  diagnostics.duplicateFacts = [...new Set(diagnostics.duplicateFacts)];
  semanticDiagnostics.unresolvedPairParticipants = [
    ...new Set(semanticDiagnostics.unresolvedPairParticipants),
  ];
  semanticDiagnostics.unmappedTargetTraits = [
    ...new Set(semanticDiagnostics.unmappedTargetTraits),
  ];
  semanticDiagnostics.unknownProjectionTraits = [
    ...new Set(semanticDiagnostics.unknownProjectionTraits),
  ];
  semanticDiagnostics.missingSemanticSources = [
    ...new Set(semanticDiagnostics.missingSemanticSources),
  ];

  return {
    results,
    diagnostics,
    knowledgeValid: true,
    semanticStatus,
    semanticIssues,
    semanticDiagnostics,
  };
}
