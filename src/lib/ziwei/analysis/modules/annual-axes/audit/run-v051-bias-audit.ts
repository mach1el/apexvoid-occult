import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { ANNUAL_AXIS_DOMAINS } from "../../../contracts/annual-axes";
import type { AnnualAxesKnowledgeV05NamPhai } from "../../../knowledge/annual-axes/v0.5";
import {
  splitChartIndices,
  V05_CALIBRATION_GENERATED_AT,
} from "../../../knowledge/annual-axes/v0.5/derive-calibration";
import {
  FULL_CORPUS_CONTRACT,
  buildAuditBirthInputs,
  expandAnnualYears,
} from "./build-audit-corpus";
import {
  aggregateEvidenceDimensions,
  assertSingleMembershipCounts,
  collectV051Samples,
  samplesToVectors,
} from "./collect-v051-samples";
import { verifyV05BaselineReproduction } from "./v051-baseline-reproduction";
import {
  buildSignedEvidenceFunnelForChart,
  mergeSignedEvidenceFunnels,
  type SignedEvidenceFunnel,
} from "./v051-signed-funnel";
import type {
  PressureRetentionDiagnosis,
  RootCauseLabel,
  V051BiasAuditReport,
  V051EvidenceBiasFlags,
  V051SplitLatentMetrics,
} from "./v051-types";
import {
  mean,
  median,
  percentile,
  rate,
  scoreDistribution,
  vectorDistribution,
} from "./v051-stats";

function latentMetrics(samples: ReturnType<typeof collectV051Samples>): V051SplitLatentMetrics {
  const latents = samples.map((s) => s.latent);
  return {
    positiveLatentRate: rate(latents.filter((v) => v > 0).length, latents.length),
    medianLatent: median(latents),
    negativeLatentRate: rate(latents.filter((v) => v < 0).length, latents.length),
  };
}

export function detectEvidenceBias(
  trainingSamples: ReturnType<typeof collectV051Samples>,
  holdoutSamples: ReturnType<typeof collectV051Samples>,
): V051EvidenceBiasFlags {
  const training = latentMetrics(trainingSamples);
  const holdout = latentMetrics(holdoutSamples);

  const globalPositiveLatentBias =
    training.positiveLatentRate > 0.65 &&
    training.medianLatent > 0 &&
    holdout.positiveLatentRate > 0.65 &&
    holdout.medianLatent > 0;

  const perDomain = {} as V051EvidenceBiasFlags["perDomain"];
  const perDomainPositiveLatentBiasDomains: (typeof ANNUAL_AXIS_DOMAINS)[number][] = [];

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const train = latentMetrics(trainingSamples.filter((s) => s.domain === domain));
    const hold = latentMetrics(holdoutSamples.filter((s) => s.domain === domain));
    const biasedOnBothSplits =
      train.positiveLatentRate > 0.7 &&
      train.medianLatent > 0 &&
      hold.positiveLatentRate > 0.7 &&
      hold.medianLatent > 0;
    perDomain[domain] = { training: train, holdout: hold, biasedOnBothSplits };
    if (biasedOnBothSplits) perDomainPositiveLatentBiasDomains.push(domain);
  }

  return {
    globalPositiveLatentBias,
    perDomainPositiveLatentBiasDomains,
    scaleOnlyTighteningBlocked:
      globalPositiveLatentBias || perDomainPositiveLatentBiasDomains.length >= 4,
    training,
    holdout,
    perDomain,
  };
}

function pressureRetentionDiagnosis(gap: number): PressureRetentionDiagnosis {
  if (gap < -0.1) return "pressure-mechanically-disadvantaged";
  if (gap > 0.1) return "pressure-mechanically-advantaged";
  return "no-material-mechanical-retention-gap";
}

function resolveRootCause(input: {
  latentPositivelyBiased: boolean;
  pressureDiagnosis: PressureRetentionDiagnosis;
  supportLargerThanPressure: boolean;
  supportPressureRatio: number;
}): { label: RootCauseLabel; confidence: "high" | "medium" | "low"; notes: string[] } {
  const notes: string[] = [];
  if (input.pressureDiagnosis === "pressure-mechanically-disadvantaged") {
    notes.push("Pressure final retention rate trails support by more than 10 percentage points.");
    return {
      label: "mechanical-imbalance-suspected",
      confidence: "medium",
      notes,
    };
  }
  if (
    input.latentPositivelyBiased &&
    input.pressureDiagnosis === "no-material-mechanical-retention-gap" &&
    input.supportLargerThanPressure &&
    input.supportPressureRatio > 1.15
  ) {
    notes.push(
      "Positive latent bias confirmed on both training and holdout with no material pressure retention disadvantage.",
    );
    notes.push(
      "Retained evidence still shows material support/pressure mass imbalance — consistent with doctrinal knowledge imbalance.",
    );
    return {
      label: "doctrinal-evidence-imbalance",
      confidence: "medium",
      notes,
    };
  }
  notes.push("Bias and funnel evidence do not uniquely identify a single root-cause class.");
  return { label: "root-cause-unresolved", confidence: "low", notes };
}

