import { ANNUAL_AXIS_DOMAINS, type AnnualAxisDomain } from "../../../contracts/annual-axes";
import type {
  AnnualAxesKnowledgeV07NamPhai,
  AnnualAxisCalibrationV07,
} from "../../../knowledge/annual-axes/v0.7";
import {
  splitChartIndices,
  V07_SIGNED_LAYER_FACTORS,
} from "../../../knowledge/annual-axes/v0.7/derive-calibration";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import {
  FULL_CORPUS_CONTRACT,
  buildAuditBirthInputs,
  expandAnnualYears,
} from "./build-audit-corpus";
import { scoreV07ChartDomains } from "../nam-phai-v07/score-chart";

export interface V07HoldoutSample {
  chartId: string;
  chartIndex: number;
  annualYear: number;
  domain: AnnualAxisDomain;
  score: number;
  strictLatent: number;
  activationGate: number;
  spatialSignedRaw: number;
  domainCenter: number;
  centeredSpatial: number;
  tp4cContributionAbs: number;
}

export function scoreV07HoldoutSamples(
  knowledge: AnnualAxesKnowledgeV07NamPhai,
  calibration: Pick<
    AnnualAxisCalibrationV07,
    "activationScale" | "domainCenters" | "domainScales" | "signedLayerFactors"
  >,
): V07HoldoutSample[] {
  const { holdout } = splitChartIndices(FULL_CORPUS_CONTRACT.chartCount);
  const bases = buildAuditBirthInputs(FULL_CORPUS_CONTRACT);
  const samples: V07HoldoutSample[] = [];

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
      const domains = scoreV07ChartDomains(chart, knowledge, {
        activationScaleOverride: calibration.activationScale,
        domainScaleOverride: calibration.domainScales,
        domainCenterOverride: calibration.domainCenters,
        signedLayerFactorsOverride:
          calibration.signedLayerFactors ?? V07_SIGNED_LAYER_FACTORS,
      });
      if (!domains) continue;
      for (const d of domains) {
        samples.push({
          chartId,
          chartIndex,
          annualYear: chart.annualYear,
          domain: d.domain,
          score: d.score,
          strictLatent: d.strictLatent,
          activationGate: d.activationGate,
          spatialSignedRaw: d.spatialSignedRaw,
          domainCenter: d.domainCenter,
          centeredSpatial: d.centeredSpatial,
          tp4cContributionAbs: Math.abs(
            d.aggregate.spatialBudgetTrace.tp4cContribution ?? 0,
          ),
        });
      }
    }
  }
  return samples;
}
