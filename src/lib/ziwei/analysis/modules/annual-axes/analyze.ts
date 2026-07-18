import type { ChartData } from "@/types/chart";
import type { ZiweiSchool } from "../../facts";
import { ANNUAL_AXIS_DOMAINS, type AnnualAxisDomain } from "../../contracts/annual-axes";
import { loadPalaceOverviewKnowledgeV1 } from "../../knowledge";
import { loadAnnualAxesKnowledgeV0 } from "../../knowledge/annual-axes";
import { collectDomainAnchorFrames } from "./collect-domain-frames";
import { collectStarEvidence } from "./collect-star-evidence";
import { collectMutagenEvidence } from "./collect-mutagen-evidence";
import { collectFocalEvidence } from "./collect-focal-evidence";
import { aggregateDomainEvidence } from "./aggregate";
import { sumWeightedAxes, normalizeAnnualAxes } from "./normalize";
import { dedupeAnnualAxesDiagnostics, emptyAnnualAxesDiagnostics } from "./diagnostics";
import {
  emptyAnnualAxes,
  type AnnualAxesDiagnostics,
  type AnnualAxesResult,
  type AnnualAxisEvidence,
  type AnnualAxisResult,
} from "./types";

const CONTRACT_VERSION = "0.1.0";
const ENGINE_VERSION = "0.1.0";
const TOP_DRIVER_COUNT = 3;

function topDrivers(
  evidence: AnnualAxisEvidence[],
  axis: "support" | "pressure",
): AnnualAxisEvidence[] {
  return evidence
    .filter((e) => e.weightedAxes[axis] > 0)
    .sort((a, b) => b.weightedAxes[axis] - a.weightedAxes[axis])
    .slice(0, TOP_DRIVER_COUNT);
}

function unavailableAxisResult(domain: AnnualAxisDomain): AnnualAxisResult {
  const zero = emptyAnnualAxes();
  return {
    domain,
    score: 0,
    band: "guarded",
    rawAxes: zero,
    normalizedAxes: zero,
    intensity: 0,
    conflict: 0,
    evidence: [],
    topSupportDrivers: [],
    topPressureDrivers: [],
  };
}

function unavailableResult(
  school: ZiweiSchool,
  annualYear: number,
  diagnostics: AnnualAxesDiagnostics,
): AnnualAxesResult {
  const axes = {} as Record<AnnualAxisDomain, AnnualAxisResult>;
  for (const domain of ANNUAL_AXIS_DOMAINS) axes[domain] = unavailableAxisResult(domain);

  return {
    module: "annual-axes",
    annualYear,
    school,
    versions: {
      contractVersion: CONTRACT_VERSION,
      engineVersion: ENGINE_VERSION,
      knowledgeVersion: "unavailable",
    },
    status: "unavailable",
    axes,
    diagnostics: dedupeAnnualAxesDiagnostics(diagnostics),
  };
}

function hasAnnualStructure(chart: ChartData): boolean {
  return Boolean(chart.annualPalace) || Boolean(chart.annualStars && chart.annualStars.length > 0);
}

/**
 * Public entry point — deterministic annual axes scoring for one chart +
 * school + annual year. Never mutates `chart` or the loaded knowledge.
 */
export function analyzeAnnualAxes(chart: ChartData, options: { school: ZiweiSchool }): AnnualAxesResult {
  const { school } = options;
  const diagnostics = emptyAnnualAxesDiagnostics();

  const annualKnowledgeResult = loadAnnualAxesKnowledgeV0();
  if (!annualKnowledgeResult.ok) {
    diagnostics.invalidKnowledge.push(
      ...annualKnowledgeResult.issues.map((issue) => `${issue.path}: ${issue.message}`),
    );
    return unavailableResult(school, chart.annualYear, diagnostics);
  }
  const annualKnowledge = annualKnowledgeResult.knowledge;

  const numericKnowledgeResult = loadPalaceOverviewKnowledgeV1();
  if (!numericKnowledgeResult.ok) {
    diagnostics.invalidKnowledge.push(
      ...numericKnowledgeResult.issues.map((issue) => `${issue.path}: ${issue.message}`),
    );
    return unavailableResult(school, chart.annualYear, diagnostics);
  }
  const numericKnowledge = numericKnowledgeResult.knowledge;

  if (!hasAnnualStructure(chart)) {
    diagnostics.missingRequiredAnnualFacts.push("chart:annual-structure");
    return unavailableResult(school, chart.annualYear, diagnostics);
  }

  const axes = {} as Record<AnnualAxisDomain, AnnualAxisResult>;

  for (const domainDefinition of annualKnowledge.axisDefinitions.domains) {
    const domain = domainDefinition.domain;
    const frames = collectDomainAnchorFrames(chart, domainDefinition, diagnostics);

    if (frames.length === 0) {
      diagnostics.missingRequiredAnnualFacts.push(domain);
      axes[domain] = unavailableAxisResult(domain);
      continue;
    }

    const candidates: AnnualAxisEvidence[] = [
      ...collectStarEvidence({ chart, domain, frames, numericKnowledge, annualKnowledge, diagnostics }),
      ...collectMutagenEvidence({ chart, domain, frames, annualKnowledge, diagnostics }),
      ...collectFocalEvidence({ chart, domain, frames, school, annualKnowledge, diagnostics }),
    ];

    const evidence = aggregateDomainEvidence(candidates, annualKnowledge.scoringProfile);
    const rawAxes = sumWeightedAxes(evidence);
    const normalized = normalizeAnnualAxes(rawAxes, annualKnowledge.scoringProfile);

    axes[domain] = {
      domain,
      score: normalized.score,
      band: normalized.band,
      rawAxes,
      normalizedAxes: normalized.normalizedAxes,
      intensity: normalized.intensity,
      conflict: normalized.conflict,
      evidence,
      topSupportDrivers: topDrivers(evidence, "support"),
      topPressureDrivers: topDrivers(evidence, "pressure"),
    };
  }

  return {
    module: "annual-axes",
    annualYear: chart.annualYear,
    school,
    versions: {
      contractVersion: CONTRACT_VERSION,
      engineVersion: ENGINE_VERSION,
      knowledgeVersion: `${annualKnowledge.scoringProfile.profileId}@${annualKnowledge.scoringProfile.schemaVersion}`,
    },
    status: "available",
    axes,
    diagnostics: dedupeAnnualAxesDiagnostics(diagnostics),
  };
}
