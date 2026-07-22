import type { ZiweiSchool } from "../../facts";
import type { AnnualAxisDomain } from "../../contracts/annual-axes";

export interface AnnualAxisRawAxes {
  support: number;
  pressure: number;
  stability: number;
  activation: number;
}

export type AnnualAxisBand = "guarded" | "balanced" | "supportive" | "strong";

export type AnnualAxisEvidenceLayer = "annual" | "major-fortune" | "natal-activated";

export type AnnualAxisEvidenceCategory =
  | "star"
  | "mutagen"
  | "focal-marker"
  | "annual-focus"
  | "interaction";

export type AnnualAxisFrameRole = "focus" | "opposite" | "trine";

export interface AnnualAxisEvidence {
  id: string;
  domain: AnnualAxisDomain;
  layer: AnnualAxisEvidenceLayer;
  category: AnnualAxisEvidenceCategory;
  /** Layer-independent identity of the underlying physical fact (star/mutagen/marker). */
  physicalFactId: string;
  ruleId: string;
  targetPalaceIndex: number;
  targetPalaceName: string;
  /** The target palace's own resolved annual label — distinct from
   * `anchorPalaceName` (the anchor's label), since opposite/trine nodes
   * carry a different annual label than their anchor. Null only if the
   * physical palace genuinely has no annual label. */
  targetAnnualPalaceName: string | null;
  frameRole: AnnualAxisFrameRole;
  /** Annual label of the anchor palace whose frame collected this evidence. */
  anchorPalaceName: string;
  /** Diminishing-return competition group within the same domain+layer
   * (e.g. a minor-star family id, "major-star", "annual-mutagen",
   * "focal-marker"). Set at collection time since only the collector knows
   * the underlying knowledge grouping. */
  stackingGroup: string;
  rawAxes: AnnualAxisRawAxes;
  effectiveWeight: number;
  weightedAxes: AnnualAxisRawAxes;
  factIds: string[];
  sourceIds: string[];
  knowledgeStatus: "experimental" | "approved";
}

/** V0.8 explicit Lưu Niên palace-weighted score. */
export interface AnnualAxisMatchedStarFactV08 {
  starName: string;
  exactMatchedStarName?: string;
  canonicalStarName: string;
  temporalLayer?: StarTemporalLayer;
  ruleId: string;
  polarity: "positive" | "negative";
  points: number;
  palaceIndex: number;
  annualPalaceName: string;
  palaceRole?: "primary" | "cooperating" | "small-limit";
  palaceWeight?: number;
  weightedContribution?: number;
  thaiTueProminenceApplied?: boolean;
  sourceId: string;
}

export interface AnnualAxisPalaceContributionTraceV08 {
  role: string;
  palaceName: string;
  palaceIndex: number | null;
  configuredWeight: number;
  positivePoints: number;
  negativePoints: number;
  palaceRaw: number;
  matchedFacts: AnnualAxisMatchedStarFactV08[];
  missingReason?: string;
  rolesSharingPalace?: string[];
}

export interface AnnualAxisScoreTraceV08 {
  formulaVersion: "v0.8-annual-palace-weighted-score";
  primary: AnnualAxisPalaceContributionTraceV08;
  cooperating: AnnualAxisPalaceContributionTraceV08[];
  axisRawBeforeThaiTue: number;
  isThaiTueHighlighted: boolean;
  thaiTueMultiplier: number;
  prominenceAdjustedRaw: number;
  rawScore: number;
  absoluteScore: number | null;
  scoreState: "scored" | "no-signal" | "balanced-signal" | "partial-data" | "unavailable";
  availability?: "available" | "partial-data" | "unavailable";
  coverage?: {
    resolvedWeight: number;
    totalWeight: number;
    missingPalaces: string[];
  };
  configuredPalaceCount: number;
  resolvedPalaceCount: number;
  matchedStarCount: number;
  missingInputs: string[];
  missingPrimaryReason?: string;
}

export type StarTemporalLayer =
  | "natal"
  | "annual"
  | "decadal"
  | "monthly"
  | "daily"
  | "unknown";

