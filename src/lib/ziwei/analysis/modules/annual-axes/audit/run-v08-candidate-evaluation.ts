import type { BirthInput } from "@/types/chart";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { ANNUAL_AXIS_DOMAINS } from "../../../contracts/annual-axes";
import type {
  AnnualAxesKnowledgeV08NamPhai,
  V08ScoreProfileId,
} from "../../../knowledge/annual-axes/v0.8";
import {
  deriveV08Calibration,
  V08_CALIBRATION_GENERATED_AT,
  V08_ENGINE_VERSION,
  V08_FORMULA_VERSION,
} from "../../../knowledge/annual-axes/v0.8/derive-calibration";
import { FULL_CORPUS_CONTRACT } from "./build-audit-corpus";
import { scoreV08HoldoutSamples } from "./v08-calibration";
import { evaluateV08HoldoutGates } from "./v08-gates";
import { scoreV08ChartDomains } from "../nam-phai-v08/score-chart";
import { analyzeAnnualAxesNamPhaiV05 } from "../nam-phai-v05/analyze";
import { analyzeAnnualAxesNamPhaiV07 } from "../nam-phai-v07/analyze";
import type {
  V08CandidateEvaluationReport,
  V08CandidateResult,
  V08ProductFixtureScores,
} from "./v08-types";

export const V08_PRODUCT_FIXTURE: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

const V05_BASELINE = {
  health: 41.9,
  family: 59.2,
  wealth: 47.5,
  career: 50,
  social: 53.7,
  romance: 58.9,
} as const;

const CANDIDATES: Array<{ id: V08ScoreProfileId; step: number }> = [
  { id: "DIRECT-STRICT-16", step: 16 },
  { id: "DIRECT-STRICT-18", step: 18 },
  { id: "DIRECT-STRICT-20", step: 20 },
];

function productFixtureFor(
  knowledge: AnnualAxesKnowledgeV08NamPhai,
  calibration: ReturnType<typeof deriveV08Calibration>,
  candidateId: V08ScoreProfileId,
  step: number,
  v07Scores: Record<string, number>,
): V08ProductFixtureScores {
  const chart = calculateNamPhai(V08_PRODUCT_FIXTURE);
  const domains = scoreV08ChartDomains(chart, knowledge, {
    candidateId,
    scoreStepPerRobustSigma: step,
    domainCenterOverride: calibration.domainCenters,
    robustScaleOverride: calibration.robustScales,
    activationScaleOverride: calibration.activationScales,
  });
  const scores = Object.fromEntries(
    ANNUAL_AXIS_DOMAINS.map((d) => {
      const row = domains?.find((x) => x.domain === d);
      return [d, row?.score ?? 50];
    }),
  ) as Record<(typeof ANNUAL_AXIS_DOMAINS)[number], number>;

  const vals = ANNUAL_AXIS_DOMAINS.map((d) => scores[d]);
  const minimum = Math.min(...vals);
  const maximum = Math.max(...vals);
  const radarRange = maximum - minimum;
  const l1FromV05 = ANNUAL_AXIS_DOMAINS.reduce(
    (s, d) => s + Math.abs(scores[d] - V05_BASELINE[d]),
    0,
  );
  const l1FromV07 = ANNUAL_AXIS_DOMAINS.reduce(
    (s, d) => s + Math.abs(scores[d] - (v07Scores[d] ?? 50)),
    0,
  );
  const countAbove50 = vals.filter((v) => v > 50).length;
  const countAtOrBelow45 = vals.filter((v) => v <= 45).length;
  const countAtOrAbove58 = vals.filter((v) => v >= 58).length;

  const productBlockers: string[] = [];
  if (radarRange < 30) productBlockers.push(`radarRange ${radarRange} < 30`);
  if (minimum > 38) productBlockers.push(`minimum ${minimum} > 38`);
  if (maximum < 65) productBlockers.push(`maximum ${maximum} < 65`);
  if (countAtOrBelow45 < 2) productBlockers.push(`countAtOrBelow45 ${countAtOrBelow45} < 2`);
  if (countAtOrAbove58 < 2) productBlockers.push(`countAtOrAbove58 ${countAtOrAbove58} < 2`);
  if (countAbove50 > 4) productBlockers.push(`countAbove50 ${countAbove50} > 4`);
  if (l1FromV05 < 25) productBlockers.push(`l1FromV05 ${l1FromV05} < 25`);
  if (l1FromV07 <= 0) productBlockers.push(`l1FromV07 ${l1FromV07} <= 0`);

  return {
    ...scores,
    minimum,
    maximum,
    radarRange,
    countAbove50,
    countAtOrBelow45,
    countAtOrAbove58,
    l1FromV05,
    l1FromV07,
    passesProductGates: productBlockers.length === 0,
    productBlockers,
  };
}

