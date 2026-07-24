export type MonthlyFlowBand = 
  | "breakthrough"
  | "favorable"
  | "stable"
  | "obstructed"
  | "alert";

export type MonthlyFlowResolutionStatus = "resolved" | "partial" | "unavailable";

export type MonthlyFlowV02ReasonCode =
  | "annual-baseline-unavailable"
  | "annual-baseline-invalid"
  | "canonical-context-unavailable"
  | "focus-palace-unavailable"
  | "palace-main-star-policy-partial"
  | "palace-element-policy-partial"
  | "palace-element-policy-unavailable"
  | "monthly-transformations-partial"
  | "monthly-transformation-target-unresolved"
  | "monthly-transformation-target-ambiguous"
  | "ji-collision-policy-pending"
  | "annual-head-unavailable"
  | "invalid-provenance";

export type MonthlyJiCollisionCandidate =
  | {
      kind: "same-star-natal-monthly";
      targetStar: string;
      targetPalaceIndex: number;
    }
  | {
      kind: "same-star-annual-monthly";
      targetStar: string;
      targetPalaceIndex: number;
    }
  | {
      kind: "same-palace-natal-monthly";
      monthlyTargetStar: string;
      existingTargetStar: string;
      targetPalaceIndex: number;
    }
  | {
      kind: "same-palace-annual-monthly";
      monthlyTargetStar: string;
      existingTargetStar: string;
      targetPalaceIndex: number;
    };

export interface MonthlyTransformationContribution {
  mutagen: string;
  starName: string;
  role: "direct-focus" | "opposite" | "trine" | "outside";
  baseMutagenDelta: number;
  roleWeight: number;
  contribution: number;
}

export interface DauQuanAmplification {
  isDauQuanMonth: boolean;
  multiplier: 1 | 1.5;
  before: number;
  after: number;
}

export interface MonthlyScoreBreakdown {
  annualBaseline: number;

  palace: {
    raw: number;
    capped: number;
    dauQuanMultiplier: 1 | 1.5;
    amplified: number;
  };

  transformations: {
    contributions: MonthlyTransformationContribution[];
    dominantContributionId: string | null;
    dominantDelta: number;
    secondaryRawSum: number;
    secondaryAppliedDelta: number;
    authorizedAppliedDelta: number;
    collisionCandidates: MonthlyJiCollisionCandidate[];
    collisionPolicyApplied: false;
    finalDelta: number;
  };

  localActivation: number;

  annualEnvelope: {
    radius: number;
    floor: number;
    ceiling: number;
  };

  rawMonthlyScore: number;
  finalMonthlyScore: number;

  clippedByAnnualFloor: boolean;
  clippedByAnnualCeiling: boolean;
}

export interface MonthlyDomainProjection {
  domain: "family" | "wealth" | "career" | "social" | "romance";
  overallMonthlyScore: number;
  domainSpecificDelta: number;
  domainProjectionScore: number;
}

export interface MonthlyFlowV02MonthDiagnostics {
  unresolvedTransformationTargets: string[];
  ambiguousTransformationTargets: string[];
}

export interface MonthlyFlowV02MonthResult {
  status: MonthlyFlowResolutionStatus;
  reasonCodes: MonthlyFlowV02ReasonCode[];
  diagnostics: MonthlyFlowV02MonthDiagnostics;

  monthIndex: number; // Month index (1-12)
  lunarMonth: number;
  isLeapMonth: boolean;
  calendarStem: string;
  calendarBranch: string;
  focusPalaceIndex: number;
  
  provenance: {
    annualHeadPalace: number | null;
    smallLimitPalace: number | null;
    taiTuePalace: number | null;
  };

  overallMonthlyScore: number;
  overallBand: MonthlyFlowBand;
  breakdown: MonthlyScoreBreakdown;
  domainProjections: MonthlyDomainProjection[];
}

export interface MonthlyFlowV02Result {
  status: MonthlyFlowResolutionStatus;
  reasonCodes: MonthlyFlowV02ReasonCode[];
  annualScoreSource?: AnnualBaselineInput;
  annualYear: number;
  annualStem: string;
  annualBranch: string;
  months: MonthlyFlowV02MonthResult[];
}

export interface AnnualBaselineInput {
  score: number; // 0..100
  sourceModule: string;
  sourceContractVersion: string;
  sourceEngineVersion: string;
}

export interface AnnualBaselineValidationResult {
  status: "resolved" | "unavailable";
  reasonCodes: MonthlyFlowV02ReasonCode[];
}

export interface MonthlyAnnualContext {
  annualHeadPalaceIndex: number | null;
  smallLimitPalaceIndex: number | null;
  taiTuePalaceIndex: number | null;

  annualHeadStatus: "resolved" | "unavailable";
  smallLimitStatus: "resolved" | "unavailable";
  taiTueStatus: "resolved" | "unavailable";
}

export interface MonthlyFocusPalaceFacts {
  focusPalaceIndex: number;
  lunarMonth: number;
  isLeapMonth: boolean;
  calendarStem: string;
  calendarBranch: string;
}

export interface MonthlyTransformationContext {
  contributions: MonthlyTransformationContribution[];
  resolutionStatus: MonthlyFlowResolutionStatus;
  unresolvedTargets: string[];
  ambiguousTargets: string[];
  collisionCandidates: MonthlyJiCollisionCandidate[];
  collisionPolicyStatus: "not-applicable" | "pending-expert-review" | "resolved";
  finalAppliedDelta: number;
}

export interface MonthlyFlowV021Input {
  annualBaseline: AnnualBaselineInput;
  focusPalaceFacts: MonthlyFocusPalaceFacts;
  annualContext: MonthlyAnnualContext;
  transformationContext: MonthlyTransformationContext;
  isDauQuanMonth: boolean;
  palaceRawDelta: number;
}

export interface PalaceComponentResult {
  status: MonthlyFlowResolutionStatus;
  delta: number | null;
  evidence: string[];
  reasonCodes: MonthlyFlowV02ReasonCode[];
}

export interface EvaluatedPalace {
  components: {
    mainStarQuality: PalaceComponentResult;
    majorSupport: PalaceComponentResult;
    secondarySupport: PalaceComponentResult;
    majorPressure: PalaceComponentResult;
    voidMarker: PalaceComponentResult;
    elementRelation: PalaceComponentResult;
  };
  rawDelta: number;
  status: MonthlyFlowResolutionStatus;
  reasonCodes: MonthlyFlowV02ReasonCode[];
}

export interface PalaceElementResolution {
  status: "resolved" | "unavailable";
  element: "Kim" | "Mộc" | "Thủy" | "Hỏa" | "Thổ" | null;
  method: "nayin-palace-stem-branch";
  sourceId: string | null;
}