/** Deterministic V0.8 evidence — weighted contribution agrees with scoring. */
export interface AnnualAxisV08Evidence {
  ruleId: string;
  starName: string;
  exactMatchedStarName: string;
  temporalLayer: StarTemporalLayer;
  palaceName: string;
  palaceRole: "primary" | "cooperating" | "small-limit";
  palaceWeight: number;
  pointValue: number;
  weightedContribution: number;
  polarity: "positive" | "negative";
  thaiTueProminenceApplied: boolean;
}

export interface AnnualAxisCoverageV08 {
  resolvedWeight: number;
  totalWeight: number;
  missingPalaces: string[];
}

/** Trung Châu V0.2 — evidence-driven frame scoring. */
export type AnnualAxisTrungChauV02Result =
  | {
      domain: AnnualAxisDomain;
      engine: "v0.2";
      status: "available" | "partial-data";
      score: number;
      band: AnnualAxisBand;
      rawAxes: AnnualAxisRawAxes;
      normalizedAxes: AnnualAxisRawAxes;
      intensity: number;
      conflict: number;
      evidence: AnnualAxisEvidence[];
      topSupportDrivers: AnnualAxisEvidence[];
      topPressureDrivers: AnnualAxisEvidence[];
      annualDelta?: number;
      reasonCodes?: string[];
    }
  | {
      domain: AnnualAxisDomain;
      engine: "v0.2";
      status: "unavailable";
      score: null;
      band: null;
      evidence: [];
      reasonCodes: string[];
    };

/** Nam Phái V0.8 — deterministic palace-weighted scoring. */
export type AnnualAxisNamPhaiV08Result =
  | {
      domain: AnnualAxisDomain;
      engine: "v0.8";
      status: "available" | "partial-data";
      score: number;
      band: AnnualAxisBand;
      scoreTrace: AnnualAxisScoreTraceV08;
      coverage: AnnualAxisCoverageV08;
      v08Evidence: AnnualAxisV08Evidence[];
      topSupportDriversV08: AnnualAxisV08Evidence[];
      topPressureDriversV08: AnnualAxisV08Evidence[];
      reasonCodes?: string[];
    }
  | {
      domain: AnnualAxisDomain;
      engine: "v0.8";
      status: "unavailable";
      score: null;
      band: null;
      reasonCodes: string[];
      scoreTrace?: AnnualAxisScoreTraceV08;
      coverage?: AnnualAxisCoverageV08;
      v08Evidence?: AnnualAxisV08Evidence[];
      topSupportDriversV08?: AnnualAxisV08Evidence[];
      topPressureDriversV08?: AnnualAxisV08Evidence[];
    };

export type AnnualAxisResult =
  | AnnualAxisTrungChauV02Result
  | AnnualAxisNamPhaiV08Result;

export interface AnnualAxesDiagnostics {
  invalidKnowledge: string[];
  missingAnnualPalaceNames: string[];
  unresolvedAnnualTargets: string[];
  unknownStars: string[];
  unknownMutagens: string[];
  forbiddenSchoolMarkers: string[];
  missingRequiredAnnualFacts: string[];
  /** V0.2 — chart palace list not exactly 12, or labels are missing for
   * the school's required coordinate (e.g. Trung Châu chart without
   * annual labels). */
  incompleteChartPalaces: string[];
  /** V0.2 — Nam Phái specific: two natal palaces share the same
   * `palace.name` (should never happen on a well-formed chart). */
  duplicateNatalPalaceNames: string[];
  /** V0.2 — a domain anchor label from axis definitions did not match
   * any palace via the school's resolver. */
  missingDomainAnchor: string[];
  /** V0.2 — multiple palaces matched the same anchor label. */
  ambiguousDomainAnchor: string[];
  /** V0.3 — Nam Phái: `chart.annualHeadPalace` missing (may still fall
   * back to a unique `isLuuNienDaiVan` flag). */
  missingAnnualHeadPalace: string[];
  /** V0.3 — more than one palace flagged `isLuuNienDaiVan`. */
  duplicateAnnualHeadPalaces: string[];
  /** V0.3 — `annualHeadPalace` index disagrees with the unique LNDV flag. */
  annualHeadPointerFlagMismatch: string[];
  /** V0.2/V0.3 — Nam Phái secondary: `chart.smallLimitPalace` is missing. */
  missingSmallLimitPalace: string[];
  /** V0.2 — annual focus palace could not be resolved (Nam Phái or Trung
   * Châu). */
  invalidAnnualFocusPalace: string[];
  /** V0.2 — annual focus frame could not build any TP4C nodes. */
  missingAnnualFocusFrameNodes: string[];
  /** V0.2 — school policy missing/invalid for the requested school. */
  unsupportedSchoolPolicy: string[];
}

