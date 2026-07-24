export type MonthlyFlowBand = 
  | "breakthrough"
  | "favorable"
  | "stable"
  | "obstructed"
  | "alert";

export type MonthlyJiCollisionKind =
  | "same-star-natal-monthly"
  | "same-star-annual-monthly"
  | "same-palace-natal-monthly"
  | "same-palace-annual-monthly"
  | "same-frame-only";

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
    collisionKind: MonthlyJiCollisionKind | null;
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
  clippedByAbsoluteRange: boolean;
}

export interface MonthlyDomainProjection {
  domain: "family" | "wealth" | "career" | "social" | "romance";
  overallMonthlyScore: number;
  domainSpecificDelta: number;
  domainProjectionScore: number;
}

export interface MonthlyFlowV02MonthResult {
  monthIndex: number; // Month index (1-12)
  lunarMonth: number;
  isLeapMonth: boolean;
  calendarStem: string;
  calendarBranch: string;
  focusPalaceIndex: number;
  
  provenance: {
    annualHeadPalace: number;
    smallLimitPalace: number | null;
    taiTuePalace: number | null;
  };

  overallMonthlyScore: number;
  overallBand: MonthlyFlowBand;
  breakdown: MonthlyScoreBreakdown;
  domainProjections: MonthlyDomainProjection[];
}

export interface MonthlyFlowV02Result {
  status: "resolved" | "unavailable" | "partial";
  reason?: string;
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

export interface MonthlyAnnualContext {
  annualHeadPalace: number;
  smallLimitPalace: number | null;
  taiTuePalace: number | null;
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
  collisionKind: MonthlyJiCollisionKind | null;
  isPartial: boolean;
}

export interface MonthlyFlowV021Input {
  annualBaseline: AnnualBaselineInput;
  focusPalaceFacts: MonthlyFocusPalaceFacts;
  annualContext: MonthlyAnnualContext;
  transformationContext: MonthlyTransformationContext;
  isDauQuanMonth: boolean;
  palaceRawDelta: number;
}
