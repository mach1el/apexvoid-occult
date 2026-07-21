/**
 * Audit-only signed-evidence funnel — walks the real V0.5 pipeline stages
 * without changing scoring behavior.
 */

import type { ChartData } from "@/types/chart";
import { ANNUAL_AXIS_DOMAINS, type AnnualAxisDomain } from "../../../contracts/annual-axes";
import type { AnnualAxesKnowledgeV05NamPhai } from "../../../knowledge/annual-axes/v0.5";
import { loadAnnualAxesKnowledgeV04NamPhai } from "../../../knowledge/annual-axes/v0.4";
import { loadAnnualAxesKnowledgeV042NamPhai } from "../../../knowledge/annual-axes/v0.4.2";
import { loadPalaceOverviewKnowledgeV1 } from "../../../knowledge";
import { buildAnnualFocusFrame } from "../build-annual-focus-frame";
import { resolveAnnualFocus } from "../resolvers/resolve-annual-focus";
import { emptyAnnualAxesDiagnostics } from "../diagnostics";
import { collectNamPhaiV04TriggeredEvidence } from "../nam-phai-v04/collect-evidence";
import { computeDomainRoutingsV04 } from "../nam-phai-v04/routing";
import {
  classifyEvidencePaths,
  type ClassifiedPathCandidate,
} from "../nam-phai-v043/classify-paths";
import { dedupeV05SpatialPaths } from "../nam-phai-v05/dedupe";
import { aggregateV05Buckets } from "../nam-phai-v05/aggregate-buckets";
import type { DedupedSpatialPaths } from "../nam-phai-v043/dedupe";

export interface FunnelStageMass {
  factCount: number;
  supportRaw: number;
  pressureRaw: number;
  supportPressureMassRatio: number;
  supportRetentionOfCandidate: number;
  pressureRetentionOfCandidate: number;
}

export interface RejectionReasonStats {
  candidateCount: number;
  supportRawLost: number;
  pressureRawLost: number;
}

export interface PhysicalFactDedupeDiagnostics {
  uniquePhysicalFactIdCountBeforeDedupe: number;
  duplicateCandidateCount: number;
  supportBearingRejectedByDedupe: number;
  pressureBearingRejectedByDedupe: number;
  supportRawRejectedByDedupe: number;
  pressureRawRejectedByDedupe: number;
  winnerPolarity: {
    supportOnly: number;
    pressureOnly: number;
    both: number;
    zeroSigned: number;
  };
  loserPolarity: {
    supportOnly: number;
    pressureOnly: number;
    both: number;
    zeroSigned: number;
  };
  mixedPolarityCollisionCount: number;
  directTp4cCollisionCount: number;
  annualNatalMajorLayerCollisionCount: number;
  mixedPolarityWinnerCarries: {
    supportOnly: number;
    pressureOnly: number;
    both: number;
    zeroSigned: number;
  };
}

export interface SignedEvidenceFunnel {
  candidate: FunnelStageMass;
  eligible: FunnelStageMass;
  dedupedWinner: FunnelStageMass;
  retained: FunnelStageMass;
  losses: {
    support: {
      eligibilityLost: number;
      dedupeLost: number;
      finalLost: number;
    };
    pressure: {
      eligibilityLost: number;
      dedupeLost: number;
      finalLost: number;
    };
  };
  retentionRates: {
    supportEligibilityRetentionRate: number;
    supportDedupeRetentionRate: number;
    supportFinalRetentionRate: number;
    pressureEligibilityRetentionRate: number;
    pressureDedupeRetentionRate: number;
    pressureFinalRetentionRate: number;
    pressureRelativeRetentionGap: number;
  };
  rejectionByReason: Record<string, RejectionReasonStats>;
  physicalFactDedupe: PhysicalFactDedupeDiagnostics;
  retainedWeighted: {
    supportRaw: number;
    pressureRaw: number;
  };
}

function signedMass(c: ClassifiedPathCandidate): { support: number; pressure: number } {
  return {
    support: Math.max(0, c.evidence.rawAxes.support),
    pressure: Math.max(0, c.evidence.rawAxes.pressure),
  };
}