function collectCorpusFunnel(knowledge: AnnualAxesKnowledgeV05NamPhai): SignedEvidenceFunnel {
  const bases = buildAuditBirthInputs(FULL_CORPUS_CONTRACT);
  const funnels: SignedEvidenceFunnel[] = [];
  for (let chartIndex = 0; chartIndex < FULL_CORPUS_CONTRACT.chartCount; chartIndex++) {
    const base = bases[chartIndex];
    if (!base) continue;
    for (const yearly of expandAnnualYears(
      base,
      FULL_CORPUS_CONTRACT.baseAnnualYear,
      FULL_CORPUS_CONTRACT.yearsPerChart,
    )) {
      const chart = calculateNamPhai(yearly);
      const funnel = buildSignedEvidenceFunnelForChart(chart, knowledge);
      if (funnel) funnels.push(funnel);
    }
  }
  return mergeSignedEvidenceFunnels(funnels);
}

export function runV051BiasAudit(
  knowledge: AnnualAxesKnowledgeV05NamPhai,
): V051BiasAuditReport {
  const baselineReproduction = verifyV05BaselineReproduction(knowledge);
  const { training, holdout } = splitChartIndices(FULL_CORPUS_CONTRACT.chartCount);
  const allSamples = collectV051Samples(knowledge);
  const trainingSamples = allSamples.filter((s) => s.split === "training");
  const holdoutSamples = allSamples.filter((s) => s.split === "holdout");
  const evidenceDims = aggregateEvidenceDimensions(knowledge, [...training, ...holdout]);
  const dimensionCountIntegrity = assertSingleMembershipCounts(evidenceDims);
  const signedEvidenceFunnel = collectCorpusFunnel(knowledge);

  const scores = allSamples.map((s) => s.score);
  const spatialSigned = allSamples.map((s) => s.spatialSigned);
  const latents = allSamples.map((s) => s.latent);
  const vectors = samplesToVectors(allSamples);

  const globalScore = scoreDistribution(scores);
  const globalVector = vectorDistribution(vectors);
  const sortedLatents = [...latents].sort((a, b) => a - b);
  const absLatents = latents.map(Math.abs).sort((a, b) => a - b);
  const posLatent = latents.filter((v) => v > 0);
  const negLatent = latents.filter((v) => v < 0);
  const posAbs = posLatent.reduce((s, v) => s + Math.abs(v), 0);
  const negAbs = negLatent.reduce((s, v) => s + Math.abs(v), 0);

  const gates = allSamples.map((s) => s.activationGate);
  const sortedGates = [...gates].sort((a, b) => a - b);

  const totalSupport = evidenceDims.totalSupportRaw;
  const totalPressure = evidenceDims.totalPressureRaw;

  const biasFlags = detectEvidenceBias(trainingSamples, holdoutSamples);

  const perDomain = {} as V051BiasAuditReport["perDomain"];
  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const ds = allSamples.filter((s) => s.domain === domain);
    const dl = ds.map((s) => s.latent);
    const domainSupport = ds.reduce((s, x) => s + x.directSupportRaw + x.tp4cSupportRaw, 0);
    const domainPressure = ds.reduce((s, x) => s + x.directPressureRaw + x.tp4cPressureRaw, 0);
    perDomain[domain] = {
      score: scoreDistribution(ds.map((s) => s.score)),
      signed: {
        latentMean: mean(dl),
        latentMedian: median(dl),
        positiveLatentRate: rate(dl.filter((v) => v > 0).length, dl.length),
        negativeLatentRate: rate(dl.filter((v) => v < 0).length, dl.length),
      },
      evidence: {
        directSupportRawMass: ds.reduce((s, x) => s + x.directSupportRaw, 0),
        directPressureRawMass: ds.reduce((s, x) => s + x.directPressureRaw, 0),
        tp4cSupportRawMass: ds.reduce((s, x) => s + x.tp4cSupportRaw, 0),
        tp4cPressureRawMass: ds.reduce((s, x) => s + x.tp4cPressureRaw, 0),
        supportPressureRawMassRatio:
          domainPressure > 0 ? domainSupport / domainPressure : domainSupport > 0 ? Infinity : 1,
      },
    };
  }

  const spatialSignedMedian = median(spatialSigned);
  const latentPositivelyBiased = biasFlags.scaleOnlyTighteningBlocked;
  const supportLargerThanPressure = totalSupport > totalPressure;
  const pressureTp4cShare =
    totalPressure > 0 ? evidenceDims.tp4cPressureRaw / totalPressure : 0;
  const supportTp4cShare =
    totalSupport > 0 ? evidenceDims.tp4cSupportRaw / totalSupport : 0;
  const gap = signedEvidenceFunnel.retentionRates.pressureRelativeRetentionGap;
  const pressureDiagnosis = pressureRetentionDiagnosis(gap);
  const root = resolveRootCause({
    latentPositivelyBiased,
    pressureDiagnosis,
    supportLargerThanPressure,
    supportPressureRatio: totalPressure > 0 ? totalSupport / totalPressure : Infinity,
  });

  return {
    profileId: "annual-axes-v0.5.1-baseline-bias-audit",
    auditIntegrityVersion: 2,
    corpusId: FULL_CORPUS_CONTRACT.contractId,
    engineVersion: "0.5.0",
    generatedAt: V05_CALIBRATION_GENERATED_AT,
    baselineReproduction,
    baselineReproduced: baselineReproduction.reproduced,
    baselineMismatchDetails: baselineReproduction.mismatches.map(
      (m) => `${m.path}: committed=${m.committed} reproduced=${m.reproduced}`,
    ),
    global: {
      score: globalScore,
      vector: globalVector,
      signed: {
        spatialSignedMean: mean(spatialSigned),
        spatialSignedMedian,
        latentMean: mean(latents),
        latentMedian: percentile(sortedLatents, 0.5),
        positiveLatentRate: rate(posLatent.length, latents.length),
        negativeLatentRate: rate(negLatent.length, latents.length),
        zeroLatentRate: rate(latents.filter((v) => v === 0).length, latents.length),
        medianAbsLatent: percentile(absLatents, 0.5),
        q75AbsLatent: percentile(absLatents, 0.75),
        positiveNegativeAbsoluteMassRatio: negAbs > 0 ? posAbs / negAbs : posAbs > 0 ? Infinity : 1,
      },
      activation: {
        annualActivationRawMean: mean(allSamples.map((s) => s.annualActivationRaw)),
        annualActivationRawMedian: median(allSamples.map((s) => s.annualActivationRaw)),
        activationGateMean: mean(gates),
        activationGateMedian: percentile(sortedGates, 0.5),
        activationGateP10: percentile(sortedGates, 0.1),
        activationGateP90: percentile(sortedGates, 0.9),
        activationGateMaximum: sortedGates[sortedGates.length - 1] ?? 0,
        gateBelow040Rate: rate(gates.filter((g) => g < 0.4).length, gates.length),
        gateAbove085Rate: rate(gates.filter((g) => g > 0.85).length, gates.length),
      },
      evidence: {
        directSupportRawMass: evidenceDims.directSupportRaw,
        directPressureRawMass: evidenceDims.directPressureRaw,
        tp4cSupportRawMass: evidenceDims.tp4cSupportRaw,
        tp4cPressureRawMass: evidenceDims.tp4cPressureRaw,
        supportPressureRawMassRatio: totalPressure > 0 ? totalSupport / totalPressure : Infinity,
        retainedSignedFactCount: evidenceDims.retainedSignedCount,
        retainedActivationFactCount: evidenceDims.retainedActivationCount,
        sourceMembershipCount: evidenceDims.sourceMembershipCount,
        meanSourceIdsPerRetainedFact: evidenceDims.meanSourceIdsPerRetainedFact,
      },
    },
    perDomain,
    evidenceByDimension: {
      byLayer: evidenceDims.byLayer,
      byCategory: evidenceDims.byCategory,
      byGeometryBucket: evidenceDims.byGeometryBucket,
      bySourceId: evidenceDims.bySourceId,
      byRuleId: evidenceDims.byRuleId,
      byStackingGroup: evidenceDims.byStackingGroup,
      byOwnershipRole: evidenceDims.byOwnershipRole,
    },
    dimensionCountIntegrity,
    signedEvidenceFunnel,
    evidenceBiasFlags: biasFlags,
    diagnosis: {
      softnessInSpatialSigned: Math.abs(spatialSignedMedian) < 0.05,
      latentPositivelyBiased,
      supportLargerThanPressure,
      pressureDisproportionatelyTp4c: pressureTp4cShare > supportTp4cShare + 0.15,
      pressureRetentionDiagnosis: pressureDiagnosis,
      pressureRelativeRetentionGap: gap,
      activationTooWeak: percentile(sortedGates, 0.5) < 0.55,
      calibrationWouldAmplifyPositiveBias: latentPositivelyBiased && globalScore.median > 50,
      rootCauseLabel: root.label,
      rootCauseConfidence: root.confidence,
      rootCauseNotes: root.notes,
    },
  };
}

export { verifyV05BaselineReproduction } from "./v051-baseline-reproduction";
