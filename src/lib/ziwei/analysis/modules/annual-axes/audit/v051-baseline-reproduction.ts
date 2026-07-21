/**
 * Full V0.5 baseline reproduction against committed holdout + calibration artifacts.
 *
 * Calibration values are recomputed from the training corpus via deriveV05Calibration —
 * never compared only against the already-loaded knowledge.calibration artifact.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { ANNUAL_AXIS_DOMAINS } from "../../../contracts/annual-axes";
import type { AnnualAxesKnowledgeV05NamPhai } from "../../../knowledge/annual-axes/v0.5";
import {
  deriveV05Calibration,
  splitChartIndices,
} from "../../../knowledge/annual-axes/v0.5/derive-calibration";
import { analyzeAnnualAxesNamPhaiV05 } from "../nam-phai-v05/analyze";
import {
  FULL_CORPUS_CONTRACT,
  buildAuditBirthInputs,
  expandAnnualYears,
} from "./build-audit-corpus";
import { computeDistributionReport } from "./compute-distribution-report";
import { availableScores } from "./compare-annual-vectors";
import type { AnnualAxesAuditObservation } from "./types";
import { closeEnough } from "./v051-stats";

const HOLDOUT_REPORT_PATH = join(
  process.cwd(),
  "research/annual-axes/distribution/v0.5/annual-axes-v0.5-holdout-report.json",
);

const CALIBRATION_PATH = join(
  process.cwd(),
  "src/lib/ziwei/analysis/knowledge/annual-axes/v0.5/annual-axis-calibration.nam-phai.v0.5.json",
);

export interface BaselineMismatch {
  path: string;
  committed: number;
  reproduced: number;
  tolerance: number;
}

export interface BaselineReproduction {
  reproduced: boolean;
  checkedMetricCount: number;
  mismatches: BaselineMismatch[];
}

function check(
  mismatches: BaselineMismatch[],
  path: string,
  committed: number,
  reproduced: number,
  rel: number,
  abs: number,
): void {
  const tolerance = Math.max(abs, rel * Math.max(Math.abs(committed), Math.abs(reproduced)));
  if (!closeEnough(committed, reproduced, rel, abs)) {
    mismatches.push({ path, committed, reproduced, tolerance });
  }
}

function stableChartId(contractId: string, chartIndex: number): string {
  return `${contractId}:nam-phai:c${chartIndex}`;
}

export function verifyV05BaselineReproduction(
  knowledge: AnnualAxesKnowledgeV05NamPhai,
): BaselineReproduction {
  const committedHoldout = JSON.parse(readFileSync(HOLDOUT_REPORT_PATH, "utf8"));
  const committedCal = JSON.parse(readFileSync(CALIBRATION_PATH, "utf8"));
  const mismatches: BaselineMismatch[] = [];

  // Independently recompute calibration from the training corpus.
  const reproducedCal = deriveV05Calibration(knowledge, FULL_CORPUS_CONTRACT);

  check(
    mismatches,
    "calibration.activationScale",
    committedCal.activationScale,
    reproducedCal.activationScale,
    1e-12,
    1e-12,
  );
  check(
    mismatches,
    "calibration.medianPositiveAnnualActivationRaw",
    committedCal.medianPositiveAnnualActivationRaw,
    reproducedCal.medianPositiveAnnualActivationRaw,
    1e-12,
    1e-12,
  );
  for (const domain of ANNUAL_AXIS_DOMAINS) {
    check(
      mismatches,
      `calibration.domainScales.${domain}`,
      committedCal.domainScales[domain],
      reproducedCal.domainScales[domain],
      1e-12,
      1e-12,
    );
    check(
      mismatches,
      `calibration.q75AbsLatent.${domain}`,
      committedCal.q75AbsLatent[domain],
      reproducedCal.q75AbsLatent[domain],
      1e-12,
      1e-12,
    );
  }
  check(
    mismatches,
    "calibration.trainingDiagnostics.medianActivationGate",
    committedCal.trainingDiagnostics.medianActivationGate,
    reproducedCal.trainingDiagnostics.medianActivationGate,
    1e-12,
    1e-12,
  );
  check(
    mismatches,
    "calibration.trainingDiagnostics.p90ActivationGate",
    committedCal.trainingDiagnostics.p90ActivationGate,
    reproducedCal.trainingDiagnostics.p90ActivationGate,
    1e-12,
    1e-12,
  );
  check(
    mismatches,
    "calibration.trainingDiagnostics.maxActivationGate",
    committedCal.trainingDiagnostics.maxActivationGate,
    reproducedCal.trainingDiagnostics.maxActivationGate,
    1e-12,
    1e-12,
  );

  // Holdout distribution — same method as v05-holdout.write.test.ts
  const { holdout: holdoutIndices } = splitChartIndices(FULL_CORPUS_CONTRACT.chartCount);
  const bases = buildAuditBirthInputs(FULL_CORPUS_CONTRACT);
  const observations: AnnualAxesAuditObservation[] = [];
  let totalAxes = 0;
  let extremeAxes = 0;
  let outsideVectors = 0;
  let outsideVectorsTotal = 0;
  let tp4cContributionMaxAbs = 0;

  for (const chartIndex of holdoutIndices) {
    const base = bases[chartIndex];
    if (!base) continue;
    const chartId = stableChartId(FULL_CORPUS_CONTRACT.contractId, chartIndex);
    for (const yearly of expandAnnualYears(
      base,
      FULL_CORPUS_CONTRACT.baseAnnualYear,
      FULL_CORPUS_CONTRACT.yearsPerChart,
    )) {
      const chart = calculateNamPhai(yearly);
      const result = analyzeAnnualAxesNamPhaiV05(chart);
      for (const domain of ANNUAL_AXIS_DOMAINS) {
        const axis = result.axes[domain];
        if (axis.status !== "available") continue;
        tp4cContributionMaxAbs = Math.max(
          tp4cContributionMaxAbs,
          Math.abs(axis.spatialBudgetTrace?.tp4cContribution ?? 0),
        );
      }
      const obs: AnnualAxesAuditObservation = {
        chartId,
        school: "nam-phai",
        annualYear: chart.annualYear,
        annualHeadPalaceIndex:
          chart.annualHeadPalace?.index ??
          chart.palaces.find((p) => p.isLuuNienDaiVan)?.index ??
          null,
        status: result.status,
        scores: Object.fromEntries(
          ANNUAL_AXIS_DOMAINS.map((domain) => {
            const axis = result.axes[domain];
            return [domain, axis.status === "available" ? axis.score : null] as const;
          }),
        ) as AnnualAxesAuditObservation["scores"],
      };
      observations.push(obs);
      const vals = availableScores(obs.scores);
      if (vals.length === 6) {
        outsideVectorsTotal += 1;
        if (vals.filter((v) => v < 45 || v > 55).length >= 2) outsideVectors += 1;
        totalAxes += 6;
        extremeAxes += vals.filter((v) => v <= 2 || v >= 98).length;
      }
    }
  }

  const report = computeDistributionReport(knowledge.distributionGates.catalogId, observations);
  const maxAbsInterAxisCorrelation = Math.max(
    ...Object.values(report.interAxisCorrelation).map((v) => Math.abs(v)),
  );
  const extremeScoreRate = totalAxes === 0 ? 0 : extremeAxes / totalAxes;
  const outsideNeutralBandRate =
    outsideVectorsTotal === 0 ? 0 : outsideVectors / outsideVectorsTotal;
  const minDomainMedianTwelveYearRange = Math.min(
    ...Object.values(report.longitudinalChange.medianPerDomainTwelveYearRange),
  );
  const minDomainAdjacentYearMedianAbsDelta = Math.min(
    ...Object.values(report.longitudinalChange.medianAdjacentYearAbsoluteDelta),
  );
  const hm = committedHoldout.holdoutMetrics;

  check(
    mismatches,
    "holdout.meanIntraYearAxisStandardDeviation",
    hm.meanIntraYearAxisStandardDeviation,
    report.intraYearAxisSpread.meanStandardDeviation,
    1e-9,
    1e-9,
  );
  check(
    mismatches,
    "holdout.medianIntraYearAxisRange",
    hm.medianIntraYearAxisRange,
    report.intraYearAxisSpread.medianRange,
    1e-9,
    1e-9,
  );
  check(
    mismatches,
    "holdout.minDomainMedianTwelveYearRange",
    hm.minDomainMedianTwelveYearRange,
    minDomainMedianTwelveYearRange,
    1e-9,
    1e-9,
  );
  check(
    mismatches,
    "holdout.minDomainAdjacentYearMedianAbsDelta",
    hm.minDomainAdjacentYearMedianAbsDelta,
    minDomainAdjacentYearMedianAbsDelta,
    1e-9,
    1e-9,
  );
  for (const domain of ANNUAL_AXIS_DOMAINS) {
    check(
      mismatches,
      `holdout.perDomainMedianTwelveYearRange.${domain}`,
      hm.perDomainMedianTwelveYearRange[domain],
      report.longitudinalChange.medianPerDomainTwelveYearRange[domain],
      1e-9,
      1e-9,
    );
    check(
      mismatches,
      `holdout.perDomainAdjacentYearMedianAbsDelta.${domain}`,
      hm.perDomainAdjacentYearMedianAbsDelta[domain],
      report.longitudinalChange.medianAdjacentYearAbsoluteDelta[domain],
      1e-9,
      1e-9,
    );
  }
  check(mismatches, "holdout.exactDuplicateVectorRate", hm.exactDuplicateVectorRate, report.exactDuplicateVectorRate, 1e-12, 1e-12);
  check(
    mismatches,
    "holdout.nearDuplicateVectorRate",
    hm.nearDuplicateVectorRate,
    report.crossChartSimilarity.nearDuplicateVectorRate,
    1e-12,
    1e-12,
  );
  check(mismatches, "holdout.unavailableRate", hm.unavailableRate, report.unavailableRate, 1e-12, 1e-12);
  check(
    mismatches,
    "holdout.maxAbsInterAxisCorrelation",
    hm.maxAbsInterAxisCorrelation,
    maxAbsInterAxisCorrelation,
    1e-9,
    1e-9,
  );
  check(mismatches, "holdout.extremeScoreRate", hm.extremeScoreRate, extremeScoreRate, 1e-12, 1e-12);
  check(
    mismatches,
    "holdout.tp4cContributionMaxAbs",
    hm.tp4cContributionMaxAbs,
    tp4cContributionMaxAbs,
    1e-9,
    1e-9,
  );
  check(
    mismatches,
    "holdout.medianRadarRange",
    hm.medianRadarRange,
    report.intraYearAxisSpread.medianRange,
    1e-9,
    1e-9,
  );
  check(
    mismatches,
    "holdout.outsideNeutralBandRate",
    hm.outsideNeutralBandRate,
    outsideNeutralBandRate,
    1e-12,
    1e-12,
  );

  // Holdout report's copied calibration fields must match independently reproduced calibration.
  check(
    mismatches,
    "holdoutReport.activationScale",
    committedHoldout.activationScale,
    reproducedCal.activationScale,
    1e-12,
    1e-12,
  );
  for (const domain of ANNUAL_AXIS_DOMAINS) {
    check(
      mismatches,
      `holdoutReport.domainScales.${domain}`,
      committedHoldout.domainScales[domain],
      reproducedCal.domainScales[domain],
      1e-12,
      1e-12,
    );
  }
  check(
    mismatches,
    "holdoutReport.trainingDiagnostics.medianActivationGate",
    committedHoldout.trainingDiagnostics.medianActivationGate,
    reproducedCal.trainingDiagnostics.medianActivationGate,
    1e-12,
    1e-12,
  );
  check(
    mismatches,
    "holdoutReport.trainingDiagnostics.p90ActivationGate",
    committedHoldout.trainingDiagnostics.p90ActivationGate,
    reproducedCal.trainingDiagnostics.p90ActivationGate,
    1e-12,
    1e-12,
  );
  check(
    mismatches,
    "holdoutReport.trainingDiagnostics.maxActivationGate",
    committedHoldout.trainingDiagnostics.maxActivationGate,
    reproducedCal.trainingDiagnostics.maxActivationGate,
    1e-12,
    1e-12,
  );

  const checkedMetricCount =
    1 + // activationScale
    1 + // medianPositive
    ANNUAL_AXIS_DOMAINS.length * 2 + // domainScales + q75
    3 + // training diagnostics
    2 + // mean SD + median range
    2 + // min domain range + min adjacent delta
    ANNUAL_AXIS_DOMAINS.length * 2 + // per-domain ranges + deltas
    8 + // rates / corr / extreme / tp4c / radar / outside
    1 + // holdout report activationScale
    ANNUAL_AXIS_DOMAINS.length + // holdout report domainScales
    3; // holdout report training diagnostics

  return {
    reproduced: mismatches.length === 0,
    checkedMetricCount,
    mismatches,
  };
}

/** Test helper — inject a synthetic committed value mismatch. */
export function checkMetricMismatch(
  path: string,
  committed: number,
  reproduced: number,
  rel = 1e-9,
  abs = 1e-9,
): BaselineMismatch | null {
  const mismatches: BaselineMismatch[] = [];
  check(mismatches, path, committed, reproduced, rel, abs);
  return mismatches[0] ?? null;
}
