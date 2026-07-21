import { ANNUAL_AXIS_DOMAINS, type AnnualAxisDomain } from "../../../contracts/annual-axes";
import { computeDistributionReport } from "./compute-distribution-report";
import type { AnnualAxesAuditObservation } from "./types";
import {
  median,
  rate,
  scoreDistribution,
  stddev,
  percentile,
} from "./v051-stats";
import type { V07GateResult } from "./v07-types";
import type { V07HoldoutSample } from "./v07-calibration";

function g(
  name: string,
  value: number,
  threshold: number,
  comparator: ">=" | "<=",
): V07GateResult {
  const passed = comparator === ">=" ? value >= threshold : value <= threshold;
  return { gate: name, passed, value, threshold, comparator };
}

function samplesToObservations(samples: V07HoldoutSample[]): AnnualAxesAuditObservation[] {
  const byYear = new Map<
    string,
    { chartId: string; annualYear: number; scores: Partial<Record<AnnualAxisDomain, number>> }
  >();
  for (const s of samples) {
    const key = `${s.chartId}:${s.annualYear}`;
    const cur = byYear.get(key) ?? { chartId: s.chartId, annualYear: s.annualYear, scores: {} };
    cur.scores[s.domain] = s.score;
    byYear.set(key, cur);
  }
  return [...byYear.values()].map((row) => ({
    chartId: row.chartId,
    school: "nam-phai" as const,
    annualYear: row.annualYear,
    annualHeadPalaceIndex: null,
    status: "available" as const,
    scores: Object.fromEntries(
      ANNUAL_AXIS_DOMAINS.map((d) => [d, row.scores[d] ?? null]),
    ) as AnnualAxesAuditObservation["scores"],
  }));
}

function vectorDistributionV07(vectors: number[][]) {
  const sds: number[] = [];
  const ranges: number[] = [];
  let allSixAbove50 = 0;
  let fiveOrMoreAbove50 = 0;
  let allSixInside45To65 = 0;
  let atLeastOneAtOrBelow42 = 0;
  let atLeastOneAtOrAbove62 = 0;
  let oneLowAndOneHigh = 0;
  let atLeastTwoOutside42To58 = 0;

  for (const vals of vectors) {
    if (vals.length !== 6) continue;
    sds.push(stddev(vals));
    ranges.push(Math.max(...vals) - Math.min(...vals));
    if (vals.every((v) => v > 50)) allSixAbove50 += 1;
    if (vals.filter((v) => v > 50).length >= 5) fiveOrMoreAbove50 += 1;
    if (vals.every((v) => v >= 45 && v <= 65)) allSixInside45To65 += 1;
    if (vals.some((v) => v <= 42)) atLeastOneAtOrBelow42 += 1;
    if (vals.some((v) => v >= 62)) atLeastOneAtOrAbove62 += 1;
    if (vals.some((v) => v <= 42) && vals.some((v) => v >= 62)) oneLowAndOneHigh += 1;
    if (vals.filter((v) => v < 42 || v > 58).length >= 2) atLeastTwoOutside42To58 += 1;
  }

  const sortedRanges = [...ranges].sort((a, b) => a - b);
  const total = vectors.filter((v) => v.length === 6).length;
  const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    meanIntraYearSixAxisSd: mean(sds),
    medianIntraYearRange: percentile(sortedRanges, 0.5),
    p10IntraYearRange: percentile(sortedRanges, 0.1),
    p25IntraYearRange: percentile(sortedRanges, 0.25),
    allSixAbove50Rate: rate(allSixAbove50, total),
    fiveOrMoreAbove50Rate: rate(fiveOrMoreAbove50, total),
    allSixInside45To65Rate: rate(allSixInside45To65, total),
    atLeastOneAtOrBelow42Rate: rate(atLeastOneAtOrBelow42, total),
    atLeastOneAtOrAbove62Rate: rate(atLeastOneAtOrAbove62, total),
    oneLowAndOneHighRate: rate(oneLowAndOneHigh, total),
    atLeastTwoOutside42To58Rate: rate(atLeastTwoOutside42To58, total),
  };
}

