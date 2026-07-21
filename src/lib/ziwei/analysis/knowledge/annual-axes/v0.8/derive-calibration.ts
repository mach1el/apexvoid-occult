import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { ANNUAL_AXIS_DOMAINS, type AnnualAxisDomain } from "../../../contracts/annual-axes";
import type { AnnualAxisDomainId } from "../schema";
import type { AnnualAxesKnowledgeV08NamPhai, AnnualAxisCalibrationV08 } from "./schema";
import {
  buildAuditBirthInputs,
  expandAnnualYears,
  FULL_CORPUS_CONTRACT,
  type AuditCorpusContract,
} from "../../../modules/annual-axes/audit/build-audit-corpus";
import { scoreV08ChartDomains } from "../../../modules/annual-axes/nam-phai-v08/score-chart";

export const V08_CALIBRATION_GENERATED_AT = "2026-07-22T00:00:00.000Z";
export const V08_FORMULA_VERSION = "v0.8-direct-anchor-robust-score";
export const V08_ENGINE_VERSION = "0.8.0";
export const V08_ACTIVATION_TARGET_GATE = 0.7;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return percentile(sorted, 0.5);
}

export function splitChartIndices(
  chartCount: number,
  trainingFraction = 0.8,
): { training: number[]; holdout: number[] } {
  const trainingCount = Math.floor(chartCount * trainingFraction);
  const training = Array.from({ length: trainingCount }, (_, i) => i);
  const holdout = Array.from(
    { length: chartCount - trainingCount },
    (_, i) => i + trainingCount,
  );
  return { training, holdout };
}

interface RawSample {
  domain: AnnualAxisDomain;
  directSignedRaw: number;
  annualActivationRaw: number;
  activationGate: number;
}

function collectRaw(
  contract: AuditCorpusContract,
  chartIndices: number[],
  knowledge: AnnualAxesKnowledgeV08NamPhai,
  activationScaleByDomain: Record<AnnualAxisDomain, number>,
): RawSample[] {
  const bases = buildAuditBirthInputs(contract);
  const samples: RawSample[] = [];
  const zeroCenters = Object.fromEntries(ANNUAL_AXIS_DOMAINS.map((d) => [d, 0])) as Record<
    AnnualAxisDomain,
    number
  >;
  const unitScales = Object.fromEntries(ANNUAL_AXIS_DOMAINS.map((d) => [d, 1])) as Record<
    AnnualAxisDomain,
    number
  >;

  for (const chartIndex of chartIndices) {
    const base = bases[chartIndex];
    if (!base) continue;
    for (const yearly of expandAnnualYears(base, contract.baseAnnualYear, contract.yearsPerChart)) {
      const chart = calculateNamPhai(yearly);
      const domains = scoreV08ChartDomains(chart, knowledge, {
        domainCenterOverride: zeroCenters,
        robustScaleOverride: unitScales,
        activationScaleOverride: activationScaleByDomain,
        candidateId: "DIRECT-STRICT-18",
        scoreStepPerRobustSigma: 18,
      });
      if (!domains) continue;
      for (const d of domains) {
        if (d.unavailableReasonCodes?.length) continue;
        samples.push({
          domain: d.domain,
          directSignedRaw: d.directSignedRaw,
          annualActivationRaw: d.annualActivationRaw,
          activationGate: d.activationGate,
        });
      }
    }
  }
  return samples;
}

export function deriveV08Calibration(
  knowledge: AnnualAxesKnowledgeV08NamPhai,
  contract: AuditCorpusContract = FULL_CORPUS_CONTRACT,
): AnnualAxisCalibrationV08 {
  const { training } = splitChartIndices(contract.chartCount);
  const unitActivation = Object.fromEntries(ANNUAL_AXIS_DOMAINS.map((d) => [d, 1])) as Record<
    AnnualAxisDomain,
    number
  >;
  const provisional = collectRaw(contract, training, knowledge, unitActivation);

  const activationScales = {} as Record<AnnualAxisDomainId, number>;
  const medianPositiveAnnualActivationRaw = {} as Record<AnnualAxisDomainId, number>;
  const target = Math.atanh(V08_ACTIVATION_TARGET_GATE);

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const positives = provisional
      .filter((s) => s.domain === domain && s.annualActivationRaw > 0)
      .map((s) => s.annualActivationRaw);
    const med = median(positives);
    medianPositiveAnnualActivationRaw[domain] = med;
    activationScales[domain] = med > 0 ? med / target : 1;
  }

  const trainingSamples = collectRaw(contract, training, knowledge, activationScales);

  const domainCenters = {} as Record<AnnualAxisDomainId, number>;
  const robustScales = {} as Record<AnnualAxisDomainId, number>;
  const madScales = {} as Record<AnnualAxisDomainId, number>;
  const iqrScales = {} as Record<AnnualAxisDomainId, number>;
  const { madConsistencyFactor, iqrConsistencyFactor, minimumRobustScale } =
    knowledge.scoreProfile.robustCalibration;

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const domainSamples = trainingSamples.filter((s) => s.domain === domain);
    const centerPool = domainSamples
      .filter((s) => s.activationGate > 0)
      .map((s) => s.directSignedRaw);
    const center = median(centerPool);
    domainCenters[domain] = center;

    const deviations = centerPool.map((v) => Math.abs(v - center));
    const mad = median(deviations);
    const madScale = madConsistencyFactor * mad;
    const sortedSigned = [...centerPool].sort((a, b) => a - b);
    const iqrScale =
      (percentile(sortedSigned, 0.75) - percentile(sortedSigned, 0.25)) / iqrConsistencyFactor;
    madScales[domain] = madScale;
    iqrScales[domain] = iqrScale;
    robustScales[domain] = Math.max(madScale, iqrScale, minimumRobustScale);
  }

  return {
    schemaVersion: "0.8.0",
    profileId: "annual-axis-calibration-nam-phai-v0-8",
    engineVersion: V08_ENGINE_VERSION,
    formulaVersion: V08_FORMULA_VERSION,
    trainingCorpusId: contract.contractId,
    splitPolicy: {
      trainingFraction: 0.8,
      holdoutFraction: 0.2,
      splitBy: "stable-chart-id",
    },
    activationTargetMedianGate: V08_ACTIVATION_TARGET_GATE,
    domainCenters,
    robustScales,
    activationScales,
    madScales,
    iqrScales,
    medianPositiveAnnualActivationRaw,
    selectedVariant: null,
    selectionStatus: "pending",
    generatedAt: V08_CALIBRATION_GENERATED_AT,
    sourceIds: ["SRC-AA-ENG-004"],
  };
}
