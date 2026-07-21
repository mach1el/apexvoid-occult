import type { ChartData } from "@/types/chart";
import { ANNUAL_AXIS_DOMAINS, type AnnualAxisDomain } from "../../../contracts/annual-axes";
import type { AnnualAxesKnowledgeV04NamPhai } from "../../../knowledge/annual-axes/v0.4";
import { loadAnnualAxesKnowledgeV04NamPhai } from "../../../knowledge/annual-axes/v0.4";
import { loadAnnualAxesKnowledgeV042NamPhai } from "../../../knowledge/annual-axes/v0.4.2";
import type {
  AnnualAxesKnowledgeV08NamPhai,
  V08ScoreProfileId,
} from "../../../knowledge/annual-axes/v0.8";
import { loadPalaceOverviewKnowledgeV1 } from "../../../knowledge";
import { buildAnnualFocusFrame } from "../build-annual-focus-frame";
import { resolveAnnualFocus } from "../resolvers/resolve-annual-focus";
import { emptyAnnualAxesDiagnostics } from "../diagnostics";
import { collectNamPhaiV04TriggeredEvidence } from "../nam-phai-v04/collect-evidence";
import { computeDomainRoutingsV04 } from "../nam-phai-v04/routing";
import { resolveDomainRootV08 } from "./resolve-domain-root";
import { partitionDirectAnchorEligibility } from "./eligibility";
import { dedupeV08SpatialPaths } from "./dedupe";
import { aggregateV08Direct, type V08DirectAggregateResult } from "./aggregate-direct";
import { scoreV08Domain, type V08DomainScoreTrace } from "./score-domain";

export interface V08DomainIntermediate {
  domain: AnnualAxisDomain;
  aggregate: V08DirectAggregateResult;
  score: number;
  confidence: number;
  activationGate: number;
  effectiveZ: number;
  directSignedRaw: number;
  annualActivationRaw: number;
  trace: V08DomainScoreTrace;
  unavailableReasonCodes?: string[];
}

export function scoreV08ChartDomains(
  chart: ChartData,
  knowledge08: AnnualAxesKnowledgeV08NamPhai,
  options?: {
    candidateId?: V08ScoreProfileId;
    scoreStepPerRobustSigma?: number;
    domainCenterOverride?: Partial<Record<AnnualAxisDomain, number>>;
    robustScaleOverride?: Partial<Record<AnnualAxisDomain, number>>;
    activationScaleOverride?: Partial<Record<AnnualAxisDomain, number>>;
  },
): V08DomainIntermediate[] | null {
  const knowledge04 = loadAnnualAxesKnowledgeV04NamPhai();
  const knowledge042 = loadAnnualAxesKnowledgeV042NamPhai();
  const numeric = loadPalaceOverviewKnowledgeV1();
  if (!knowledge04.ok || !knowledge042.ok || !numeric.ok) return null;

  const diagnostics = emptyAnnualAxesDiagnostics();
  const focus = resolveAnnualFocus(chart, "nam-phai");
  const headFrame = focus.focus ? buildAnnualFocusFrame(chart, focus.focus) : null;
  if (!headFrame) return null;

  const selected =
    options?.candidateId ??
    knowledge08.calibration.selectedVariant ??
    "DIRECT-STRICT-18";
  const step =
    options?.scoreStepPerRobustSigma ??
    knowledge08.scoreProfile.scoreProfiles.find((p) => p.id === selected)
      ?.scoreStepPerRobustSigma ??
    18;

  const routings = computeDomainRoutingsV04(
    chart,
    knowledge04.knowledge,
    headFrame,
    diagnostics,
  );
  const out: V08DomainIntermediate[] = [];

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const root = resolveDomainRootV08(chart, domain, knowledge08);
    if (!root.ok) {
      out.push({
        domain,
        aggregate: null as unknown as V08DirectAggregateResult,
        score: 50,
        confidence: 0,
        activationGate: 0,
        effectiveZ: 0,
        directSignedRaw: 0,
        annualActivationRaw: 0,
        trace: null as unknown as V08DomainScoreTrace,
        unavailableReasonCodes: root.reasonCodes,
      });
      continue;
    }

    const routing = routings.get(domain);
    if (!routing) {
      out.push({
        domain,
        aggregate: null as unknown as V08DirectAggregateResult,
        score: 50,
        confidence: 0,
        activationGate: 0,
        effectiveZ: 0,
        directSignedRaw: 0,
        annualActivationRaw: 0,
        trace: null as unknown as V08DomainScoreTrace,
        unavailableReasonCodes: ["missing-routing"],
      });
      continue;
    }

    const { evidence } = collectNamPhaiV04TriggeredEvidence({
      chart,
      domain,
      knowledge: knowledge04.knowledge,
      knowledge042: knowledge042.knowledge,
      numericKnowledge: numeric.knowledge,
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
      domainCenterOverride: options?.domainCenterOverride?.[domain],
      robustScaleOverride: options?.robustScaleOverride?.[domain],
      activationScaleOverride: options?.activationScaleOverride?.[domain],
    });

    out.push({
      domain,
      aggregate,
      score: scored.score,
      confidence: scored.confidence,
      activationGate: scored.activationGate,
      effectiveZ: scored.effectiveZ,
      directSignedRaw: scored.directSignedRaw,
      annualActivationRaw: aggregate.annualActivationRaw,
      trace: scored.trace,
    });
  }

  return out;
}

export function resolveBand(score: number, knowledge04: AnnualAxesKnowledgeV04NamPhai) {
  for (const band of knowledge04.deltaProfile.bands) {
    const aboveMin = score >= band.minInclusive;
    const belowMax =
      band.maxExclusive !== undefined
        ? score < band.maxExclusive
        : band.maxInclusive !== undefined
          ? score <= band.maxInclusive
          : true;
    if (aboveMin && belowMax) return band.id;
  }
  return "balanced" as const;
}