function polarityOf(support: number, pressure: number): "supportOnly" | "pressureOnly" | "both" | "zeroSigned" {
  const s = support > 0;
  const p = pressure > 0;
  if (s && p) return "both";
  if (s) return "supportOnly";
  if (p) return "pressureOnly";
  return "zeroSigned";
}

function stageFrom(
  candidates: ClassifiedPathCandidate[],
  candidateSupport: number,
  candidatePressure: number,
): FunnelStageMass {
  let supportRaw = 0;
  let pressureRaw = 0;
  for (const c of candidates) {
    const m = signedMass(c);
    supportRaw += m.support;
    pressureRaw += m.pressure;
  }
  return {
    factCount: candidates.length,
    supportRaw,
    pressureRaw,
    supportPressureMassRatio: pressureRaw > 0 ? supportRaw / pressureRaw : supportRaw > 0 ? Infinity : 1,
    supportRetentionOfCandidate: candidateSupport > 0 ? supportRaw / candidateSupport : 1,
    pressureRetentionOfCandidate: candidatePressure > 0 ? pressureRaw / candidatePressure : 1,
  };
}

function normalizeRejectionReason(reason: string): string {
  switch (reason) {
    case "signed-duplicate-same-physical-fact":
      return "duplicate-signed-physical-fact";
    case "direct-wins-collision":
      return "duplicate-signed-physical-fact";
    case "context-only-not-signed":
      return "not-signed-score-eligible";
    case "lower-precedence-duplicate":
      return "lower-precedence-duplicate";
    case "duplicate-annual-activation-physical-fact":
    case "activation-duplicate-same-physical-fact":
    case "not-annual-activation-eligible":
      return reason;
    default:
      return reason || "other-explicit-pipeline-reason";
  }
}

function isSignedEligible(c: ClassifiedPathCandidate): boolean {
  return c.geometryBucket === "direct" || c.geometryBucket === "tp4c";
}

