import { loadMajorFortuneKnowledgeV02 } from "../../../../knowledge/major-fortune-scoring/v0.2";
import { analyzeMajorFortuneV02 } from "../../v0.2";
import type { MajorFortuneV02Result } from "../../v0.2/types";
import { isCappedDeltaOutOfBounds } from "../../v0.2/clip";
import {
  assertNoTrainHoldoutLeak,
  calculateChart,
  expandAllMajorFortuneCycleObservations,
  type MajorFortuneV02CorpusContract,
  type MajorFortuneV02CycleObservation,
} from "./corpus";
import { compareV01AgainstFrozen } from "./v01-frozen-control";

export interface SplitMetrics {
  observationCount: number;
  chartCount: number;
  score: {
    min: number | null;
    max: number | null;
    mean: number | null;
    median: number | null;
    quantiles: Record<string, number | null>;
    saturation0: number;
    saturation50: number;
    saturation100: number;
    nanOrInfinity: number;
  };
  bandDistribution: Record<string, number>;
  scoreStateDistribution: Record<string, number>;
}

export interface MajorFortuneV02AuditMetrics {
  corpusId: string;
  seed: number;
  chartCount: number;
  cycleObservationCount: number;
  includeAllAvailableMajorFortuneCycles: boolean;
  schools: string[];
  train: SplitMetrics;
  holdout: SplitMetrics;
  score: SplitMetrics["score"];
  bandDistribution: Record<string, number>;
  scoreStateDistribution: Record<string, number>;
  pillarClipRate: Record<string, number>;
  pillarRaw: Record<string, { min: number; max: number; mean: number }>;
  pillarCapped: Record<string, { min: number; max: number; mean: number }>;
  ruleCoverage: {
    matchedStructuralRuleIds: string[];
    executableContributionRuleIds: string[];
    bySchool: Record<string, string[]>;
  };
  claimCoverage: string[];
  sourceCoverage: string[];
  contributionMassByPillar: Record<string, { positive: number; negative: number }>;
  missingInputRatesBySchool: Record<string, number>;
  calculationCoreBlockerFrequencies: Record<string, number>;
  mutualExclusionCoverage: string[];
  activePalaceCoverage: number[];
  cycleIndexCoverage: number[];
  scoreStateConsistencyFailures: number;
  namPhaiPartialRate: number;
  trungChauTransformationStructuralHits: number;
  duplicatePhysicalFactRate: number;
  annualYearIndependenceFailures: number;
  deterministicRerunFailures: number;
  scoreBoundsFailures: number;
  cappedDeltaOutOfBoundsFailures: number;
  v01Deterministic: boolean;
  v01FrozenControlEquivalent: boolean;
  hardGateFailures: string[];
}

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx]!;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function emptyScoreAgg() {
  return {
    scores: [] as number[],
    bandDistribution: {} as Record<string, number>,
    scoreStateDistribution: {} as Record<string, number>,
    saturation0: 0,
    saturation50: 0,
    saturation100: 0,
    nanOrInfinity: 0,
    chartIds: new Set<string>(),
  };
}

function finalizeSplit(
  agg: ReturnType<typeof emptyScoreAgg>,
  observationCount: number,
): SplitMetrics {
  const sorted = [...agg.scores].sort((a, b) => a - b);
  return {
    observationCount,
    chartCount: agg.chartIds.size,
    score: {
      min: sorted[0] ?? null,
      max: sorted[sorted.length - 1] ?? null,
      mean: mean(sorted),
      median: quantile(sorted, 0.5),
      quantiles: {
        p10: quantile(sorted, 0.1),
        p25: quantile(sorted, 0.25),
        p75: quantile(sorted, 0.75),
        p90: quantile(sorted, 0.9),
      },
      saturation0: agg.saturation0,
      saturation50: agg.saturation50,
      saturation100: agg.saturation100,
      nanOrInfinity: agg.nanOrInfinity,
    },
    bandDistribution: agg.bandDistribution,
    scoreStateDistribution: agg.scoreStateDistribution,
  };
}

