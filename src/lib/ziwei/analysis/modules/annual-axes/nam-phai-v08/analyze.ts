import type { ChartData } from "@/types/chart";
import type { AnnualAxisDomain } from "../../../contracts/annual-axes";
import {
  loadAnnualAxesKnowledgeV04NamPhai,
  type AnnualAxesKnowledgeV04NamPhai,
} from "../../../knowledge/annual-axes/v0.4";
import { loadAnnualAxesKnowledgeV042NamPhai } from "../../../knowledge/annual-axes/v0.4.2";
import { loadAnnualAxesKnowledgeV08NamPhai } from "../../../knowledge/annual-axes/v0.8";
import { loadPalaceOverviewKnowledgeV1 } from "../../../knowledge";
import { buildAnnualFocusFrame } from "../build-annual-focus-frame";
import { resolveAnnualFocus } from "../resolvers/resolve-annual-focus";
import {
  dedupeAnnualAxesDiagnostics,
  emptyAnnualAxesDiagnostics,
} from "../diagnostics";
import { collectNamPhaiV04TriggeredEvidence } from "../nam-phai-v04/collect-evidence";
import { computeDomainRoutingsV04 } from "../nam-phai-v04/routing";
import {
  type AnnualAxesCapabilities,
  type AnnualAxesResult,
  type AnnualAxisEvidence,
  type AnnualAxisBand,
  type AnnualAxisResult,
  type AnnualFocusSummary,
  type AnnualAxesDiagnostics,
} from "../types";
import { ANNUAL_AXIS_DOMAINS } from "../../../contracts/annual-axes";
import { resolveDomainRootV08 } from "./resolve-domain-root";
import { partitionDirectAnchorEligibility } from "./eligibility";
import { dedupeV08SpatialPaths } from "./dedupe";
import { aggregateV08Direct } from "./aggregate-direct";
import { scoreV08Domain } from "./score-domain";
import { resolveBand } from "./score-chart";
import type { V08ScoreProfileId } from "../../../knowledge/annual-axes/v0.8";

const CONTRACT_VERSION = "0.8.0";
const ENGINE_VERSION = "0.8.0";
const TOP_DRIVER_COUNT = 3;

function topDrivers(
  evidence: AnnualAxisEvidence[],
  axis: "support" | "pressure",
): AnnualAxisEvidence[] {
  return evidence
    .filter((e) => e.retainedForSignedScore === true && e.weightedAxes[axis] > 0)
    .sort((a, b) => b.weightedAxes[axis] - a.weightedAxes[axis])
    .slice(0, TOP_DRIVER_COUNT);
}

function unavailableAxisResult(
  domain: AnnualAxisDomain,
  reasonCodes: string[],
): AnnualAxisResult {
  return {
    domain,
    status: "unavailable",
    score: null,
    band: null,
    evidence: [],
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
  const capabilities: AnnualAxesCapabilities = {
    supportsDomainScoring: false,
    supportsAnnualFocus: false,
    domainAnchorCoordinate: "natal-palace-name",
    domainAnchorProvenance: "nam-phai-natal-domain-anchor",
    primaryAnnualFocus: "annual-major-fortune",
  };
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
    capabilities,
    annualFocus: null,
  };
}