/** V0.2 — per-domain and module-level capabilities exposed to the UI.
 * `supportsAnnualFocus` reflects whether an activation-overlay frame was
 * actually built for this chart (i.e. the school's required focus palace
 * resolved). `supportsDomainScoring` mirrors the module-level status —
 * true iff at least one domain is available. */
export interface AnnualAxesCapabilities {
  supportsDomainScoring: boolean;
  supportsAnnualFocus: boolean;
  domainAnchorCoordinate: "natal-palace-name" | "annual-palace-name";
  domainAnchorProvenance: string;
  primaryAnnualFocus: "annual-major-fortune" | "annual-menh" | "small-limit";
}

/** V0.3 — public summary of the annual head. Never mutated by
 * downstream code; the UI reads it verbatim to render the head header. */
export interface AnnualFocusSummary {
  mode: "annual-major-fortune" | "annual-menh" | "small-limit";
  palaceIndex: number;
  palaceName: string;
  palaceBranch: string;
  annualPalaceName: string | null;
  frameBranches: string[];
}

export interface AnnualAxesResult {
  module: "annual-axes";
  annualYear: number;
  school: ZiweiSchool;
  versions: {
    contractVersion: string;
    engineVersion: string;
    knowledgeVersion: string;
  };
  status: "available" | "partial" | "unavailable";
  axes: Record<AnnualAxisDomain, AnnualAxisResult>;
  diagnostics: AnnualAxesDiagnostics;
  capabilities: AnnualAxesCapabilities;
  annualFocus: AnnualFocusSummary | null;
}

export function emptyAnnualAxes(): AnnualAxisRawAxes {
  return { support: 0, pressure: 0, stability: 0, activation: 0 };
}

export function addAnnualAxes(
  a: AnnualAxisRawAxes,
  b: AnnualAxisRawAxes,
): AnnualAxisRawAxes {
  return {
    support: a.support + b.support,
    pressure: a.pressure + b.pressure,
    stability: a.stability + b.stability,
    activation: a.activation + b.activation,
  };
}

export function scaleAnnualAxes(
  axes: AnnualAxisRawAxes,
  factor: number,
): AnnualAxisRawAxes {
  return {
    support: axes.support * factor,
    pressure: axes.pressure * factor,
    stability: axes.stability * factor,
    activation: axes.activation * factor,
  };
}

export function absAnnualEffect(axes: AnnualAxisRawAxes): number {
  return (
    Math.abs(axes.support) +
    Math.abs(axes.pressure) +
    Math.abs(axes.stability) +
    Math.abs(axes.activation)
  );
}

export function emptyAnnualAxesDiagnostics(): AnnualAxesDiagnostics {
  return {
    invalidKnowledge: [],
    missingAnnualPalaceNames: [],
    unresolvedAnnualTargets: [],
    unknownStars: [],
    unknownMutagens: [],
    forbiddenSchoolMarkers: [],
    missingRequiredAnnualFacts: [],
    incompleteChartPalaces: [],
    duplicateNatalPalaceNames: [],
    missingDomainAnchor: [],
    ambiguousDomainAnchor: [],
    missingAnnualHeadPalace: [],
    duplicateAnnualHeadPalaces: [],
    annualHeadPointerFlagMismatch: [],
    missingSmallLimitPalace: [],
    invalidAnnualFocusPalace: [],
    missingAnnualFocusFrameNodes: [],
    unsupportedSchoolPolicy: [],
  };
}
