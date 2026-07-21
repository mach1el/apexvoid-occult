import { ANNUAL_AXIS_DOMAINS, type AnnualAxisDomain } from "../../../contracts/annual-axes";
import type {
  AnnualAxesKnowledgeV08NamPhai,
  AnnualAxisCalibrationV08,
  V08ScoreProfileId,
} from "../../../knowledge/annual-axes/v0.8";
import { splitChartIndices } from "../../../knowledge/annual-axes/v0.8/derive-calibration";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import {
  FULL_CORPUS_CONTRACT,
  buildAuditBirthInputs,
  expandAnnualYears,
} from "./build-audit-corpus";
import { scoreV08ChartDomains } from "../nam-phai-v08/score-chart";

export interface V08HoldoutSample {
  chartId: string;
  chartIndex: number;
  annualYear: number;
  domain: AnnualAxisDomain;
  score: number;
  effectiveZ: number;
  activationGate: number;
  directSignedRaw: number;
  confidence: number;
  tp4cSignedContribution: number;
  retainedDirectFactCount: number;
}

export function scoreV08HoldoutSamples(
  knowledge: AnnualAxesKnowledgeV08NamPhai,
  calibration: Pick<
    AnnualAxisCalibrationV08,
    "domainCenters" | "robustScales" | "activationScales"
  >,
  candidateId: V08ScoreProfileId,
  scoreStep: number,
): V08HoldoutSample[] {
  const { holdout } = splitChartIndices(FULL_CORPUS_CONTRACT.chartCount);
  const bases = buildAuditBirthInputs(FULL_CORPUS_CONTRACT);
  const samples: V08HoldoutSample[] = [];

  for (const chartIndex of holdout) {
    const base = bases[chartIndex];
    if (!base) continue;
    const chartId = `${FULL_CORPUS_CONTRACT.contractId}:nam-phai:c${chartIndex}`;
    for (const yearly of expandAnnualYears(
      base,
      FULL_CORPUS_CONTRACT.baseAnnualYear,
      FULL_CORPUS_CONTRACT.yearsPerChart,
    )) {
      const chart = calculateNamPhai(yearly);
      const domains = scoreV08ChartDomains(chart, knowledge, {
        candidateId,
        scoreStepPerRobustSigma: scoreStep,
        domainCenterOverride: calibration.domainCenters,
        robustScaleOverride: calibration.robustScales,
        activationScaleOverride: calibration.activationScales,
      });
      if (!domains) continue;
      for (const d of domains) {
        if (d.unavailableReasonCodes?.length || !d.trace) continue;
        samples.push({
          chartId,
          chartIndex,
          annualYear: chart.annualYear,
          domain: d.domain,
          score: d.score,
          effectiveZ: d.effectiveZ,
          activationGate: d.activationGate,
          directSignedRaw: d.directSignedRaw,
          confidence: d.confidence,
          tp4cSignedContribution: d.trace.tp4cSignedContribution,
          retainedDirectFactCount: d.trace.retainedDirectFactCount,
        });
      }
    }
  }
  return samples;
}