function selectCandidate(results: V08CandidateResult[]): {
  selectedVariant: V08ScoreProfileId | null;
  selectionStatus: "approved" | "no-variant-approved";
  selectionRationale: string[];
} {
  const passers = results.filter((r) => r.passedAllGates && r.productFixture.passesProductGates);
  if (passers.length === 0) {
    return {
      selectedVariant: null,
      selectionStatus: "no-variant-approved",
      selectionRationale: ["No candidate passed all hard holdout and product gates."],
    };
  }
  const aggression: Record<string, number> = {
    "DIRECT-STRICT-16": 0,
    "DIRECT-STRICT-18": 1,
    "DIRECT-STRICT-20": 2,
  };
  const metric = (r: V08CandidateResult, key: string) => r.holdoutMetrics[key] ?? 0;
  const sorted = [...passers].sort((a, b) => {
    const dMed =
      Math.abs(metric(a, "globalMedianScore") - 50) -
      Math.abs(metric(b, "globalMedianScore") - 50);
    if (dMed !== 0) return dMed;
    const dAll = metric(a, "allSixAbove50Rate") - metric(b, "allSixAbove50Rate");
    if (dAll !== 0) return dAll;
    const dFive = metric(a, "fiveOrMoreAbove50Rate") - metric(b, "fiveOrMoreAbove50Rate");
    if (dFive !== 0) return dFive;
    const dOne = metric(b, "oneLowAndOneHighRate") - metric(a, "oneLowAndOneHighRate");
    if (dOne !== 0) return dOne;
    const dP25 = metric(b, "p25IntraYearRange") - metric(a, "p25IntraYearRange");
    if (dP25 !== 0) return dP25;
    return (aggression[a.candidateId] ?? 9) - (aggression[b.candidateId] ?? 9);
  });
  const winner = sorted[0]!;
  return {
    selectedVariant: winner.candidateId,
    selectionStatus: "approved",
    selectionRationale: [
      `Selected ${winner.candidateId} by declared deterministic tie-break among ${passers.length} passing candidate(s).`,
    ],
  };
}

export function runV08CandidateEvaluation(
  knowledge: AnnualAxesKnowledgeV08NamPhai,
): V08CandidateEvaluationReport {
  const v05 = analyzeAnnualAxesNamPhaiV05(calculateNamPhai(V08_PRODUCT_FIXTURE));
  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const axis = v05.axes[domain];
    if (axis.status === "available" && axis.score !== V05_BASELINE[domain]) {
      throw new Error(`V0.5 fixture drift on ${domain}: ${axis.score}`);
    }
  }
  const v07 = analyzeAnnualAxesNamPhaiV07(calculateNamPhai(V08_PRODUCT_FIXTURE));
  const v07Scores = Object.fromEntries(
    ANNUAL_AXIS_DOMAINS.map((d) => {
      const axis = v07.axes[d];
      return [d, axis.status === "available" ? axis.score : 50];
    }),
  );

  const calibration = deriveV08Calibration(knowledge, FULL_CORPUS_CONTRACT);

  const candidates: V08CandidateResult[] = CANDIDATES.map((spec) => {
    const holdoutSamples = scoreV08HoldoutSamples(
      knowledge,
      calibration,
      spec.id,
      spec.step,
    );
    const evalResult = evaluateV08HoldoutGates(holdoutSamples);
    const productFixture = productFixtureFor(
      knowledge,
      calibration,
      spec.id,
      spec.step,
      v07Scores,
    );
    return {
      candidateId: spec.id,
      scoreStepPerRobustSigma: spec.step,
      holdoutMetrics: evalResult.metrics,
      gateResults: evalResult.gateResults,
      passedAllGates: evalResult.passedAllGates,
      blockers: [
        ...evalResult.blockers,
        ...productFixture.productBlockers.map((b) => `product:${b}`),
      ],
      productFixture,
    };
  });

  const selection = selectCandidate(candidates);

  return {
    profileId: "annual-axes-v0.8-candidate-evaluation",
    corpusId: FULL_CORPUS_CONTRACT.contractId,
    generatedAt: V08_CALIBRATION_GENERATED_AT,
    formulaVersion: V08_FORMULA_VERSION,
    engineVersion: V08_ENGINE_VERSION,
    calibration: {
      domainCenters: calibration.domainCenters,
      robustScales: calibration.robustScales,
      activationScales: calibration.activationScales,
    },
    candidates,
    selectedVariant: selection.selectedVariant,
    selectionStatus: selection.selectionStatus,
    selectionRationale: selection.selectionRationale,
  };
}
