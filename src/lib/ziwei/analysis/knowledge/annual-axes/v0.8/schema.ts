import type { AnnualAxisDomainId } from "../schema";

export type { AnnualAxisDomainId };

export type StarTemporalLayer =
  | "natal"
  | "annual"
  | "decadal"
  | "monthly"
  | "daily"
  | "unknown";

export type V08PointClass =
  | "annualTransformStrongPositive"
  | "annualTransformPositive"
  | "annualTransformNegative"
  | "otherAnnualPositive"
  | "otherAnnualNegative"
  | "staticPositive"
  | "staticNegative"
  | "dignifiedStaticPositive";

export type V08PalaceInputType = "annual-palace" | "small-limit-palace";

export interface V08DomainPalaceInput {
  type: V08PalaceInputType;
  palace?: string;
  weight: number;
  role?: string;
}

export interface V08DomainMappingEntry {
  primary: V08DomainPalaceInput;
  cooperating: V08DomainPalaceInput[];
}

export interface AnnualDomainMappingV08 {
  schemaVersion: string;
  catalogId: string;
  formulaVersion: "v0.8-annual-palace-weighted-score";
  domains: Record<AnnualAxisDomainId, V08DomainMappingEntry>;
  sourceIds: string[];
}

export interface AnnualPointClassesV08 {
  schemaVersion: string;
  profileId: string;
  classes: Record<V08PointClass, number>;
  palaceRawClamp: { minimum: number; maximum: number };
  axisRawClamp: { minimum: number; maximum: number };
  thaiTueMultiplier: number;
  thaiTueNeutralMultiplier: number;
  score: {
    neutral: number;
    pointsPerRawUnit: number;
    minimum: number;
    maximum: number;
    precision: number;
  };
  sourceIds: string[];
}

export type V08RuleProvenanceStatus =
  | "classical"
  | "derived"
  | "engineering-hypothesis";

export interface V08RuleProvenance {
  sourceIds: string[];
  locator?: string;
  schoolScope?: string;
  status: V08RuleProvenanceStatus;
  confidence?: "low" | "medium" | "high";
  rationale?: string;
}

export interface V08StarRule {
  starName: string;
  pointClass: V08PointClass;
  ruleId: string;
  polarity: "positive" | "negative";
  allowedTemporalLayers: StarTemporalLayer[];
  allowedSources?: string[];
  isTuHoa?: boolean;
  requiresDignity?: string[];
  familyId?: string;
  provenance?: V08RuleProvenance;
}

export interface AnnualStarRegistryV08 {
  schemaVersion: string;
  catalogId: string;
  axes: Record<
    AnnualAxisDomainId,
    {
      positive: V08StarRule[];
      negative: V08StarRule[];
    }
  >;
  sourceIds: string[];
}

export interface V08StarAliasEntry {
  alias: string;
  canonical: string;
}

export interface AnnualStarAliasesV08 {
  schemaVersion: string;
  catalogId: string;
  /** Spelling / naming variants of the same exact star only. */
  aliases: V08StarAliasEntry[];
  /** Optional families — never interchangeable during exact rule matching. */
  families: Record<string, string[]>;
  sourceIds: string[];
}

export interface AnnualScoreBandV08 {
  minInclusive: number;
  maxExclusive?: number;
  maxInclusive?: number;
  id: string;
  labelVi: string;
}

export interface AnnualScoreBandsV08 {
  schemaVersion: string;
  profileId: string;
  bands: AnnualScoreBandV08[];
  sourceIds: string[];
}

export interface AnnualDistributionGatesV08 {
  schemaVersion: string;
  catalogId: string;
  hardGates: Record<string, number>;
  sourceIds: string[];
}

export interface AnnualSourceRegistryV08 {
  schemaVersion: string;
  registryId: string;
  status: string;
  sources: Array<{
    sourceId: string;
    title: string;
    sourceType: string;
    location?: string;
    allowedUsage: string[];
    prohibitedUsage: string[];
  }>;
  claims: Array<{
    claimId: string;
    sourceId: string;
    summary: string;
    confidence: string;
    status: V08RuleProvenanceStatus;
  }>;
}

export type AnnualStarSupportStatus =
  | "supported"
  | "unsupported"
  | "research-only";

export interface AnnualStarCapabilityV08 {
  exactStarName: string;
  temporalLayer: "annual";
  supportStatus: AnnualStarSupportStatus;
  producer?: string;
  rationale: string;
  sourceIds: string[];
}

export interface AnnualStarCapabilitiesV08 {
  schemaVersion: string;
  catalogId: string;
  capabilities: AnnualStarCapabilityV08[];
  sourceIds: string[];
}

export interface AnnualAxesKnowledgeV08NamPhai {
  domainMapping: AnnualDomainMappingV08;
  pointClasses: AnnualPointClassesV08;
  starRegistry: AnnualStarRegistryV08;
  starAliases: AnnualStarAliasesV08;
  scoreBands: AnnualScoreBandsV08;
  distributionGates: AnnualDistributionGatesV08;
  sourceRegistry: AnnualSourceRegistryV08;
  starCapabilities: AnnualStarCapabilitiesV08;
  knowledgeVersion: string;
}

export const V08_FORMULA_VERSION = "v0.8-annual-palace-weighted-score" as const;
export const V08_KNOWLEDGE_VERSION = "0.8.0" as const;
export const V08_CANONICAL_PALACES = [
  "Mệnh",
  "Phụ Mẫu",
  "Phúc Đức",
  "Điền Trạch",
  "Quan Lộc",
  "Nô Bộc",
  "Thiên Di",
  "Tật Ách",
  "Tài Bạch",
  "Tử Tức",
  "Phu Thê",
  "Huynh Đệ",
] as const;
