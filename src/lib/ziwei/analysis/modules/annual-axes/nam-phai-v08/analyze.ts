import type { ChartData } from "@/types/chart";
import type { AnnualAxisDomain } from "../../../contracts/annual-axes";
import {
  loadAnnualAxesKnowledgeV08NamPhai,
  type AnnualAxesKnowledgeV08NamPhai,
  type AnnualScoreBandV08,
} from "../../../knowledge/annual-axes/v0.8";
import { buildAnnualFocusFrame } from "../build-annual-focus-frame";
import { resolveAnnualFocus } from "../resolvers/resolve-annual-focus";
import {
  dedupeAnnualAxesDiagnostics,
  emptyAnnualAxesDiagnostics,
} from "../diagnostics";
import {
  type AnnualAxesCapabilities,
  type AnnualAxesResult,
  type AnnualAxisBand,
  type AnnualAxisResult,
  type AnnualFocusSummary,
  type AnnualAxesDiagnostics,
  type AnnualAxisScoreTraceV08,
  type AnnualAxisV08Evidence,
} from "../types";
import { ANNUAL_AXIS_DOMAINS } from "../../../contracts/annual-axes";
import { scoreV08Domain } from "./score-domain";
import type { MatchedStarFact } from "./match-stars";

const CONTRACT_VERSION = "0.8.0";
const ENGINE_VERSION = "0.8.0";
const TOP_DRIVER_COUNT = 3;

function unavailableAxisResult(
  domain: AnnualAxisDomain,
  reasonCodes: string[],
): AnnualAxisResult {
  return {
    domain,
    engine: "v0.8",
    status: "unavailable",
    score: null,
    band: null,
    reasonCodes,
  };
}

function invalidKnowledgeResult(
  annualYear: number,
  diagnostics: AnnualAxesDiagnostics,
  knowledgeVersion: string,
): AnnualAxesResult {
  const axes = {} as Record<AnnualAxisDomain, AnnualAxisResult>;
  for (const domain of ANNUAL_AXIS_DOMAINS) {
    axes[domain] = unavailableAxisResult(domain, ["invalid-knowledge"]);
  }
  return {
    module: "annual-axes",
    annualYear,
    school: "nam-phai",
    versions: {
      contractVersion: CONTRACT_VERSION,
      engineVersion: ENGINE_VERSION,
      knowledgeVersion,
    },
    status: "unavailable",
    axes,
    diagnostics: dedupeAnnualAxesDiagnostics(diagnostics),
    capabilities: {
      supportsDomainScoring: false,
      supportsAnnualFocus: false,
      domainAnchorCoordinate: "annual-palace-name",
      domainAnchorProvenance: "nam-phai-luu-nien-palace-mapping",
      primaryAnnualFocus: "annual-major-fortune",
    },
    annualFocus: null,
  };
}

function resolveBand(
  score: number,
  bands: AnnualScoreBandV08[],
): AnnualAxisBand {
  for (const band of bands) {
    const aboveMin = score >= band.minInclusive;
    const belowMax =
      band.maxExclusive !== undefined
        ? score < band.maxExclusive
        : band.maxInclusive !== undefined
          ? score <= band.maxInclusive
          : true;
    if (aboveMin && belowMax) return band.id as AnnualAxisBand;
  }
  return "balanced";
}

function factToV08Evidence(fact: MatchedStarFact): AnnualAxisV08Evidence {
  return {
    ruleId: fact.ruleId,
    starName: fact.starName,
    exactMatchedStarName: fact.exactMatchedStarName,
    temporalLayer: fact.temporalLayer,
    palaceName: fact.annualPalaceName,
    palaceRole: fact.palaceRole,
    palaceWeight: fact.palaceWeight,
    pointValue: fact.points,
    weightedContribution: fact.weightedContribution,
    polarity: fact.polarity,
    thaiTueProminenceApplied: fact.thaiTueProminenceApplied,
  };
}

function topWeightedDrivers(
  facts: MatchedStarFact[],
  polarity: "positive" | "negative",
): AnnualAxisV08Evidence[] {
  return facts
    .filter((f) => f.polarity === polarity)
    .sort(
      (a, b) =>
        Math.abs(b.weightedContribution) - Math.abs(a.weightedContribution) ||
        a.ruleId.localeCompare(b.ruleId),
    )
    .slice(0, TOP_DRIVER_COUNT)
    .map(factToV08Evidence);
}