function buildFunnelFromPipeline(
  classified: ClassifiedPathCandidate[],
  deduped: DedupedSpatialPaths,
): SignedEvidenceFunnel {
  const candidate = classified;
  const eligible = classified.filter(isSignedEligible);
  const winners = deduped.signedRetained;

  const candMass = stageFrom(candidate, 0, 0);
  const candidateSupport = candMass.supportRaw;
  const candidatePressure = candMass.pressureRaw;

  const candidateStage = stageFrom(candidate, candidateSupport, candidatePressure);
  const eligibleStage = stageFrom(eligible, candidateSupport, candidatePressure);
  const winnerStage = stageFrom(winners, candidateSupport, candidatePressure);
  // Retained-for-signed-score winners are exactly signedRetained (same set).
  const retainedStage = stageFrom(winners, candidateSupport, candidatePressure);

  const rejectionByReason: Record<string, RejectionReasonStats> = {};
  for (const c of classified) {
    const isWinner = winners.some((w) => w.candidatePathId === c.candidatePathId);
    if (isWinner) continue;
    const rejected = deduped.rejected.find((r) => r.candidatePathId === c.candidatePathId);
    let reason: string;
    if (!isSignedEligible(c)) {
      reason = "not-signed-score-eligible";
    } else if (rejected) {
      reason = normalizeRejectionReason(rejected.rejectedPathReason);
    } else {
      const m = signedMass(c);
      reason =
        m.support <= 0 && m.pressure <= 0
          ? "zero-signed-mass"
          : "other-explicit-pipeline-reason";
    }
    const m = signedMass(c);
    const cur = rejectionByReason[reason] ?? {
      candidateCount: 0,
      supportRawLost: 0,
      pressureRawLost: 0,
    };
    cur.candidateCount += 1;
    cur.supportRawLost += m.support;
    cur.pressureRawLost += m.pressure;
    rejectionByReason[reason] = cur;
  }

  // Physical-fact dedupe diagnostics among signed-eligible paths.
  const byFact = new Map<string, ClassifiedPathCandidate[]>();
  for (const c of eligible) {
    const key = `${c.evidence.domain}|${c.evidence.physicalFactId}`;
    const list = byFact.get(key) ?? [];
    list.push(c);
    byFact.set(key, list);
  }

  let duplicateCandidateCount = 0;
  let supportBearingRejectedByDedupe = 0;
  let pressureBearingRejectedByDedupe = 0;
  let supportRawRejectedByDedupe = 0;
  let pressureRawRejectedByDedupe = 0;
  const winnerPolarity = { supportOnly: 0, pressureOnly: 0, both: 0, zeroSigned: 0 };
  const loserPolarity = { supportOnly: 0, pressureOnly: 0, both: 0, zeroSigned: 0 };
  const mixedPolarityWinnerCarries = {
    supportOnly: 0,
    pressureOnly: 0,
    both: 0,
    zeroSigned: 0,
  };
  let mixedPolarityCollisionCount = 0;
  let directTp4cCollisionCount = 0;
  let annualNatalMajorLayerCollisionCount = 0;

  const winnerIds = new Set(winners.map((w) => w.candidatePathId));

  for (const group of byFact.values()) {
    if (group.length > 1) duplicateCandidateCount += group.length - 1;
    const hasDirect = group.some((c) => c.geometryBucket === "direct");
    const hasTp4c = group.some((c) => c.geometryBucket === "tp4c");
    if (hasDirect && hasTp4c) directTp4cCollisionCount += 1;

    const layers = new Set(group.map((c) => c.evidence.layer));
    if (
      (layers.has("annual") && layers.has("natal-activated")) ||
      (layers.has("annual") && layers.has("major-fortune")) ||
      (layers.has("natal-activated") && layers.has("major-fortune"))
    ) {
      annualNatalMajorLayerCollisionCount += 1;
    }

    const polarities = group.map((c) => {
      const m = signedMass(c);
      return polarityOf(m.support, m.pressure);
    });
    const hasSupport = polarities.some((p) => p === "supportOnly" || p === "both");
    const hasPressure = polarities.some((p) => p === "pressureOnly" || p === "both");
    const isMixed = hasSupport && hasPressure && group.length > 1;
    if (isMixed) mixedPolarityCollisionCount += 1;

    const winner = group.find((c) => winnerIds.has(c.candidatePathId));
    if (winner) {
      const wm = signedMass(winner);
      const wp = polarityOf(wm.support, wm.pressure);
      winnerPolarity[wp] += 1;
      if (isMixed) mixedPolarityWinnerCarries[wp] += 1;
    }

    for (const c of group) {
      if (winnerIds.has(c.candidatePathId)) continue;
      const m = signedMass(c);
      const p = polarityOf(m.support, m.pressure);
      loserPolarity[p] += 1;
      if (m.support > 0) {
        supportBearingRejectedByDedupe += 1;
        supportRawRejectedByDedupe += m.support;
      }
      if (m.pressure > 0) {
        pressureBearingRejectedByDedupe += 1;
        pressureRawRejectedByDedupe += m.pressure;
      }
    }
  }

  const supportEligibility =
    candidateSupport > 0 ? eligibleStage.supportRaw / candidateSupport : 1;
  const pressureEligibility =
    candidatePressure > 0 ? eligibleStage.pressureRaw / candidatePressure : 1;
  const supportDedupe =
    eligibleStage.supportRaw > 0
      ? winnerStage.supportRaw / eligibleStage.supportRaw
      : 1;
  const pressureDedupe =
    eligibleStage.pressureRaw > 0
      ? winnerStage.pressureRaw / eligibleStage.pressureRaw
      : 1;
  const supportFinal =
    candidateSupport > 0 ? retainedStage.supportRaw / candidateSupport : 1;
  const pressureFinal =
    candidatePressure > 0 ? retainedStage.pressureRaw / candidatePressure : 1;

  return {
    candidate: candidateStage,
    eligible: eligibleStage,
    dedupedWinner: winnerStage,
    retained: retainedStage,
    losses: {
      support: {
        eligibilityLost: candidateSupport - eligibleStage.supportRaw,
        dedupeLost: eligibleStage.supportRaw - winnerStage.supportRaw,
        finalLost: candidateSupport - retainedStage.supportRaw,
      },
      pressure: {
        eligibilityLost: candidatePressure - eligibleStage.pressureRaw,
        dedupeLost: eligibleStage.pressureRaw - winnerStage.pressureRaw,
        finalLost: candidatePressure - retainedStage.pressureRaw,
      },
    },
    retentionRates: {
      supportEligibilityRetentionRate: supportEligibility,
      supportDedupeRetentionRate: supportDedupe,
      supportFinalRetentionRate: supportFinal,
      pressureEligibilityRetentionRate: pressureEligibility,
      pressureDedupeRetentionRate: pressureDedupe,
      pressureFinalRetentionRate: pressureFinal,
      pressureRelativeRetentionGap: pressureFinal - supportFinal,
    },
    rejectionByReason,
    physicalFactDedupe: {
      uniquePhysicalFactIdCountBeforeDedupe: byFact.size,
      duplicateCandidateCount,
      supportBearingRejectedByDedupe,
      pressureBearingRejectedByDedupe,
      supportRawRejectedByDedupe,
      pressureRawRejectedByDedupe,
      winnerPolarity,
      loserPolarity,
      mixedPolarityCollisionCount,
      directTp4cCollisionCount,
      annualNatalMajorLayerCollisionCount,
      mixedPolarityWinnerCarries,
    },
    retainedWeighted: { supportRaw: 0, pressureRaw: 0 },
  };
}

