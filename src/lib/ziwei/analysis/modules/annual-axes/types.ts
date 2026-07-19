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
  /** V0.4.1 — confidence weight kept separate from `effectiveWeight` so
   * channel aggregation can apply it once, independently per path (§6). */
  confidenceWeight?: number;
  factIds: string[];
  sourceIds: string[];
  knowledgeStatus: "experimental" | "approved";
  /** V0.3 Nam Phái head-centric channel-blend provenance. Undefined for
   * legacy V0.2 evidence rows (Trung Châu path). */
  headChannelWeight?: number;
  localChannelWeight?: number;
  combinedGeometryWeight?: number;
  routing?: number;
  headShare?: number;
  localShare?: number;
  /** V0.4 — annual triggers that activated this natal-derived fact. */
  annualTriggerIds?: string[];
  /** V0.4 — domain affinity weight applied to this evidence. */
  affinityWeight?: number;
  /** V0.4.1 — provenance of the affinity value above (§3 ResolvedDomainAffinity). */
  affinitySource?: "exact-star" | "star-family" | "transformation" | "moving-marker";
  affinityRecordId?: string;
  /** V0.4 — activation paths after channel assignment. V0.4.1: each path
   * carries its own independent `boundedPathWeight` (no cross-channel
   * combine-then-split; see §6). */
  activationPaths?: AnnualEvidenceActivationPath[];
}

export type AnnualEvidenceChannel =
  | "global"
  | "routed-head"
  | "direct-domain"
  | "major-background";

export interface AnnualEvidenceActivationPath {
  triggerId: string;
  channel: AnnualEvidenceChannel;
  geometryWeight: number;
  affinityWeight: number;
  effectivePathWeight: number;
  /** V0.4.1 — the weight actually applied to this path's channel
   * contribution, computed independently of any other path on the same
   * physical fact (`min(1, geometryWeight * affinityWeight)`). */
  boundedPathWeight: number;
}

/** V0.4.1 — Nam Phái evidence-collection instrumentation for one domain.
 * Audit/debug only; cheap plain counters accumulated during the existing
 * collection loop (no extra pass over the chart). */
export interface NamPhaiV041CollectStats {
  candidateFacts: number;
  numericFacts: number;
  contextOnlyFacts: number;
  droppedByReason: {
    noAnnualTrigger: number;
    noAffinity: number;
    zeroAffinity: number;
    noLocalDomainRelevance: number;
    noEnabledGlobalRule: number;
    duplicatePhysicalFact: number;
  };
  affinityResolution: {
    exactStar: number;
    starFamily: number;
    transformation: number;
    unmapped: number;
  };
}

export interface AnnualChannelSummary {
  supportRaw: number;
  pressureRaw: number;
  activationRaw: number;
  supportNorm: number;
  pressureNorm: number;
  signed: number;
  evidenceIds: string[];
}

export interface NatalDomainResponseProfile {
  sensitivity: number;
  resilience: number;
  amplitudeMultiplier: number;
  provenance: string[];
}

/** V0.3 — head-centric routing exposure per domain. Undefined when the
 * domain result was produced by a non-head-centric school (currently
 * Trung Châu keeps the V0.2 path). */
export interface AnnualDomainRouting {
  routing: number;
  headShare: number;
  localShare: number;
}

export type AnnualAxisResult =
  | {
      domain: AnnualAxisDomain;
      status: "available";
      score: number;
      band: AnnualAxisBand;
      rawAxes: AnnualAxisRawAxes;
      normalizedAxes: AnnualAxisRawAxes;
      intensity: number;
      conflict: number;
      evidence: AnnualAxisEvidence[];
      topSupportDrivers: AnnualAxisEvidence[];
      topPressureDrivers: AnnualAxisEvidence[];
      /** V0.3 Nam Phái head-centric routing. Undefined for the Trung Châu
       * V0.2 path so the locked TC numeric fixture stays byte-identical. */
      routing?: AnnualDomainRouting;
      /** V0.4 annual-delta explainability. */
      annualDelta?: number;
      routedStrength?: number;
      natalResponse?: NatalDomainResponseProfile;
      channels?: {
        globalAnnualClimate: AnnualChannelSummary;
        routedHeadImpact: AnnualChannelSummary;
        directDomainImpact: AnnualChannelSummary;
        majorFortuneBackground: AnnualChannelSummary;
      };
      /** V0.4.1 — Nam Phái evidence-collection instrumentation. */
      collectStats?: NamPhaiV041CollectStats;
    }
  | {
      domain: AnnualAxisDomain;
      status: "unavailable";
      score: null;
      band: null;
      evidence: [];
      reasonCodes: string[];
      routing?: AnnualDomainRouting;
    };

export interface AnnualAxesDiagnostics {
  invalidKnowledge: string[];
  missingAnnualPalaceNames: string[];
  unresolvedAnnualTargets: string[];
  unknownStars: string[];
  unknownMutagens: string[];
  forbiddenSchoolMarkers: string[];
  duplicatePhysicalFacts: string[];
  disabledInteractionHits: string[];
  missingSourceIds: string[];
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
  /** V0.3 — Nam Phái head-frame could not be built (opposite/trine
   * palace physically missing). */
  invalidAnnualHeadFrame: string[];
  /** V0.3 — routing computed outside the [0, 1] range for a domain. */
  routingOutOfRange: string[];
  /** V0.3 — duplicate physical facts survived the channel blend. */
  duplicatePhysicalFactBlend: string[];
  /** V0.4 — natal numeric evidence emitted without annual triggers. */
  natalEvidenceMissingTriggers: string[];
  /** V0.4 — domain local frame covers nearly the whole chart. */
  domainFrameOvercoverage: string[];
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
    duplicatePhysicalFacts: [],
    disabledInteractionHits: [],
    missingSourceIds: [],
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
    invalidAnnualHeadFrame: [],
    routingOutOfRange: [],
    duplicatePhysicalFactBlend: [],
    natalEvidenceMissingTriggers: [],
    domainFrameOvercoverage: [],
  };
}