export function computeV07HoldoutMetrics(samples: V07HoldoutSample[]): Record<string, number> {
  const scores = samples.map((s) => s.score);
  const latents = samples.map((s) => s.strictLatent);
  const scoreDist = scoreDistribution(scores);
  const observations = samplesToObservations(samples);
  const report = computeDistributionReport("annual-axes-v0.7", observations);
  const vectors: number[][] = [];
  const byYear = new Map<string, Partial<Record<AnnualAxisDomain, number>>>();
  for (const s of samples) {
    const key = `${s.chartId}:${s.annualYear}`;
    const cur = byYear.get(key) ?? {};
    cur[s.domain] = s.score;
    byYear.set(key, cur);
  }
  for (const p of byYear.values()) {
    const vals = ANNUAL_AXIS_DOMAINS.map((d) => p[d]).filter((v): v is number => v != null);
    if (vals.length === 6) vectors.push(vals);
  }
  const vec = vectorDistributionV07(vectors);
  const maxAbsCorr = Math.max(
    0,
    ...Object.values(report.interAxisCorrelation).map((v) => Math.abs(v)),
  );
  const extremeRate = rate(
    scores.filter((v) => v <= 2 || v >= 98).length,
    scores.length,
  );
  const softExtremeRate = rate(
    scores.filter((v) => v <= 10 || v >= 90).length,
    scores.length,
  );
  const tp4cMax = samples.reduce((m, s) => Math.max(m, s.tp4cContributionAbs), 0);
  const allFinite = samples.every(
    (s) =>
      Number.isFinite(s.score) &&
      Number.isFinite(s.strictLatent) &&
      Number.isFinite(s.activationGate) &&
      Number.isFinite(s.spatialSignedRaw) &&
      Number.isFinite(s.centeredSpatial),
  )
    ? 1
    : 0;
  const allInRange = scores.every((v) => v >= 0 && v <= 100) ? 1 : 0;

  const metrics: Record<string, number> = {
    allFinite,
    allScoresInRange: allInRange,
    unavailableRate: report.unavailableRate,
    extremeScoreRate: extremeRate,
    softExtremeScoreRate: softExtremeRate,
    tp4cContributionMaxAbs: tp4cMax,
    globalMedianScore: scoreDist.median,
    globalMeanScore: scoreDist.mean,
    positiveStrictLatentRate: rate(latents.filter((v) => v > 0).length, latents.length),
    negativeStrictLatentRate: rate(latents.filter((v) => v < 0).length, latents.length),
    meanIntraYearSixAxisSd: vec.meanIntraYearSixAxisSd,
    medianIntraYearRange: vec.medianIntraYearRange,
    p25IntraYearRange: vec.p25IntraYearRange,
    p10IntraYearRange: vec.p10IntraYearRange,
    atLeastTwoOutside42To58Rate: vec.atLeastTwoOutside42To58Rate,
    atLeastOneAtOrBelow42Rate: vec.atLeastOneAtOrBelow42Rate,
    atLeastOneAtOrAbove62Rate: vec.atLeastOneAtOrAbove62Rate,
    oneLowAndOneHighRate: vec.oneLowAndOneHighRate,
    allSixAbove50Rate: vec.allSixAbove50Rate,
    fiveOrMoreAbove50Rate: vec.fiveOrMoreAbove50Rate,
    allSixInside45To65Rate: vec.allSixInside45To65Rate,
    exactDuplicateVectorRate: report.exactDuplicateVectorRate,
    nearDuplicateVectorRate: report.crossChartSimilarity.nearDuplicateVectorRate,
    maxAbsInterAxisCorrelation: maxAbsCorr,
  };

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const ds = samples.filter((s) => s.domain === domain);
    const dScores = ds.map((s) => s.score);
    const dLatents = ds.map((s) => s.strictLatent);
    metrics[`domainMedian_${domain}`] = median(dScores);
    metrics[`domainPositiveStrictLatentRate_${domain}`] = rate(
      dLatents.filter((v) => v > 0).length,
      dLatents.length,
    );
    metrics[`domainNegativeStrictLatentRate_${domain}`] = rate(
      dLatents.filter((v) => v < 0).length,
      dLatents.length,
    );
    metrics[`domainTwelveYearRange_${domain}`] =
      report.longitudinalChange.medianPerDomainTwelveYearRange[domain] ?? 0;
    metrics[`domainAdjacentDelta_${domain}`] =
      report.longitudinalChange.medianAdjacentYearAbsoluteDelta[domain] ?? 0;
  }

  return metrics;
}

function num(m: Record<string, number>, key: string): number {
  return m[key] ?? 0;
}

