/**
 * V0.8 direct-anchor aggregation — one signed bucket only.
 */

import type { AnnualAxesKnowledgeV08NamPhai } from "../../../knowledge/annual-axes/v0.8";
import type {
  AnnualAxisEvidence,
  AnnualAxisRawAxes,
  AnnualSpatialBudgetTrace,
} from "../types";
import { emptyAnnualAxes } from "../types";
import type { ClassifiedPathCandidate } from "../nam-phai-v043/classify-paths";
import type { DedupedSpatialPaths } from "../nam-phai-v043/dedupe";
import {
  computeActivationDiminishingFactors,
  computeSignedDiminishingFactors,
  computeActivationPathFactor,
} from "../nam-phai-v043/aggregate-spatial";
import { asV043DedupeKnowledge } from "./knowledge-adapter";
import { computeDirectSigned } from "./bucket-formula";
import type { V08EligibilityPartition } from "./eligibility";

export interface V08DirectAggregateResult {
  evidence: AnnualAxisEvidence[];
  rawAxes: AnnualAxisRawAxes;
  spatialBudgetTrace: AnnualSpatialBudgetTrace;
  directSupportRaw: number;
  directPressureRaw: number;
  directTotalRaw: number;
  directIntensity: number;
  directPolarity: number;
  directSignedRaw: number;
  annualActivationRaw: number;
  retainedDirectFactCount: number;
  uniqueRetainedDirectFacts: number;
  excludedTp4cFactCount: number;
  excludedOppositeFactCount: number;
  excludedContextFactCount: number;
  excludedAdjacentFactCount: number;
  excludedCrossDomainFactCount: number;
  tp4cSignedContribution: 0;
}

function toEvidenceRow(
  c: ClassifiedPathCandidate,
  opts: {
    retainedForSignedScore: boolean;
    retainedForActivation: boolean;
    rejectedPathReason?: string;
    signedDiminishingFactor: number;
    activationDiminishingFactor: number;
    signedAppliedFactor: number;
    activationAppliedFactor: number;
  },
): AnnualAxisEvidence {
  const support = opts.retainedForSignedScore
    ? Math.max(0, c.evidence.rawAxes.support) * opts.signedAppliedFactor
    : 0;
  const pressure = opts.retainedForSignedScore
    ? Math.max(0, c.evidence.rawAxes.pressure) * opts.signedAppliedFactor
    : 0;
  const activation = opts.retainedForActivation
    ? Math.max(0, c.evidence.rawAxes.activation) * opts.activationAppliedFactor
    : 0;
  return {
    ...c.evidence,
    geometryClass: c.geometryClass,
    geometryBucket: c.geometryBucket,
    retainedForSignedScore: opts.retainedForSignedScore,
    retainedForActivation: opts.retainedForActivation,
    rejectedPathReason: opts.rejectedPathReason,
    ownershipWeight: c.ownershipWeight,
    confidenceWeight: c.confidenceWeight,
    signedDiminishingFactor: opts.retainedForSignedScore ? opts.signedDiminishingFactor : undefined,
    activationDiminishingFactor: opts.retainedForActivation
      ? opts.activationDiminishingFactor
      : undefined,
    signedAppliedFactor: opts.retainedForSignedScore ? opts.signedAppliedFactor : 0,
    activationAppliedFactor: opts.retainedForActivation ? opts.activationAppliedFactor : 0,
    diminishingFactor: opts.retainedForSignedScore
      ? opts.signedDiminishingFactor
      : opts.activationDiminishingFactor,
    finalAppliedFactor: opts.retainedForSignedScore
      ? opts.signedAppliedFactor
      : opts.activationAppliedFactor,
    effectiveWeight: opts.retainedForSignedScore
      ? opts.signedAppliedFactor
      : opts.activationAppliedFactor,
    weightedAxes: { support, pressure, stability: 0, activation },
  };
}

