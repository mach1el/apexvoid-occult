import type { AnnualAxisDomain } from "../../../contracts/annual-axes";
import type {
  AnnualAxesKnowledgeV08NamPhai,
  V08ScoreProfileId,
} from "../../../knowledge/annual-axes/v0.8";
import type { V08DirectAggregateResult } from "./aggregate-direct";
import type { V08DomainRootAnchor } from "./resolve-domain-root";
import {
  clamp,
  computeActivationGate,
  computeActivationModulator,
  roundToPrecision,
} from "./bucket-formula";

export const V08_FORMULA_VERSION = "v0.8-direct-anchor-robust-score" as const;

export interface V08DomainScoreTrace {
  formulaVersion: typeof V08_FORMULA_VERSION;
  candidateId: V08ScoreProfileId;
  anchorPalaceIndex: number;
  anchorPalaceName: string;
  anchorBranch: string;
  anchorProvenance: string;
  retainedDirectFactCount: number;
  excludedTp4cFactCount: number;
  excludedOppositeFactCount: number;
  excludedContextFactCount: number;
  excludedAdjacentFactCount: number;
  excludedCrossDomainFactCount: number;
  directSupportRaw: number;
  directPressureRaw: number;
  directTotalRaw: number;
  directIntensity: number;
  directPolarity: number;
  directSignedRaw: number;
  domainCenter: number;
  robustScale: number;
  directZ: number;
  clampedDirectZ: number;
  annualActivationRaw: number;
  activationScale: number;
  activationGate: number;
  activationModulator: number;
  effectiveZ: number;
  scoreStepPerRobustSigma: number;
  rawScore: number;
  absoluteScore: number;
  conflictRatio: number;
  coverage: number;
  confidence: number;
  tp4cSignedContribution: 0;
  natalGainAppliedToScore: false;
}

export interface V08DomainScoreResult {
  score: number;
  confidence: number;
  activationGate: number;
  effectiveZ: number;
  directSignedRaw: number;
  trace: V08DomainScoreTrace;
  intensity: number;
  conflict: number;
  supportNorm: number;
  pressureNorm: number;
}

export function scoreV08Domain(input: {
  aggregate: V08DirectAggregateResult;
  anchor: V08DomainRootAnchor;
  domain: AnnualAxisDomain;
  knowledge: AnnualAxesKnowledgeV08NamPhai;
  candidateId: V08ScoreProfileId;
  scoreStepPerRobustSigma: number;
  domainCenterOverride?: number;
  robustScaleOverride?: number;
  activationScaleOverride?: number;
}): V08DomainScoreResult {
  const { aggregate, anchor, knowledge, candidateId } = input;
  const domainCenter =
    input.domainCenterOverride ?? knowledge.calibration.domainCenters[input.domain];
  const robustScale =
    input.robustScaleOverride ?? knowledge.calibration.robustScales[input.domain];
  const activationScale =
    input.activationScaleOverride ?? knowledge.calibration.activationScales[input.domain];
  const { zClip } = knowledge.scoreProfile.robustCalibration;
  const bounds = knowledge.scoreProfile.scoreBounds;
  const confidenceProfile = knowledge.scoreProfile.confidenceProfile;
  const step = input.scoreStepPerRobustSigma;

  const activationGate = computeActivationGate(
    aggregate.annualActivationRaw,
    activationScale,
  );
  const activationModulator = computeActivationModulator(activationGate);

  const directZ =
    robustScale > 0 ? (aggregate.directSignedRaw - domainCenter) / robustScale : 0;
  const clampedDirectZ = clamp(directZ, -zClip, zClip);
  const effectiveZ = clampedDirectZ * activationModulator;

  const noEvidence = aggregate.retainedDirectFactCount === 0;
  const rawScore = bounds.neutral + step * effectiveZ;
  let absoluteScore: number;
  if (activationGate <= 0 || noEvidence) {
    absoluteScore = bounds.neutral;
  } else if (aggregate.directSignedRaw === domainCenter) {
    absoluteScore = bounds.neutral;
  } else {
    absoluteScore = roundToPrecision(
      clamp(rawScore, bounds.minimum, bounds.maximum),
      bounds.precision,
    );
  }

  const conflictRatio =
    aggregate.directTotalRaw > knowledge.bucketFormula.epsilon
      ? (2 *
          Math.min(aggregate.directSupportRaw, aggregate.directPressureRaw)) /
        (aggregate.directTotalRaw + knowledge.bucketFormula.epsilon)
      : 0;
  const coverage = clamp(
    aggregate.uniqueRetainedDirectFacts / confidenceProfile.factsForFullCoverage,
    0,
    1,
  );
  const confidence = clamp(
    coverage *
      (0.5 + 0.5 * activationGate) *
      (1 - confidenceProfile.conflictPenalty * conflictRatio),
    0,
    1,
  );

  const evidenceScale = knowledge.bucketFormula.evidenceScale;
  const supportNorm = 1 - Math.exp(-Math.max(0, aggregate.directSupportRaw) / evidenceScale);
  const pressureNorm = 1 - Math.exp(-Math.max(0, aggregate.directPressureRaw) / evidenceScale);

  const trace: V08DomainScoreTrace = {
    formulaVersion: V08_FORMULA_VERSION,
    candidateId,
    anchorPalaceIndex: anchor.anchorPalaceIndex,
    anchorPalaceName: anchor.anchorPalaceName,
    anchorBranch: anchor.anchorBranch,
    anchorProvenance: anchor.provenance,
    retainedDirectFactCount: aggregate.retainedDirectFactCount,
    excludedTp4cFactCount: aggregate.excludedTp4cFactCount,
    excludedOppositeFactCount: aggregate.excludedOppositeFactCount,
    excludedContextFactCount: aggregate.excludedContextFactCount,
    excludedAdjacentFactCount: aggregate.excludedAdjacentFactCount,
    excludedCrossDomainFactCount: aggregate.excludedCrossDomainFactCount,
    directSupportRaw: aggregate.directSupportRaw,
    directPressureRaw: aggregate.directPressureRaw,
    directTotalRaw: aggregate.directTotalRaw,
    directIntensity: aggregate.directIntensity,
    directPolarity: aggregate.directPolarity,
    directSignedRaw: aggregate.directSignedRaw,
    domainCenter,
    robustScale,
    directZ,
    clampedDirectZ,
    annualActivationRaw: aggregate.annualActivationRaw,
    activationScale,
    activationGate,
    activationModulator,
    effectiveZ: activationGate <= 0 ? 0 : effectiveZ,
    scoreStepPerRobustSigma: step,
    rawScore,
    absoluteScore,
    conflictRatio,
    coverage,
    confidence,
    tp4cSignedContribution: 0,
    natalGainAppliedToScore: false,
  };

  return {
    score: absoluteScore,
    confidence,
    activationGate,
    effectiveZ: trace.effectiveZ,
    directSignedRaw: aggregate.directSignedRaw,
    trace,
    intensity: Math.round(100 * activationGate),
    conflict: Math.round(100 * conflictRatio * activationGate),
    supportNorm,
    pressureNorm,
  };
}
