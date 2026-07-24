import type { 
  MonthlyTransformationContribution, 
  MonthlyJiCollisionKind,
  MonthlyScoreBreakdown,
  DauQuanAmplification,
  MonthlyFlowV021Input
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function aggregateTransformations(
  contributions: MonthlyTransformationContribution[],
  collisionKind: MonthlyJiCollisionKind | null,
  isPartial: boolean
) {
  // In V0.2.1, we detect and report collision candidates, but we DO NOT apply the special -50 replacement in production-candidate output.
  // The collision component might be marked unavailable (handled via isPartial), but the finalDelta is just based on contributions.
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
  let finalDelta = clamp(rawDelta, -35, 35);
  
  if (isPartial) {
    // If transformations are partial (e.g. collision or missing facts), finalDelta could be zeroed out or retained without penalty. 
    // We'll retain the standard aggregation but the caller will see status="partial".
  }

  return {
    dominantContributionId: `${dominant.mutagen}-${dominant.starName}`,
    dominantDelta: dominant.contribution,
    secondaryRawSum: secondarySum,
    secondaryAppliedDelta: secondaryApplied,
    finalDelta
  };
}

export function scoreMonth(input: MonthlyFlowV021Input): MonthlyScoreBreakdown {
  if (input.annualBaseline.score < 0 || input.annualBaseline.score > 100) {
    throw new Error("Annual baseline out of range");
  }

  const cappedPalace = clamp(input.palaceRawDelta, -25, 25);
  const dauQuanMultiplier = input.isDauQuanMonth ? 1.5 : 1;
  const amplifiedPalace = cappedPalace * dauQuanMultiplier;

  const transAgg = aggregateTransformations(
    input.transformationContext.contributions, 
    input.transformationContext.collisionKind,
    input.transformationContext.isPartial
  );

  const localActivation = amplifiedPalace + transAgg.finalDelta;
  const rawMonthlyScore = input.annualBaseline.score + localActivation;

  const ANNUAL_ENVELOPE_RADIUS = 30;
  const floor = Math.max(0, input.annualBaseline.score - ANNUAL_ENVELOPE_RADIUS);
  const ceiling = Math.min(100, input.annualBaseline.score + ANNUAL_ENVELOPE_RADIUS);

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
  
  // Precision policy: One decimal place at the result boundary
  finalMonthlyScore = Math.round(finalMonthlyScore * 10) / 10;

  return {
    annualBaseline: input.annualBaseline.score,
    palace: {
      raw: input.palaceRawDelta,
      capped: cappedPalace,
      dauQuanMultiplier,
      amplified: amplifiedPalace
    },
    transformations: {
      contributions: input.transformationContext.contributions,
      dominantContributionId: transAgg.dominantContributionId,
      dominantDelta: transAgg.dominantDelta,
      secondaryRawSum: transAgg.secondaryRawSum,
      secondaryAppliedDelta: transAgg.secondaryAppliedDelta,
      collisionKind: input.transformationContext.collisionKind,
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