function mergeFunnels(a: SignedEvidenceFunnel, b: SignedEvidenceFunnel): SignedEvidenceFunnel {
  const mergeStage = (x: FunnelStageMass, y: FunnelStageMass, candS: number, candP: number): FunnelStageMass => ({
    factCount: x.factCount + y.factCount,
    supportRaw: x.supportRaw + y.supportRaw,
    pressureRaw: x.pressureRaw + y.pressureRaw,
    supportPressureMassRatio:
      x.pressureRaw + y.pressureRaw > 0
        ? (x.supportRaw + y.supportRaw) / (x.pressureRaw + y.pressureRaw)
        : x.supportRaw + y.supportRaw > 0
          ? Infinity
          : 1,
    supportRetentionOfCandidate: candS > 0 ? (x.supportRaw + y.supportRaw) / candS : 1,
    pressureRetentionOfCandidate: candP > 0 ? (x.pressureRaw + y.pressureRaw) / candP : 1,
  });

  const candS = a.candidate.supportRaw + b.candidate.supportRaw;
  const candP = a.candidate.pressureRaw + b.candidate.pressureRaw;
  const candidate = mergeStage(a.candidate, b.candidate, candS, candP);
  const eligible = mergeStage(a.eligible, b.eligible, candS, candP);
  const dedupedWinner = mergeStage(a.dedupedWinner, b.dedupedWinner, candS, candP);
  const retained = mergeStage(a.retained, b.retained, candS, candP);

  const rejectionByReason: Record<string, RejectionReasonStats> = {};
  for (const src of [a.rejectionByReason, b.rejectionByReason]) {
    for (const [k, v] of Object.entries(src)) {
      const cur = rejectionByReason[k] ?? {
        candidateCount: 0,
        supportRawLost: 0,
        pressureRawLost: 0,
      };
      cur.candidateCount += v.candidateCount;
      cur.supportRawLost += v.supportRawLost;
      cur.pressureRawLost += v.pressureRawLost;
      rejectionByReason[k] = cur;
    }
  }

  const dA = a.physicalFactDedupe;
  const dB = b.physicalFactDedupe;
  const sumPolarity = (
    x: PhysicalFactDedupeDiagnostics["winnerPolarity"],
    y: PhysicalFactDedupeDiagnostics["winnerPolarity"],
  ) => ({
    supportOnly: x.supportOnly + y.supportOnly,
    pressureOnly: x.pressureOnly + y.pressureOnly,
    both: x.both + y.both,
    zeroSigned: x.zeroSigned + y.zeroSigned,
  });

  const supportFinal = candS > 0 ? retained.supportRaw / candS : 1;
  const pressureFinal = candP > 0 ? retained.pressureRaw / candP : 1;
  const supportElig = candS > 0 ? eligible.supportRaw / candS : 1;
  const pressureElig = candP > 0 ? eligible.pressureRaw / candP : 1;
  const supportDedupe = eligible.supportRaw > 0 ? dedupedWinner.supportRaw / eligible.supportRaw : 1;
  const pressureDedupe =
    eligible.pressureRaw > 0 ? dedupedWinner.pressureRaw / eligible.pressureRaw : 1;

  return {
    candidate,
    eligible,
    dedupedWinner,
    retained,
    losses: {
      support: {
        eligibilityLost: a.losses.support.eligibilityLost + b.losses.support.eligibilityLost,
        dedupeLost: a.losses.support.dedupeLost + b.losses.support.dedupeLost,
        finalLost: a.losses.support.finalLost + b.losses.support.finalLost,
      },
      pressure: {
        eligibilityLost: a.losses.pressure.eligibilityLost + b.losses.pressure.eligibilityLost,
        dedupeLost: a.losses.pressure.dedupeLost + b.losses.pressure.dedupeLost,
        finalLost: a.losses.pressure.finalLost + b.losses.pressure.finalLost,
      },
    },
    retentionRates: {
      supportEligibilityRetentionRate: supportElig,
      supportDedupeRetentionRate: supportDedupe,
      supportFinalRetentionRate: supportFinal,
      pressureEligibilityRetentionRate: pressureElig,
      pressureDedupeRetentionRate: pressureDedupe,
      pressureFinalRetentionRate: pressureFinal,
      pressureRelativeRetentionGap: pressureFinal - supportFinal,
    },
    rejectionByReason,
    physicalFactDedupe: {
      uniquePhysicalFactIdCountBeforeDedupe:
        dA.uniquePhysicalFactIdCountBeforeDedupe + dB.uniquePhysicalFactIdCountBeforeDedupe,
      duplicateCandidateCount: dA.duplicateCandidateCount + dB.duplicateCandidateCount,
      supportBearingRejectedByDedupe:
        dA.supportBearingRejectedByDedupe + dB.supportBearingRejectedByDedupe,
      pressureBearingRejectedByDedupe:
        dA.pressureBearingRejectedByDedupe + dB.pressureBearingRejectedByDedupe,
      supportRawRejectedByDedupe: dA.supportRawRejectedByDedupe + dB.supportRawRejectedByDedupe,
      pressureRawRejectedByDedupe: dA.pressureRawRejectedByDedupe + dB.pressureRawRejectedByDedupe,
      winnerPolarity: sumPolarity(dA.winnerPolarity, dB.winnerPolarity),
      loserPolarity: sumPolarity(dA.loserPolarity, dB.loserPolarity),
      mixedPolarityCollisionCount:
        dA.mixedPolarityCollisionCount + dB.mixedPolarityCollisionCount,
      directTp4cCollisionCount: dA.directTp4cCollisionCount + dB.directTp4cCollisionCount,
      annualNatalMajorLayerCollisionCount:
        dA.annualNatalMajorLayerCollisionCount + dB.annualNatalMajorLayerCollisionCount,
      mixedPolarityWinnerCarries: sumPolarity(
        dA.mixedPolarityWinnerCarries,
        dB.mixedPolarityWinnerCarries,
      ),
    },
    retainedWeighted: {
      supportRaw: a.retainedWeighted.supportRaw + b.retainedWeighted.supportRaw,
      pressureRaw: a.retainedWeighted.pressureRaw + b.retainedWeighted.pressureRaw,
    },
  };
}