export function evaluateV07HoldoutGates(samples: V07HoldoutSample[]): {
  metrics: Record<string, number>;
  gateResults: V07GateResult[];
  passedAllGates: boolean;
  blockers: string[];
} {
  const m = computeV07HoldoutMetrics(samples);
  const gates: V07GateResult[] = [
    g("allFinite", num(m, "allFinite"), 1, ">="),
    g("allScoresInRange", num(m, "allScoresInRange"), 1, ">="),
    g("unavailableRateMax", num(m, "unavailableRate"), 0.02, "<="),
    g("extremeScoreRateMax", num(m, "extremeScoreRate"), 0.02, "<="),
    g("softExtremeScoreRateMax", num(m, "softExtremeScoreRate"), 0.08, "<="),
    g("tp4cContributionMaxAbs", num(m, "tp4cContributionMaxAbs"), 0.1, "<="),
    g("globalMedianScoreMin", num(m, "globalMedianScore"), 48, ">="),
    g("globalMedianScoreMax", num(m, "globalMedianScore"), 52, "<="),
    g("globalMeanScoreMin", num(m, "globalMeanScore"), 47, ">="),
    g("globalMeanScoreMax", num(m, "globalMeanScore"), 53, "<="),
    g("positiveStrictLatentRateMin", num(m, "positiveStrictLatentRate"), 0.35, ">="),
    g("positiveStrictLatentRateMax", num(m, "positiveStrictLatentRate"), 0.65, "<="),
    g("negativeStrictLatentRateMin", num(m, "negativeStrictLatentRate"), 0.35, ">="),
    g("negativeStrictLatentRateMax", num(m, "negativeStrictLatentRate"), 0.65, "<="),
    g("meanIntraYearSixAxisSdMin", num(m, "meanIntraYearSixAxisSd"), 10, ">="),
    g("medianIntraYearRangeMin", num(m, "medianIntraYearRange"), 28, ">="),
    g("p25IntraYearRangeMin", num(m, "p25IntraYearRange"), 20, ">="),
    g("p10IntraYearRangeMin", num(m, "p10IntraYearRange"), 14, ">="),
    g("atLeastTwoOutside42To58RateMin", num(m, "atLeastTwoOutside42To58Rate"), 0.7, ">="),
    g("atLeastOneAtOrBelow42RateMin", num(m, "atLeastOneAtOrBelow42Rate"), 0.6, ">="),
    g("atLeastOneAtOrAbove62RateMin", num(m, "atLeastOneAtOrAbove62Rate"), 0.6, ">="),
    g("oneLowAndOneHighRateMin", num(m, "oneLowAndOneHighRate"), 0.55, ">="),
    g("allSixAbove50RateMax", num(m, "allSixAbove50Rate"), 0.08, "<="),
    g("fiveOrMoreAbove50RateMax", num(m, "fiveOrMoreAbove50Rate"), 0.25, "<="),
    g("allSixInside45To65RateMax", num(m, "allSixInside45To65Rate"), 0.25, "<="),
    g("exactDuplicateVectorRateMax", num(m, "exactDuplicateVectorRate"), 0.01, "<="),
    g("nearDuplicateVectorRateMax", num(m, "nearDuplicateVectorRate"), 0.05, "<="),
    g("maxAbsInterAxisCorrelationMax", num(m, "maxAbsInterAxisCorrelation"), 0.9, "<="),
  ];

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    gates.push(g(`domainMedianMin_${domain}`, num(m, `domainMedian_${domain}`), 46, ">="));
    gates.push(g(`domainMedianMax_${domain}`, num(m, `domainMedian_${domain}`), 54, "<="));
    gates.push(
      g(
        `domainPositiveStrictLatentRateMin_${domain}`,
        num(m, `domainPositiveStrictLatentRate_${domain}`),
        0.3,
        ">=",
      ),
    );
    gates.push(
      g(
        `domainPositiveStrictLatentRateMax_${domain}`,
        num(m, `domainPositiveStrictLatentRate_${domain}`),
        0.7,
        "<=",
      ),
    );
    gates.push(
      g(
        `domainNegativeStrictLatentRateMin_${domain}`,
        num(m, `domainNegativeStrictLatentRate_${domain}`),
        0.3,
        ">=",
      ),
    );
    gates.push(
      g(
        `domainNegativeStrictLatentRateMax_${domain}`,
        num(m, `domainNegativeStrictLatentRate_${domain}`),
        0.7,
        "<=",
      ),
    );
    gates.push(
      g(`domainTwelveYearRangeMin_${domain}`, num(m, `domainTwelveYearRange_${domain}`), 10, ">="),
    );
    gates.push(
      g(`domainAdjacentDeltaMin_${domain}`, num(m, `domainAdjacentDelta_${domain}`), 2.0, ">="),
    );
  }

  const blockers = gates
    .filter((x) => !x.passed)
    .map((x) => `${x.gate}: ${x.value} vs ${x.comparator} ${x.threshold}`);
  return {
    metrics: m,
    gateResults: gates,
    passedAllGates: blockers.length === 0,
    blockers,
  };
}
