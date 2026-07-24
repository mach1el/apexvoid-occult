import type { 
  MonthlyTransformationContribution, 
  MonthlyJiCollisionKind,
  MonthlyScoreBreakdown,
  DauQuanAmplification
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface ScoreMonthInput {
  annualBaseline: number;
  isDauQuanMonth: boolean;
  palaceRawDelta: number;
  transformations: MonthlyTransformationContribution[];
  collisionKind: MonthlyJiCollisionKind | null;
}

export function aggregateTransformations(
  contributions: MonthlyTransformationContribution[],
  collisionKind: MonthlyJiCollisionKind | null
) {
  if (collisionKind === "same-star-natal-monthly" || collisionKind === "same-star-annual-monthly") {
    return {
      dominantContributionId: null,
      dominantDelta: 0,
      secondaryRawSum: 0,
      secondaryAppliedDelta: 0,
      finalDelta: -50
    };
  }

  if (contributions.length === 0) {
    return {
      dominantContributionId: null,
      dominantDelta: 0,
      secondaryRawSum: 0,
      secondaryAppliedDelta: 0,
      finalDelta: 0
    };
  }

  // Sort by absolute strength descending, tie-break Kỵ > Lộc > Quyền > Khoa
  const mutagenOrder = { "Kỵ": 4, "Lộc": 3, "Quyền": 2, "Khoa": 1 } as Record<string, number>;
  
  const sorted = [...contributions].sort((a, b) => {
    const absA = Math.abs(a.contribution);
    const absB = Math.abs(b.contribution);
    if (absA !== absB) return absB - absA;
    const rankA = mutagenOrder[a.mutagen] ?? 0;
    const rankB = mutagenOrder[b.mutagen] ?? 0;
    return rankB - rankA;
  });

  const dominant = sorted[0]!;
  const secondary = sorted.slice(1);
  const secondarySum = secondary.reduce((sum, t) => sum + t.contribution, 0);
  const secondaryApplied = 0.5 * secondarySum;
  
  const rawDelta = dominant.contribution + secondaryApplied;
  const finalDelta = clamp(rawDelta, -35, 35);

  return {
    dominantContributionId: `${dominant.mutagen}-${dominant.starName}`,
    dominantDelta: dominant.contribution,
    secondaryRawSum: secondarySum,
    secondaryAppliedDelta: secondaryApplied,
    finalDelta
  };
}

export function scoreMonth(input: ScoreMonthInput): MonthlyScoreBreakdown {
  const cappedPalace = clamp(input.palaceRawDelta, -25, 25);
  const dauQuanMultiplier = input.isDauQuanMonth ? 1.5 : 1;
  const amplifiedPalace = cappedPalace * dauQuanMultiplier;

  const transAgg = aggregateTransformations(input.transformations, input.collisionKind);

  const localActivation = amplifiedPalace + transAgg.finalDelta;
  const rawMonthlyScore = input.annualBaseline + localActivation;

  const ANNUAL_ENVELOPE_RADIUS = 30;
  const floor = Math.max(0, input.annualBaseline - ANNUAL_ENVELOPE_RADIUS);
  const ceiling = Math.min(100, input.annualBaseline + ANNUAL_ENVELOPE_RADIUS);

  let finalMonthlyScore = rawMonthlyScore;
  let clippedByAnnualFloor = false;
  let clippedByAnnualCeiling = false;

  if (finalMonthlyScore < floor) {
    finalMonthlyScore = floor;
    clippedByAnnualFloor = true;
  }
  if (finalMonthlyScore > ceiling) {
    finalMonthlyScore = ceiling;
    clippedByAnnualCeiling = true;
  }

  let clippedByAbsoluteRange = false;
  if (finalMonthlyScore < 0 || finalMonthlyScore > 100) {
    clippedByAbsoluteRange = true;
    finalMonthlyScore = clamp(finalMonthlyScore, 0, 100);
  }

  return {
    annualBaseline: input.annualBaseline,
    palace: {
      raw: input.palaceRawDelta,
      capped: cappedPalace,
      dauQuanMultiplier,
      amplified: amplifiedPalace
    },
    transformations: {
      contributions: input.transformations,
      dominantContributionId: transAgg.dominantContributionId,
      dominantDelta: transAgg.dominantDelta,
      secondaryRawSum: transAgg.secondaryRawSum,
      secondaryAppliedDelta: transAgg.secondaryAppliedDelta,
      collisionKind: input.collisionKind,
      finalDelta: transAgg.finalDelta
    },
    localActivation,
    annualEnvelope: {
      radius: ANNUAL_ENVELOPE_RADIUS,
      floor,
      ceiling
    },
    rawMonthlyScore,
    finalMonthlyScore,
    clippedByAnnualFloor,
    clippedByAnnualCeiling,
    clippedByAbsoluteRange
  };
}
