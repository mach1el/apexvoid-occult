export type MajorFortunePolicyTopic = 
  | "direction"
  | "yin_yang_and_gender_interaction"
  | "starting_palace"
  | "starting_age"
  | "nominal_versus_actual_age"
  | "age_boundary"
  | "calendar_year_boundary"
  | "birthday_boundary"
  | "solar_term_boundary"
  | "twelve_palace_traversal"
  | "first_cycle"
  | "partial_first_cycle"
  | "major_fortune_heavenly_stem"
  | "major_fortune_transformations"
  | "natal_transformation_inheritance"
  | "tuan_triet_treatment"
  | "phi_hoa_availability"
  | "tu_hoa_availability"
  | "annual_interaction"
  | "monthly_interaction";

export interface MajorFortunePolicyProfile {
  profileId: string;
  policies: Record<MajorFortunePolicyTopic, string>;
}

export interface TargetByAge {
  type: "age";
  targetAge: number; // nominal or actual based on policy
}

export interface TargetByDate {
  type: "date";
  targetDateIso: string;
  calendar: "lunar" | "solar";
  timezone: string;
}

export type MajorFortuneTarget = TargetByAge | TargetByDate;

export interface MajorFortuneInput {
  /** Reference to the normalized base chart */
  chartRef: string;

  /** Normalized birth data */
  birthData: {
    gender: "male" | "female";
    birthYearBranch: string;
    birthYearStem: string;
    cucNumber: number;
    menhPalaceIndex: number;
    birthDateIso?: string;
    timezone?: string;
  };

  /** Unambiguous target evaluation point */
  target: MajorFortuneTarget;

  /** The school-specific policy profile */
  policyProfile: MajorFortunePolicyProfile;

  /** Strict feature toggles for analysis context */
  enabledFeatures: {
    tuanTrietDecay: boolean;
    phiHoa: boolean;
  };
}