/** Nam Phái Annual Axes V0.8 direct-anchor robust scoring core. */
export function analyzeAnnualAxesNamPhaiV08(chart: ChartData): AnnualAxesResult {
  const diagnostics = emptyAnnualAxesDiagnostics();

  const knowledge04Result = loadAnnualAxesKnowledgeV04NamPhai();
  if (!knowledge04Result.ok) {
    for (const issue of knowledge04Result.issues) {
      diagnostics.invalidKnowledge.push(`${issue.path}: ${issue.message}`);
    }
    return invalidKnowledgeResult(chart.annualYear, diagnostics, "unavailable");
  }
  const knowledge04 = knowledge04Result.knowledge;

  const knowledge042Result = loadAnnualAxesKnowledgeV042NamPhai();
  if (!knowledge042Result.ok) {
    for (const issue of knowledge042Result.issues) {
      diagnostics.invalidKnowledge.push(`v0.4.2:${issue.path}: ${issue.message}`);
    }
    return invalidKnowledgeResult(chart.annualYear, diagnostics, "unavailable");
  }
  const knowledge042 = knowledge042Result.knowledge;

  const knowledge08Result = loadAnnualAxesKnowledgeV08NamPhai();
  if (!knowledge08Result.ok) {
    for (const issue of knowledge08Result.issues) {
      diagnostics.invalidKnowledge.push(`v0.8:${issue.path}: ${issue.message}`);
    }
    return invalidKnowledgeResult(chart.annualYear, diagnostics, "unavailable");
  }
  const knowledge08 = knowledge08Result.knowledge;

  const numericResult = loadPalaceOverviewKnowledgeV1();
  if (!numericResult.ok) {
    for (const issue of numericResult.issues) {
      diagnostics.invalidKnowledge.push(`numeric:${issue.path}: ${issue.message}`);
    }
    return invalidKnowledgeResult(chart.annualYear, diagnostics, "unavailable");
  }
  const numericKnowledge = numericResult.knowledge;

  const focusResolution = resolveAnnualFocus(chart, "nam-phai");
  const headFrame = focusResolution.focus
    ? buildAnnualFocusFrame(chart, focusResolution.focus)
    : null;

  const axes = {} as Record<AnnualAxisDomain, AnnualAxisResult>;

  if (!headFrame) {
    for (const domain of ANNUAL_AXIS_DOMAINS) {
      axes[domain] = unavailableAxisResult(domain, ["missing-annual-head"]);
    }
    return {
      module: "annual-axes",
      annualYear: chart.annualYear,
      school: "nam-phai",
      versions: {
        contractVersion: CONTRACT_VERSION,
        engineVersion: ENGINE_VERSION,
        knowledgeVersion: `annual-axes-v0.8@${knowledge08.calibration.formulaVersion}`,
      },
      status: "unavailable",
      axes,
      diagnostics: dedupeAnnualAxesDiagnostics(diagnostics),
      capabilities: {
        supportsDomainScoring: false,
        supportsAnnualFocus: false,
        domainAnchorCoordinate: "natal-palace-name",
        domainAnchorProvenance: "nam-phai-natal-domain-anchor",
        primaryAnnualFocus: "annual-major-fortune",
      },
      annualFocus: null,
    };
  }

  const selected: V08ScoreProfileId =
    knowledge08.calibration.selectedVariant ?? "DIRECT-STRICT-18";
  const step =
    knowledge08.scoreProfile.scoreProfiles.find((p) => p.id === selected)
      ?.scoreStepPerRobustSigma ?? 18;

  const routings = computeDomainRoutingsV04(chart, knowledge04, headFrame, diagnostics);

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const root = resolveDomainRootV08(chart, domain, knowledge08);
    if (!root.ok) {
      axes[domain] = unavailableAxisResult(domain, root.reasonCodes);
      continue;
    }
    const routing = routings.get(domain);
    if (!routing) {
      axes[domain] = unavailableAxisResult(domain, ["missing-routing"]);
      continue;
    }

    const { evidence, stats } = collectNamPhaiV04TriggeredEvidence({
      chart,
      domain,
      knowledge: knowledge04,
      knowledge042,
      numericKnowledge,
      headFrame,
      routing,
      diagnostics,
    });

    const eligibility = partitionDirectAnchorEligibility(
      evidence,
      root.anchor,
      knowledge08,
    );
    const deduped = dedupeV08SpatialPaths(
      eligibility.signedEligible,
      eligibility.activationEligible,
      eligibility.rejected,
      knowledge08,
    );
    const aggregate = aggregateV08Direct(deduped, eligibility, knowledge08);
    const scored = scoreV08Domain({
      aggregate,
      anchor: root.anchor,
      domain,
      knowledge: knowledge08,
      candidateId: selected,
      scoreStepPerRobustSigma: step,
    });

    axes[domain] = {
      domain,
      status: "available",
      score: scored.score,
      band: resolveBand(scored.score, knowledge04) as AnnualAxisBand,
      rawAxes: aggregate.rawAxes,
      normalizedAxes: {
        support: scored.supportNorm,
        pressure: scored.pressureNorm,
        stability: 0,
        activation: scored.activationGate,
      },
      intensity: scored.intensity,
      conflict: scored.conflict,
      evidence: aggregate.evidence,
      topSupportDrivers: topDrivers(aggregate.evidence, "support"),
      topPressureDrivers: topDrivers(aggregate.evidence, "pressure"),
      annualDelta: Math.round((scored.score - 50) * 10) / 10,
      activationGate: scored.activationGate,
      latent: scored.effectiveZ,
      scoreTrace: scored.trace,
      spatialBudgetTrace: aggregate.spatialBudgetTrace,
      dedupeTrace: deduped.trace,
      collectStats: stats,
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
        frameBranches: headFrame.frameBranches,
      }
    : null;

  return {
    module: "annual-axes",
    annualYear: chart.annualYear,
    school: "nam-phai",
    versions: {
      contractVersion: CONTRACT_VERSION,
      engineVersion: ENGINE_VERSION,
      knowledgeVersion: `annual-axes-v0.8@${knowledge08.calibration.formulaVersion}`,
    },
    status: moduleStatus,
    axes,
    diagnostics: dedupeAnnualAxesDiagnostics(diagnostics),
    capabilities: {
      supportsDomainScoring: moduleStatus !== "unavailable",
      supportsAnnualFocus: annualFocus !== null,
      domainAnchorCoordinate: "natal-palace-name",
      domainAnchorProvenance: "nam-phai-natal-domain-anchor",
      primaryAnnualFocus: "annual-major-fortune",
    },
    annualFocus,
  };
}

// silence unused import warning for type-only usage path
void (null as unknown as AnnualAxesKnowledgeV04NamPhai);
