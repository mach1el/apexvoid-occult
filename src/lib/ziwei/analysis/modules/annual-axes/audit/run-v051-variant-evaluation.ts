import type { AnnualAxesKnowledgeV05NamPhai } from "../../../knowledge/annual-axes/v0.5";
import {
  splitChartIndices,
  V05_CALIBRATION_GENERATED_AT,
} from "../../../knowledge/annual-axes/v0.5/derive-calibration";
import { FULL_CORPUS_CONTRACT } from "./build-audit-corpus";
import { deriveV051Calibration, rescoreSamplesWithCalibration } from "./v051-calibration";
import { evaluateV051Gates, selectV051Candidate } from "./v051-gates";
import { detectEvidenceBias } from "./run-v051-bias-audit";
import { verifyV05BaselineReproduction } from "./v051-baseline-reproduction";
import { collectV051Samples } from "./collect-v051-samples";
import { V051_CANDIDATES, type V051VariantEvaluationReport } from "./v051-types";

export function runV051VariantEvaluation(
  knowledge: AnnualAxesKnowledgeV05NamPhai,
): V051VariantEvaluationReport {
  const baselineReproduction = verifyV05BaselineReproduction(knowledge);
  const allSamples = collectV051Samples(knowledge);
  const trainingSamples = allSamples.filter((s) => s.split === "training");
  const holdoutSamplesAll = allSamples.filter((s) => s.split === "holdout");
  const biasFlags = detectEvidenceBias(trainingSamples, holdoutSamplesAll);
  const { holdout, training } = splitChartIndices(FULL_CORPUS_CONTRACT.chartCount);

  if (!baselineReproduction.reproduced) {
    return {
      profileId: "annual-axes-v0.5.1-variant-evaluation",
      auditIntegrityVersion: 2,
      corpusId: FULL_CORPUS_CONTRACT.contractId,
      generatedAt: V05_CALIBRATION_GENERATED_AT,
      baselineReproduction,
      evidenceBiasDetected: biasFlags.scaleOnlyTighteningBlocked,
      evidenceBiasBlockers: biasFlags.scaleOnlyTighteningBlocked
        ? ["Positive latent evidence bias detected on both training and holdout"]
        : [],
      candidates: [],
      selectedVariant: null,
      selectionStatus: "no-variant-approved",
      selectionRationale: ["baseline-reproduction-failed — candidate evaluation aborted"],
    };
  }

  const candidates = V051_CANDIDATES.map((spec) => {
    const calibration = deriveV051Calibration(spec, knowledge);
    const trainingRescored = rescoreSamplesWithCalibration(knowledge, calibration, training);
    const holdoutRescored = rescoreSamplesWithCalibration(knowledge, calibration, holdout);
    const trainingEval = evaluateV051Gates(trainingRescored, knowledge);
    const holdoutEval = evaluateV051Gates(holdoutRescored, knowledge);

    const blockers = [...holdoutEval.blockers];
    if (biasFlags.scaleOnlyTighteningBlocked && spec.id !== "BASELINE-V05") {
      blockers.push("evidence-bias: scale-only tightening blocked (training AND holdout)");
    }

    const passedAllGates =
      holdoutEval.gateResults.every((g) => g.passed) && blockers.length === 0;

    return {
      candidateId: spec.id,
      calibration,
      trainingMetrics: trainingEval.metrics,
      holdoutMetrics: holdoutEval.metrics,
      gateResults: holdoutEval.gateResults,
      passedAllGates,
      blockers,
    };
  });

  const selection = selectV051Candidate(
    candidates.map((c) => ({
      candidateId: c.candidateId,
      passedAllGates: c.passedAllGates,
      metrics: c.holdoutMetrics,
      gateResults: c.gateResults,
    })),
  );

  return {
    profileId: "annual-axes-v0.5.1-variant-evaluation",
    auditIntegrityVersion: 2,
    corpusId: FULL_CORPUS_CONTRACT.contractId,
    generatedAt: V05_CALIBRATION_GENERATED_AT,
    baselineReproduction,
    evidenceBiasDetected: biasFlags.scaleOnlyTighteningBlocked,
    evidenceBiasBlockers: biasFlags.scaleOnlyTighteningBlocked
      ? ["Positive latent evidence bias detected on both training and holdout"]
      : [],
    candidates,
    selectedVariant: selection.selectedVariant as V051VariantEvaluationReport["selectedVariant"],
    selectionStatus: selection.selectionStatus,
    selectionRationale: selection.rationale,
  };
}
