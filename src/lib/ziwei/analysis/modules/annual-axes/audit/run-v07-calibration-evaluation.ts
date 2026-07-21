import type { BirthInput } from "@/types/chart";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { ANNUAL_AXIS_DOMAINS } from "../../../contracts/annual-axes";
import type { AnnualAxesKnowledgeV07NamPhai } from "../../../knowledge/annual-axes/v0.7";
import {
  deriveV07Calibration,
  V07_CALIBRATION_GENERATED_AT,
  V07_ENGINE_VERSION,
  V07_FORMULA_VERSION,
  V07_SIGNED_LAYER_FACTORS,
} from "../../../knowledge/annual-axes/v0.7/derive-calibration";
import { FULL_CORPUS_CONTRACT } from "./build-audit-corpus";
import { scoreV07HoldoutSamples } from "./v07-calibration";
import { evaluateV07HoldoutGates } from "./v07-gates";
import { scoreV07ChartDomains } from "../nam-phai-v07/score-chart";
import { analyzeAnnualAxesNamPhaiV05 } from "../nam-phai-v05/analyze";
import type { V07CalibrationReport, V07ProductFixtureScores } from "./v07-types";

export const V07_PRODUCT_FIXTURE: BirthInput = {
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

function evaluateProductFixture(
  knowledge: AnnualAxesKnowledgeV07NamPhai,
  calibration: ReturnType<typeof deriveV07Calibration>,
): V07ProductFixtureScores {
  const chart = calculateNamPhai(V07_PRODUCT_FIXTURE);
  const domains = scoreV07ChartDomains(chart, knowledge, {
    activationScaleOverride: calibration.activationScale,
    domainScaleOverride: calibration.domainScales,
    domainCenterOverride: calibration.domainCenters,
    signedLayerFactorsOverride: calibration.signedLayerFactors,
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
  const countAbove50 = vals.filter((v) => v > 50).length;
  const countAtOrBelow45 = vals.filter((v) => v <= 45).length;
  const countAtOrAbove58 = vals.filter((v) => v >= 58).length;

  const productBlockers: string[] = [];
  if (l1FromV05 < 18) productBlockers.push(`l1FromV05 ${l1FromV05} < 18`);
  if (radarRange < 26) productBlockers.push(`radarRange ${radarRange} < 26`);
  if (minimum > 40) productBlockers.push(`minimum ${minimum} > 40`);
  if (maximum < 65) productBlockers.push(`maximum ${maximum} < 65`);
  if (countAtOrBelow45 < 2) productBlockers.push(`countAtOrBelow45 ${countAtOrBelow45} < 2`);
  if (countAtOrAbove58 < 2) productBlockers.push(`countAtOrAbove58 ${countAtOrAbove58} < 2`);
  if (countAbove50 >= 5) productBlockers.push(`countAbove50 ${countAbove50} >= 5`);

  return {
    ...scores,
    minimum,
    maximum,
    radarRange,
    countAbove50,
    countAtOrBelow45,
    countAtOrAbove58,
    l1FromV05,
    passesProductGates: productBlockers.length === 0,
    productBlockers,
  };
}

export function runV07CalibrationEvaluation(
  knowledge: AnnualAxesKnowledgeV07NamPhai,
): V07CalibrationReport {
  // Sanity: V0.5 product fixture baseline remains exact on V0.5 engine.
  const v05 = analyzeAnnualAxesNamPhaiV05(calculateNamPhai(V07_PRODUCT_FIXTURE));
  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const axis = v05.axes[domain];
    if (axis.status === "available" && axis.score !== V05_BASELINE[domain]) {
      throw new Error(
        `V0.5 product fixture drift on ${domain}: ${axis.score} vs ${V05_BASELINE[domain]}`,
      );
    }
  }

  const calibration = deriveV07Calibration(knowledge, FULL_CORPUS_CONTRACT, V07_SIGNED_LAYER_FACTORS);
  const holdoutSamples = scoreV07HoldoutSamples(knowledge, calibration);
  const holdout = evaluateV07HoldoutGates(holdoutSamples);
  const productFixture = evaluateProductFixture(knowledge, calibration);

  const approved = holdout.passedAllGates && productFixture.passesProductGates;
  const selectionRationale: string[] = [];
  if (approved) {
    selectionRationale.push(
      "V0.7 robust-centered annual score passed every hard holdout gate and the product fixture gate.",
    );
  } else {
    if (!holdout.passedAllGates) {
      selectionRationale.push(
        `Holdout gates failed (${holdout.blockers.length}): ${holdout.blockers.slice(0, 5).join("; ")}`,
      );
    }
    if (!productFixture.passesProductGates) {
      selectionRationale.push(
        `Product fixture gates failed: ${productFixture.productBlockers.join("; ")}`,
      );
    }
    selectionRationale.push("Do not enable V0.7 as Nam Phái production default.");
  }

  return {
    profileId: "annual-axes-v0.7-calibration",
    corpusId: FULL_CORPUS_CONTRACT.contractId,
    generatedAt: V07_CALIBRATION_GENERATED_AT,
    formulaVersion: V07_FORMULA_VERSION,
    engineVersion: V07_ENGINE_VERSION,
    calibration: {
      activationScale: calibration.activationScale,
      domainCenters: calibration.domainCenters,
      domainScales: calibration.domainScales,
      q75AbsStrictLatent: calibration.q75AbsStrictLatent,
      signedLayerFactors: calibration.signedLayerFactors,
      medianPositiveAnnualActivationRaw: calibration.medianPositiveAnnualActivationRaw,
      trainingDiagnostics: calibration.trainingDiagnostics,
    },
    holdoutMetrics: holdout.metrics,
    gateResults: holdout.gateResults,
    passedAllHoldoutGates: holdout.passedAllGates,
    holdoutBlockers: holdout.blockers,
    productFixture,
    selectionStatus: approved ? "approved" : "no-variant-approved",
    selectionRationale,
  };
}