/** Nam Phái Annual Axes V0.8 explicit Lưu Niên palace-weighted scoring core. */
export function analyzeAnnualAxesNamPhaiV08(chart: ChartData): AnnualAxesResult {
  const diagnostics = emptyAnnualAxesDiagnostics();

  const knowledge08Result = loadAnnualAxesKnowledgeV08NamPhai();
  if (!knowledge08Result.ok) {
    for (const issue of knowledge08Result.issues) {
      diagnostics.invalidKnowledge.push(`v0.8:${issue.path}: ${issue.message}`);
    }
    return invalidKnowledgeResult(chart.annualYear, diagnostics, "unavailable");
  }
  const knowledge08: AnnualAxesKnowledgeV08NamPhai = knowledge08Result.knowledge;

  const focusResolution = resolveAnnualFocus(chart, "nam-phai");
  const headFrame = focusResolution.focus
    ? buildAnnualFocusFrame(chart, focusResolution.focus)
    : null;

  if (focusResolution.issues.missingAnnualHeadPalace) {
    diagnostics.missingAnnualHeadPalace.push("chart:annualHeadPalace");
  }
  if (focusResolution.issues.missingSmallLimitPalace) {
    diagnostics.missingSmallLimitPalace.push("chart:smallLimitPalace");
  }

  const axes = {} as Record<AnnualAxisDomain, AnnualAxisResult>;

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const scored = scoreV08Domain({ chart, domain, knowledge: knowledge08 });

    if (scored.availability === "unavailable" || scored.score == null) {
      for (const reason of scored.missingReasonCodes) {
        if (reason.startsWith("missing-annual-palace")) {
          diagnostics.missingAnnualPalaceNames.push(reason);
        } else if (reason === "missing-small-limit-palace") {
          diagnostics.missingSmallLimitPalace.push(reason);
        } else {
          diagnostics.missingRequiredAnnualFacts.push(`${domain}:${reason}`);
        }
      }
      axes[domain] = {
        domain,
        engine: "v0.8",
        status: "unavailable",
        score: null,
        band: null,
        reasonCodes: scored.missingReasonCodes,
        coverage: scored.coverage,
        scoreTrace: scored.trace as AnnualAxisScoreTraceV08,
        v08Evidence: [],
        topSupportDriversV08: [],
        topPressureDriversV08: [],
      };
      continue;
    }

    const v08Evidence = scored.matchedFacts.map(factToV08Evidence);
    const status = scored.availability === "partial-data" ? "partial-data" : "available";

    axes[domain] = {
      domain,
      engine: "v0.8",
      status,
      score: scored.score,
      band: resolveBand(scored.score, knowledge08.scoreBands.bands),
      scoreTrace: scored.trace as AnnualAxisScoreTraceV08,
      coverage: scored.coverage,
      v08Evidence,
      topSupportDriversV08: topWeightedDrivers(scored.matchedFacts, "positive"),
      topPressureDriversV08: topWeightedDrivers(scored.matchedFacts, "negative"),
      reasonCodes:
        status === "partial-data" ? scored.missingReasonCodes : undefined,
    };
  }

  const domainStatuses = ANNUAL_AXIS_DOMAINS.map((d) => axes[d].status);
  const moduleStatus = domainStatuses.every((s) => s === "available")
    ? "available"
    : domainStatuses.every((s) => s === "unavailable")
      ? "unavailable"
      : "partial";

  const annualFocus: AnnualFocusSummary | null = focusResolution.focus
    ? {
        mode: focusResolution.focus.mode,
        palaceIndex: focusResolution.focus.palaceIndex,
        palaceName: focusResolution.focus.palaceName,
        palaceBranch: focusResolution.focus.palaceBranch,
        annualPalaceName: focusResolution.focus.annualPalaceName,
        frameBranches: headFrame?.frameBranches ?? [],
      }
    : null;

  const capabilities: AnnualAxesCapabilities = {
    supportsDomainScoring: moduleStatus !== "unavailable",
    supportsAnnualFocus: annualFocus !== null,
    domainAnchorCoordinate: "annual-palace-name",
    domainAnchorProvenance: "nam-phai-luu-nien-palace-mapping",
    primaryAnnualFocus: "annual-major-fortune",
  };

  return {
    module: "annual-axes",
    annualYear: chart.annualYear,
    school: "nam-phai",
    versions: {
      contractVersion: CONTRACT_VERSION,
      engineVersion: ENGINE_VERSION,
      knowledgeVersion: knowledge08.knowledgeVersion,
    },
    status: moduleStatus,
    axes,
    diagnostics: dedupeAnnualAxesDiagnostics(diagnostics),
    capabilities,
    annualFocus,
  };
}