export function aggregateV08Direct(
  deduped: DedupedSpatialPaths,
  eligibility: V08EligibilityPartition,
  knowledge: AnnualAxesKnowledgeV08NamPhai,
): V08DirectAggregateResult {
  const adapted = asV043DedupeKnowledge(knowledge);
  const signedDim = computeSignedDiminishingFactors(deduped.signedRetained, adapted);
  const activationDim = computeActivationDiminishingFactors(
    deduped.activationRetained,
    adapted,
  );

  let directSupportRaw = 0;
  let directPressureRaw = 0;
  const evidenceOut: AnnualAxisEvidence[] = [];
  const signedIds = new Set(deduped.signedRetained.map((c) => c.candidatePathId));
  const activationIds = new Set(deduped.activationRetained.map((c) => c.candidatePathId));
  const uniqueFacts = new Set<string>();

  for (const c of deduped.signedRetained) {
    const dim = signedDim.get(c.candidatePathId) ?? 1;
    const pathFactor =
      c.confidenceWeight * c.ownershipSubjectProduct * 1 * dim;
    const support = Math.max(0, c.evidence.rawAxes.support) * pathFactor;
    const pressure = Math.max(0, c.evidence.rawAxes.pressure) * pathFactor;
    directSupportRaw += support;
    directPressureRaw += pressure;
    uniqueFacts.add(c.evidence.physicalFactId);
    const alsoActivation = activationIds.has(c.candidatePathId);
    const actDim = alsoActivation ? (activationDim.get(c.candidatePathId) ?? 1) : 1;
    evidenceOut.push(
      toEvidenceRow(c, {
        retainedForSignedScore: true,
        retainedForActivation: alsoActivation,
        signedDiminishingFactor: dim,
        activationDiminishingFactor: actDim,
        signedAppliedFactor: pathFactor,
        activationAppliedFactor: alsoActivation
          ? computeActivationPathFactor(c, actDim)
          : 0,
      }),
    );
  }

  for (const c of deduped.activationRetained) {
    if (signedIds.has(c.candidatePathId)) continue;
    const actDim = activationDim.get(c.candidatePathId) ?? 1;
    evidenceOut.push(
      toEvidenceRow(c, {
        retainedForSignedScore: false,
        retainedForActivation: true,
        signedDiminishingFactor: 1,
        activationDiminishingFactor: actDim,
        signedAppliedFactor: 0,
        activationAppliedFactor: computeActivationPathFactor(c, actDim),
      }),
    );
  }

  for (const c of deduped.rejected) {
    evidenceOut.push(
      toEvidenceRow(c, {
        retainedForSignedScore: false,
        retainedForActivation: false,
        rejectedPathReason: c.rejectedPathReason,
        signedDiminishingFactor: 1,
        activationDiminishingFactor: 1,
        signedAppliedFactor: 0,
        activationAppliedFactor: 0,
      }),
    );
  }

  evidenceOut.sort(
    (a, b) => a.id.localeCompare(b.id) || (a.geometryClass ?? "").localeCompare(b.geometryClass ?? ""),
  );

  const { evidenceScale, epsilon } = knowledge.bucketFormula;
  const signed = computeDirectSigned(
    directSupportRaw,
    directPressureRaw,
    evidenceScale,
    epsilon,
  );

  let annualActivationRaw = 0;
  for (const c of deduped.activationRetained) {
    const actDim = activationDim.get(c.candidatePathId) ?? 1;
    const applied = computeActivationPathFactor(c, actDim);
    annualActivationRaw += Math.max(0, c.evidence.rawAxes.activation) * applied;
  }

  const spatialBudgetTrace: AnnualSpatialBudgetTrace = {
    directBudget: 1,
    tp4cBudget: 0,
    directSupportRaw,
    directPressureRaw,
    directSigned: signed.signed,
    directContribution: signed.signed,
    tp4cSupportRaw: 0,
    tp4cPressureRaw: 0,
    tp4cSigned: 0,
    tp4cContribution: 0,
    spatialSigned: signed.signed,
  };

  const rawAxes: AnnualAxisRawAxes = {
    ...emptyAnnualAxes(),
    support: directSupportRaw,
    pressure: directPressureRaw,
    activation: annualActivationRaw,
  };

  return {
    evidence: evidenceOut,
    rawAxes,
    spatialBudgetTrace,
    directSupportRaw,
    directPressureRaw,
    directTotalRaw: signed.total,
    directIntensity: signed.intensity,
    directPolarity: signed.polarity,
    directSignedRaw: signed.signed,
    annualActivationRaw,
    retainedDirectFactCount: deduped.signedRetained.length,
    uniqueRetainedDirectFacts: uniqueFacts.size,
    excludedTp4cFactCount: eligibility.counts.excludedTp4cFactCount,
    excludedOppositeFactCount: eligibility.counts.excludedOppositeFactCount,
    excludedContextFactCount: eligibility.counts.excludedContextFactCount,
    excludedAdjacentFactCount: eligibility.counts.excludedAdjacentFactCount,
    excludedCrossDomainFactCount: eligibility.counts.excludedCrossDomainFactCount,
    tp4cSignedContribution: 0,
  };
}
