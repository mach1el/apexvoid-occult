export interface V07GateResult {
  gate: string;
  passed: boolean;
  value: number;
  threshold: number;
  comparator: ">=" | "<=";
}

export interface V07ProductFixtureScores {
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
  passesProductGates: boolean;
  productBlockers: string[];
}

export interface V07CalibrationReport {
  profileId: string;
  corpusId: string;
  generatedAt: string;
  formulaVersion: string;
  engineVersion: string;
  calibration: {
    activationScale: number;
    domainCenters: Record<string, number>;
    domainScales: Record<string, number>;
    q75AbsStrictLatent: Record<string, number>;
    signedLayerFactors: {
      annual: number;
      natalActivated: number;
      majorFortune: number;
      global: number;
    };
    medianPositiveAnnualActivationRaw: number;
    trainingDiagnostics: {
      medianActivationGate: number;
      p90ActivationGate: number;
      maxActivationGate: number;
    };
  };
  holdoutMetrics: Record<string, number>;
  gateResults: V07GateResult[];
  passedAllHoldoutGates: boolean;
  holdoutBlockers: string[];
  productFixture: V07ProductFixtureScores;
  selectionStatus: "approved" | "no-variant-approved";
  selectionRationale: string[];
}
