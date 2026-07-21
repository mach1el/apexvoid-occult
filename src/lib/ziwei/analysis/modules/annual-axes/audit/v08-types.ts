import type { V08ScoreProfileId } from "../../../knowledge/annual-axes/v0.8";

export interface V08GateResult {
  gate: string;
  passed: boolean;
  value: number;
  threshold: number;
  comparator: ">=" | "<=" | "==";
}

export interface V08ProductFixtureScores {
  health: number;
  family: number;
  wealth: number;
  career: number;
  social: number;
  romance: number;
  minimum: number;
  maximum: number;
  radarRange: number;
  countAbove50: number;
  countAtOrBelow45: number;
  countAtOrAbove58: number;
  l1FromV05: number;
  l1FromV07: number;
  passesProductGates: boolean;
  productBlockers: string[];
}

export interface V08CandidateResult {
  candidateId: V08ScoreProfileId;
  scoreStepPerRobustSigma: number;
  holdoutMetrics: Record<string, number>;
  gateResults: V08GateResult[];
  passedAllGates: boolean;
  blockers: string[];
  productFixture: V08ProductFixtureScores;
}

export interface V08CandidateEvaluationReport {
  profileId: string;
  corpusId: string;
  generatedAt: string;
  formulaVersion: string;
  engineVersion: string;
  calibration: {
    domainCenters: Record<string, number>;
    robustScales: Record<string, number>;
    activationScales: Record<string, number>;
  };
  candidates: V08CandidateResult[];
  selectedVariant: V08ScoreProfileId | null;
  selectionStatus: "approved" | "no-variant-approved";
  selectionRationale: string[];
}
