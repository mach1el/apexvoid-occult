import type { AnnualScoringProfile } from "../../knowledge/annual-axes";
import {
  addAnnualAxes,
  emptyAnnualAxes,
  type AnnualAxisBand,
  type AnnualAxisEvidence,
  type AnnualAxisRawAxes,
} from "./types";

export function sumWeightedAxes(evidence: AnnualAxisEvidence[]): AnnualAxisRawAxes {
  return evidence.reduce((acc, e) => addAnnualAxes(acc, e.weightedAxes), emptyAnnualAxes());
}

export function resolveAnnualAxisBand(
  score: number,
  profile: AnnualScoringProfile,
): AnnualAxisBand {
  for (const band of profile.output.bands) {
    const aboveMin = score >= band.minInclusive;
    const belowMax =
      band.maxExclusive !== undefined
        ? score < band.maxExclusive
        : band.maxInclusive !== undefined
          ? score <= band.maxInclusive
          : true;
    if (aboveMin && belowMax) return band.id as AnnualAxisBand;
  }
  throw new Error(`score ${score} did not resolve to any configured band`);
}

export interface AnnualAxisNormalizeResult {
  score: number;
  band: AnnualAxisBand;
  intensity: number;
  conflict: number;
  normalizedAxes: AnnualAxisRawAxes;
}

/**
 * Literal implementation of `annual-scoring-profile.v0.json#formulaSpec`.
 * Every scale/coefficient is read from the loaded profile — never a
 * hardcoded TS numeric literal.
 */
export function normalizeAnnualAxes(
  rawAxes: AnnualAxisRawAxes,
  profile: AnnualScoringProfile,
): AnnualAxisNormalizeResult {
  const n = profile.normalization;

  const supportNorm = 1 - Math.exp(-rawAxes.support / n.supportScale);
  const pressureNorm = 1 - Math.exp(-rawAxes.pressure / n.pressureScale);
  const stabilityNorm = Math.tanh(rawAxes.stability / n.stabilityScale);
  const activationNorm = 1 - Math.exp(-rawAxes.activation / n.activationScale);

  const netQuality = supportNorm - pressureNorm + n.stabilityCoefficient * stabilityNorm;
  const activationGate = n.activationGateFloor + n.activationGateRange * activationNorm;

  const rawScore =
    n.neutralScore + n.scoreAmplitude * Math.tanh((netQuality * activationGate) / n.scoreDivisor);
  const clampedScore = Math.min(profile.output.scoreMax, Math.max(profile.output.scoreMin, rawScore));
  const precisionFactor = 10 ** profile.output.scorePrecision;
  const score = Math.round(clampedScore * precisionFactor) / precisionFactor;

  const intensity = Math.round(100 * activationNorm);
  const conflict = Math.round(100 * Math.min(supportNorm, pressureNorm) * activationNorm);

  return {
    score,
    band: resolveAnnualAxisBand(score, profile),
    intensity,
    conflict,
    normalizedAxes: {
      support: supportNorm,
      pressure: pressureNorm,
      stability: stabilityNorm,
      activation: activationNorm,
    },
  };
}
