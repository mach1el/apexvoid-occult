import type { AnnualAxisDomainId } from "../schema";
import type { AnnualEvidenceLayerId, AnnualGeometryClass } from "../v0.4.3/schema";

export type { AnnualAxisDomainId, AnnualEvidenceLayerId, AnnualGeometryClass };

export type V08ScoreProfileId =
  | "DIRECT-STRICT-16"
  | "DIRECT-STRICT-18"
  | "DIRECT-STRICT-20";

export interface AnnualSignedGeometryPolicyV08 {
  direct: number;
  tp4c: number;
  opposite: number;
  contextOnly: number;
  adjacent: number;
}

export interface AnnualSignedLayerPolicyV08 {
  annualDirect: number;
  natalDirectWithAnnualTrigger: number;
  natalUntriggered: number;
  majorFortune: number;
  global: number;
}

export interface AnnualActivationPolicyV08 {
  directAnchorOnly: true;
  tp4cAllowed: false;
  oppositeAllowed: false;
  contextAllowed: false;
  targetMedianGate: number;
  modulation: "sqrt";
}

export interface AnnualScoreProfileCandidateV08 {
  id: V08ScoreProfileId;
  scoreStepPerRobustSigma: number;
}

export interface AnnualRobustCalibrationProfileV08 {
  madConsistencyFactor: number;
  iqrConsistencyFactor: number;
  minimumRobustScale: number;
  zClip: number;
}

export interface AnnualScoreBoundsV08 {
  neutral: number;
  minimum: number;
  maximum: number;
  precision: number;
}

export interface AnnualConfidenceProfileV08 {
  factsForFullCoverage: number;
  conflictPenalty: number;
}

/** Primary domain root palace names — highest-weight anchors from V0.4 defs. */
export interface AnnualDomainRootCatalogV08 {
  schemaVersion: string;
  catalogId: string;
  selectionPolicy: "highest-weight-primary-anchor";
  provenance: string;
  roots: Record<
    AnnualAxisDomainId,
    {
      palaceName: string;
      sourceWeight: number;
    }
  >;
  sourceIds: string[];
}

export interface AnnualSpatialBudgetV08 {
  schemaVersion: string;
  profileId: string;
  signedBudget: {
    direct: number;
    tp4c: number;
    globalAnnualClimate: number;
    majorFortuneBackground: number;
  };
  tp4cRelativeRoleWeights: { opposite: number; trine: number };
  weightTolerance: number;
  sourceIds: string[];
}

export interface AnnualEvidenceDedupePolicyV08 {
  schemaVersion: string;
  profileId: string;
  signedDedupeKey: string[];
  layerPrecedence: AnnualEvidenceLayerId[];
  geometryPrecedence: AnnualGeometryClass[];
  sourceIds: string[];
}

export interface AnnualBucketFormulaV08 {
  schemaVersion: string;
  profileId: string;
  evidenceScale: number;
  epsilon: number;
  signedGeometryPolicy: AnnualSignedGeometryPolicyV08;
  signedLayerPolicy: AnnualSignedLayerPolicyV08;
  activationPolicy: AnnualActivationPolicyV08;
  diminishingReturns: {
    function: "inverse-square-root-rank";
    groupBy: Array<"domain" | "geometryBucket" | "layer" | "stackingGroup">;
  };
  contextChannels: { mayContributeActivation: boolean };
  sourceIds: string[];
}

export interface AnnualScoreProfileV08 {
  schemaVersion: string;
  profileId: string;
  scoreProfiles: AnnualScoreProfileCandidateV08[];
  robustCalibration: AnnualRobustCalibrationProfileV08;
  scoreBounds: AnnualScoreBoundsV08;
  confidenceProfile: AnnualConfidenceProfileV08;
  sourceIds: string[];
}

export interface AnnualDistributionGatesV08 {
  schemaVersion: string;
  catalogId: string;
  hardGates: Record<string, number>;
  sourceIds: string[];
}

export interface AnnualAxisCalibrationV08 {
  schemaVersion: string;
  profileId: string;
  engineVersion: string;
  formulaVersion: string;
  trainingCorpusId: string;
  splitPolicy: {
    trainingFraction: number;
    holdoutFraction: number;
    splitBy: "stable-chart-id";
  };
  activationTargetMedianGate: number;
  domainCenters: Record<AnnualAxisDomainId, number>;
  robustScales: Record<AnnualAxisDomainId, number>;
  activationScales: Record<AnnualAxisDomainId, number>;
  madScales: Record<AnnualAxisDomainId, number>;
  iqrScales: Record<AnnualAxisDomainId, number>;
  medianPositiveAnnualActivationRaw: Record<AnnualAxisDomainId, number>;
  selectedVariant: V08ScoreProfileId | null;
  selectionStatus: "approved" | "no-variant-approved" | "pending";
  generatedAt: string;
  sourceIds: string[];
}

export interface AnnualAxesKnowledgeV08NamPhai {
  domainRoots: AnnualDomainRootCatalogV08;
  spatialBudget: AnnualSpatialBudgetV08;
  dedupePolicy: AnnualEvidenceDedupePolicyV08;
  bucketFormula: AnnualBucketFormulaV08;
  scoreProfile: AnnualScoreProfileV08;
  calibration: AnnualAxisCalibrationV08;
  distributionGates: AnnualDistributionGatesV08;
}

export type AnnualAxesDedupeAdapterV08 = Pick<
  AnnualAxesKnowledgeV08NamPhai,
  "dedupePolicy" | "bucketFormula"
> & {
  aggregationProfile: {
    diminishingReturns: AnnualBucketFormulaV08["diminishingReturns"];
    contextChannels: AnnualBucketFormulaV08["contextChannels"];
  };
};

export function toDedupeAdapter(knowledge: AnnualAxesKnowledgeV08NamPhai): AnnualAxesDedupeAdapterV08 {
  return {
    dedupePolicy: knowledge.dedupePolicy,
    bucketFormula: knowledge.bucketFormula,
    aggregationProfile: {
      diminishingReturns: knowledge.bucketFormula.diminishingReturns,
      contextChannels: knowledge.bucketFormula.contextChannels,
    },
  };
}