function independencePayload(result: MajorFortuneV02Result): string {
  return JSON.stringify({
    status: result.status,
    scoreState: result.scoreState,
    score: result.score,
    band: result.band,
    pillars: result.pillars,
    trace: result.trace,
    natalResilience: result.natalResilience,
  });
}

export function runMajorFortuneV02Audit(
  contract: MajorFortuneV02CorpusContract,
): MajorFortuneV02AuditMetrics {
  const loaded = loadMajorFortuneKnowledgeV02();
  if (!loaded.ok) {
    throw new Error(`V0.2 knowledge load failed: ${loaded.issues.join("; ")}`);
  }
  const ruleById = new Map(
    loaded.knowledge.rules.rules.map((r) => [r.ruleId, r] as const),
  );

  const observations = expandAllMajorFortuneCycleObservations(contract);
  assertNoTrainHoldoutLeak(observations);

  const trainAgg = emptyScoreAgg();
  const holdoutAgg = emptyScoreAgg();
  const allAgg = emptyScoreAgg();

  const pillarClipHits: Record<string, number> = {
    "thien-thoi": 0,
    "dia-loi": 0,
    "nhan-hoa": 0,
    "tu-hoa-sat-tinh": 0,
  };
  const pillarObs: Record<string, number> = {
    "thien-thoi": 0,
    "dia-loi": 0,
    "nhan-hoa": 0,
    "tu-hoa-sat-tinh": 0,
  };
  const pillarRawSamples: Record<string, number[]> = {
    "thien-thoi": [],
    "dia-loi": [],
    "nhan-hoa": [],
    "tu-hoa-sat-tinh": [],
  };
  const pillarCappedSamples: Record<string, number[]> = {
    "thien-thoi": [],
    "dia-loi": [],
    "nhan-hoa": [],
    "tu-hoa-sat-tinh": [],
  };
  const contributionMassByPillar: Record<string, { positive: number; negative: number }> = {
    "thien-thoi": { positive: 0, negative: 0 },
    "dia-loi": { positive: 0, negative: 0 },
    "nhan-hoa": { positive: 0, negative: 0 },
    "tu-hoa-sat-tinh": { positive: 0, negative: 0 },
  };

  const matchedStructural = new Set<string>();
  const executableRules = new Set<string>();
  const bySchoolRules: Record<string, Set<string>> = {
    "nam-phai": new Set(),
    "trung-chau": new Set(),
  };
  const claimCoverage = new Set<string>();
  const sourceCoverage = new Set<string>();
  const mutexCoverage = new Set<string>();
  const activePalaceCoverage = new Set<number>();
  const cycleIndexCoverage = new Set<number>();
  const coreBlockers: Record<string, number> = {};
  const missingInputCounts: Record<string, { missing: number; total: number }> = {
    "nam-phai": { missing: 0, total: 0 },
    "trung-chau": { missing: 0, total: 0 },
  };

  let namPhaiPartial = 0;
  let namPhaiTotal = 0;
  let tcTransformHits = 0;
  let duplicatePhysicalFacts = 0;
  let physicalFactChecks = 0;
  let annualYearIndependenceFailures = 0;
  let deterministicRerunFailures = 0;
  let scoreBoundsFailures = 0;
  let cappedDeltaOutOfBoundsFailures = 0;
  let scoreStateConsistencyFailures = 0;
  const hardGateFailures: string[] = [];

  const recordScore = (
    agg: ReturnType<typeof emptyScoreAgg>,
    obs: MajorFortuneV02CycleObservation,
    result: MajorFortuneV02Result,
  ) => {
    agg.chartIds.add(obs.birthChartId);
    if (result.score == null || !Number.isFinite(result.score)) {
      agg.nanOrInfinity += 1;
    } else {
      if (result.score < 0 || result.score > 100) {
        /* counted globally */
      }
      agg.scores.push(result.score);
      if (result.score === 0) agg.saturation0 += 1;
      if (result.score === 50) agg.saturation50 += 1;
      if (result.score === 100) agg.saturation100 += 1;
    }
    const bandKey = result.band ?? "null";
    agg.bandDistribution[bandKey] = (agg.bandDistribution[bandKey] ?? 0) + 1;
    agg.scoreStateDistribution[result.scoreState] =
      (agg.scoreStateDistribution[result.scoreState] ?? 0) + 1;
  };

  for (const obs of observations) {
    const chart = calculateChart(obs.school, obs.input);
    const result = analyzeMajorFortuneV02(chart, { school: obs.school });
    const again = analyzeMajorFortuneV02(chart, { school: obs.school });
    if (JSON.stringify(result) !== JSON.stringify(again)) {
      deterministicRerunFailures += 1;
    }

    // Annual-year independence within the same resolved cycle identity:
    // nudge annualYear by +0 while keeping decade — use same input twice is tautological;
    // instead recompute with annualYear that still maps to same cycle mid-range if possible.
    const midAge = Math.min(obs.endAge, obs.startAge + 1);
    const lunarYear = chart.lunar.year;
    const altAnnualYear = lunarYear + midAge - 1;
    if (altAnnualYear !== obs.selectedAnnualYear) {
      const altInput = { ...obs.input, annualYear: String(altAnnualYear) };
      const altChart = calculateChart(obs.school, altInput);
      const altActive = altChart.majorFortunePalace?.majorFortune;
      if (
        altActive &&
        altActive.order === obs.cycleIndex &&
        altActive.start === obs.startAge &&
        altActive.end === obs.endAge &&
        altChart.majorFortunePalace?.index === obs.activePalaceIndex
      ) {
        const r2 = analyzeMajorFortuneV02(altChart, { school: obs.school });
        if (independencePayload(result) !== independencePayload(r2)) {
          annualYearIndependenceFailures += 1;
        }
      }
    }

    activePalaceCoverage.add(obs.activePalaceIndex);
    cycleIndexCoverage.add(obs.cycleIndex);

    const splitAgg = obs.split === "train" ? trainAgg : holdoutAgg;
    recordScore(splitAgg, obs, result);
    recordScore(allAgg, obs, result);

    if (result.score != null && (result.score < 0 || result.score > 100)) {
      scoreBoundsFailures += 1;
    }
    if (result.score == null && result.status !== "unavailable") {
      scoreBoundsFailures += 1;
    }

    // scoreState consistency: unavailable module ⇒ unavailable state; scored ⇒ score not null
    if (result.status === "unavailable" && result.scoreState !== "unavailable") {
      scoreStateConsistencyFailures += 1;
    }
    if (result.scoreState === "scored" && result.score == null) {
      scoreStateConsistencyFailures += 1;
    }

    missingInputCounts[obs.school]!.total += 1;
    if (
      result.diagnostics.noActiveMajorFortune.length > 0 ||
      result.diagnostics.invalidResolvedContext.length > 0
    ) {
      missingInputCounts[obs.school]!.missing += 1;
    }

    if (obs.school === "nam-phai") {
      namPhaiTotal += 1;
      if (result.status === "partial") namPhaiPartial += 1;
    }

    for (const blocker of result.diagnostics.calculationCoreBlockers) {
      coreBlockers[blocker] = (coreBlockers[blocker] ?? 0) + 1;
    }
    for (const m of result.diagnostics.mutexViolations) mutexCoverage.add(m);

    for (const [pillarId, pillar] of Object.entries(result.pillars)) {
      pillarObs[pillarId] = (pillarObs[pillarId] ?? 0) + 1;
      pillarRawSamples[pillarId]!.push(pillar.rawDelta);
      pillarCappedSamples[pillarId]!.push(pillar.cappedDelta);

      if (Math.abs(pillar.rawDelta) > pillar.cap + 1e-9) {
        // clipping event — not a hard failure
        pillarClipHits[pillarId] = (pillarClipHits[pillarId] ?? 0) + 1;
      }
      if (isCappedDeltaOutOfBounds(pillar.cappedDelta, pillar.cap)) {
        cappedDeltaOutOfBoundsFailures += 1;
        hardGateFailures.push(`capped-out-of-bounds:${pillarId}`);
      }

      for (const id of pillar.matchedStructuralRuleIds) {
        matchedStructural.add(id);
        bySchoolRules[obs.school]!.add(id);
        const rule = ruleById.get(id);
        if (rule) {
          for (const claimId of rule.claimIds) claimCoverage.add(claimId);
          for (const sourceId of rule.sourceIds) sourceCoverage.add(sourceId);
        }
      }
      for (const c of pillar.contributions) {
        executableRules.add(c.ruleId);
        for (const claimId of c.claimIds) claimCoverage.add(claimId);
        for (const sourceId of c.sourceIds) sourceCoverage.add(sourceId);
        if (c.rawDelta > 0) contributionMassByPillar[pillarId]!.positive += c.rawDelta;
        if (c.rawDelta < 0) contributionMassByPillar[pillarId]!.negative += c.rawDelta;
        if (!c.sourceIds.length || !c.claimIds.length || !c.ruleId) {
          hardGateFailures.push(`contribution-missing-provenance:${c.ruleId}`);
        }
        if (obs.school === "nam-phai" && c.ruleId.includes("XF") && c.rawDelta !== 0) {
          hardGateFailures.push("nam-phai-unsupported-transformation-contribution");
        }
      }

      const seenFacts = new Set<string>();
      for (const c of pillar.contributions) {
        physicalFactChecks += 1;
        if (seenFacts.has(c.physicalFactId)) duplicatePhysicalFacts += 1;
        seenFacts.add(c.physicalFactId);
      }
    }

    if (obs.school === "trung-chau") {
      for (const pillar of Object.values(result.pillars)) {
        if (pillar.matchedStructuralRuleIds.some((id) => id.includes("XF-trung-chau"))) {
          tcTransformHits += 1;
          break;
        }
      }
    }

    if (result.diagnostics.mutexViolations.length > 0 && result.status === "available") {
      hardGateFailures.push("mutex-with-available-module");
    }
  }

  const v01 = compareV01AgainstFrozen();
  if (!v01.v01FrozenControlEquivalent) {
    hardGateFailures.push("v01-frozen-control-equivalence");
  }
  hardGateFailures.push(...v01.failures.filter((f) => f.startsWith("frozen-control:")));

  if (scoreBoundsFailures > 0) hardGateFailures.push("score-outside-0-100");
  if (annualYearIndependenceFailures > 0) {
    hardGateFailures.push("annual-or-monthly-fact-affects-numeric");
  }
  if (deterministicRerunFailures > 0) hardGateFailures.push("nondeterministic-artifacts");
  if (cappedDeltaOutOfBoundsFailures > 0) hardGateFailures.push("pillar-capped-exceeds-cap");
  if (scoreStateConsistencyFailures > 0) hardGateFailures.push("scorestate-inconsistent");

  // Prove all-cycle expansion over Core-reachable cycles (annualYear ∈ [1900,2100]).
  const chartsTouched = new Set(observations.map((o) => o.birthChartId));
  const includeAll =
    contract.includeAllAvailableMajorFortuneCycles === true &&
    chartsTouched.size === contract.chartCount &&
    observations.length >= contract.chartCount * 2 * 4 &&
    cycleIndexCoverage.size >= 4 &&
    activePalaceCoverage.size >= 4;

  if (contract.includeAllAvailableMajorFortuneCycles && !includeAll) {
    hardGateFailures.push("includeAllAvailableMajorFortuneCycles-unproven");
  }

  const trainObs = observations.filter((o) => o.split === "train").length;
  const holdoutObs = observations.filter((o) => o.split === "holdout").length;

  const pillarClipRate: Record<string, number> = {};
  for (const id of Object.keys(pillarClipHits)) {
    const denom = pillarObs[id] || 1;
    const rate = pillarClipHits[id]! / denom;
    pillarClipRate[id] = rate;
    if (rate > 1 + 1e-12) hardGateFailures.push(`clip-rate-exceeds-1:${id}`);
  }

  const pillarRaw: MajorFortuneV02AuditMetrics["pillarRaw"] = {};
  const pillarCapped: MajorFortuneV02AuditMetrics["pillarCapped"] = {};
  for (const id of Object.keys(pillarRawSamples)) {
    const samples = pillarRawSamples[id]!;
    pillarRaw[id] = {
      min: samples.length ? Math.min(...samples) : 0,
      max: samples.length ? Math.max(...samples) : 0,
      mean: mean(samples) ?? 0,
    };
    const capped = pillarCappedSamples[id]!;
    pillarCapped[id] = {
      min: capped.length ? Math.min(...capped) : 0,
      max: capped.length ? Math.max(...capped) : 0,
      mean: mean(capped) ?? 0,
    };
  }

  const missingInputRatesBySchool: Record<string, number> = {};
  for (const [school, counts] of Object.entries(missingInputCounts)) {
    missingInputRatesBySchool[school] = counts.total === 0 ? 0 : counts.missing / counts.total;
  }

  const allSplit = finalizeSplit(allAgg, observations.length);

  return {
    corpusId: contract.corpusId,
    seed: contract.seed,
    chartCount: contract.chartCount,
    cycleObservationCount: observations.length,
    includeAllAvailableMajorFortuneCycles: includeAll,
    schools: ["nam-phai", "trung-chau"],
    train: finalizeSplit(trainAgg, trainObs),
    holdout: finalizeSplit(holdoutAgg, holdoutObs),
    score: allSplit.score,
    bandDistribution: allSplit.bandDistribution,
    scoreStateDistribution: allSplit.scoreStateDistribution,
    pillarClipRate,
    pillarRaw,
    pillarCapped,
    ruleCoverage: {
      matchedStructuralRuleIds: [...matchedStructural].sort(),
      executableContributionRuleIds: [...executableRules].sort(),
      bySchool: {
        "nam-phai": [...bySchoolRules["nam-phai"]!].sort(),
        "trung-chau": [...bySchoolRules["trung-chau"]!].sort(),
      },
    },
    claimCoverage: [...claimCoverage].sort(),
    sourceCoverage: [...sourceCoverage].sort(),
    contributionMassByPillar,
    missingInputRatesBySchool,
    calculationCoreBlockerFrequencies: coreBlockers,
    mutualExclusionCoverage: [...mutexCoverage].sort(),
    activePalaceCoverage: [...activePalaceCoverage].sort((a, b) => a - b),
    cycleIndexCoverage: [...cycleIndexCoverage].sort((a, b) => a - b),
    scoreStateConsistencyFailures,
    namPhaiPartialRate: namPhaiTotal === 0 ? 0 : namPhaiPartial / namPhaiTotal,
    trungChauTransformationStructuralHits: tcTransformHits,
    duplicatePhysicalFactRate:
      physicalFactChecks === 0 ? 0 : duplicatePhysicalFacts / physicalFactChecks,
    annualYearIndependenceFailures,
    deterministicRerunFailures,
    scoreBoundsFailures,
    cappedDeltaOutOfBoundsFailures,
    v01Deterministic: v01.v01Deterministic,
    v01FrozenControlEquivalent: v01.v01FrozenControlEquivalent,
    hardGateFailures: [...new Set(hardGateFailures)],
  };
}
