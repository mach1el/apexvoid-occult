export interface MajorFortunePolicyProfile {
  profileId: string;
  policies: Record<string, string>;
}

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
  };

  /** The specific target age or date to calculate Major Fortune for */
  targetAge?: number;
  targetDate?: string;

  /** The school-specific policy profile */
  policyProfile: MajorFortunePolicyProfile;

  /** Feature toggles */
  enabledFeatures: {
    fortuneTransformations: boolean;
    phiHoa: boolean;
    tuHoa: boolean;
  };
}