function emptyFunnel(): SignedEvidenceFunnel {
  const emptyStage: FunnelStageMass = {
    factCount: 0,
    supportRaw: 0,
    pressureRaw: 0,
    supportPressureMassRatio: 1,
    supportRetentionOfCandidate: 1,
    pressureRetentionOfCandidate: 1,
  };
  return {
    candidate: emptyStage,
    eligible: emptyStage,
    dedupedWinner: emptyStage,
    retained: emptyStage,
    losses: {
      support: { eligibilityLost: 0, dedupeLost: 0, finalLost: 0 },
      pressure: { eligibilityLost: 0, dedupeLost: 0, finalLost: 0 },
    },
    retentionRates: {
      supportEligibilityRetentionRate: 1,
      supportDedupeRetentionRate: 1,
      supportFinalRetentionRate: 1,
      pressureEligibilityRetentionRate: 1,
      pressureDedupeRetentionRate: 1,
      pressureFinalRetentionRate: 1,
      pressureRelativeRetentionGap: 0,
    },
    rejectionByReason: {},
    physicalFactDedupe: {
      uniquePhysicalFactIdCountBeforeDedupe: 0,
      duplicateCandidateCount: 0,
      supportBearingRejectedByDedupe: 0,
      pressureBearingRejectedByDedupe: 0,
      supportRawRejectedByDedupe: 0,
      pressureRawRejectedByDedupe: 0,
      winnerPolarity: { supportOnly: 0, pressureOnly: 0, both: 0, zeroSigned: 0 },
      loserPolarity: { supportOnly: 0, pressureOnly: 0, both: 0, zeroSigned: 0 },
      mixedPolarityCollisionCount: 0,
      directTp4cCollisionCount: 0,
      annualNatalMajorLayerCollisionCount: 0,
      mixedPolarityWinnerCarries: {
        supportOnly: 0,
        pressureOnly: 0,
        both: 0,
        zeroSigned: 0,
      },
    },
    retainedWeighted: { supportRaw: 0, pressureRaw: 0 },
  };
}

/** Run the real V0.5 domain pipeline and return the signed-evidence funnel. */
export function buildSignedEvidenceFunnelForChart(
  chart: ChartData,
  knowledge05: AnnualAxesKnowledgeV05NamPhai,
  domains: AnnualAxisDomain[] = [...ANNUAL_AXIS_DOMAINS],
): SignedEvidenceFunnel | null {
  const knowledge04 = loadAnnualAxesKnowledgeV04NamPhai();
  const knowledge042 = loadAnnualAxesKnowledgeV042NamPhai();
  const numeric = loadPalaceOverviewKnowledgeV1();
  if (!knowledge04.ok || !knowledge042.ok || !numeric.ok) return null;

  const diagnostics = emptyAnnualAxesDiagnostics();
  const focus = resolveAnnualFocus(chart, "nam-phai");
  const headFrame = focus.focus ? buildAnnualFocusFrame(chart, focus.focus) : null;
  if (!headFrame) return null;

  const routings = computeDomainRoutingsV04(
    chart,
    knowledge04.knowledge,
    headFrame,
    diagnostics,
  );

  let merged = emptyFunnel();

  for (const domain of domains) {
    const routing = routings.get(domain);
    if (!routing) continue;

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

    const classified = classifyEvidencePaths(
      evidence,
      headFrame.focusPalaceIndex,
      knowledge05.spatialBudget.tp4cRelativeRoleWeights,
    );
    const deduped = dedupeV05SpatialPaths(classified, knowledge05);
    const aggregate = aggregateV05Buckets(deduped, knowledge05);
    const funnel = buildFunnelFromPipeline(classified, deduped);

    let retainedSupport = 0;
    let retainedPressure = 0;
    for (const e of aggregate.evidence) {
      if (!e.retainedForSignedScore) continue;
      retainedSupport += Math.max(0, e.weightedAxes.support);
      retainedPressure += Math.max(0, e.weightedAxes.pressure);
    }
    funnel.retainedWeighted = {
      supportRaw: retainedSupport,
      pressureRaw: retainedPressure,
    };

    merged = mergeFunnels(merged, funnel);
  }

  return merged;
}

export function mergeSignedEvidenceFunnels(
  funnels: SignedEvidenceFunnel[],
): SignedEvidenceFunnel {
  return funnels.reduce((acc, f) => mergeFunnels(acc, f), emptyFunnel());
}

export type {
  ClassifiedPathCandidate,
};
