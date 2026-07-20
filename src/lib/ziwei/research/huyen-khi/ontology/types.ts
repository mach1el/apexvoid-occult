/**
 * ApexVoid Huyền Khí Ontology V0.1 — type contracts.
 *
 * RESEARCH ONLY. This package does NOT compute a numeric score and MUST NOT be
 * imported by production modules. It mirrors the supplied JSON schemas under
 * `research/huyen-khi/ontology/v0.1/` and the specification (PR #94).
 *
 * Symbolic-only: dimensions carry ORDINAL vocabulary (state names, magnitude
 * words), never coefficients. No `score / weight / coefficient / support /
 * pressure / stability / activation / factor / delta / multiplier` keys are
 * permitted in ontology knowledge — the validator enforces this.
 */

// ── Dimensions & symbolic vocabulary (§2, §3) ───────────────────────────────

export type PalaceQiCapacity =
  | "depleted"
  | "weak"
  | "adequate"
  | "strong"
  | "abundant";

export type PalaceQiCoherence =
  | "fragmented"
  | "conflicted"
  | "mixed"
  | "coherent"
  | "integrated";

export type PalaceQiExpression =
  | "blocked"
  | "restricted"
  | "available"
  | "expressive";

export type PalaceQiRegulation =
  | "overwhelmed"
  | "insufficient"
  | "conditional"
  | "effective";

export type PalaceQiTendency =
  | "nourishing"
  | "mixed"
  | "pressuring"
  | "unresolved";

/** Five separate dimensions — never collapse into one good/bad state (§2). */
export type HuyenKhiDimension =
  | "capacity"
  | "coherence"
  | "expression"
  | "regulation"
  | "tendency";

export type HuyenKhiOperation =
  | "strengthen"
  | "weaken"
  | "stabilize"
  | "destabilize"
  | "block"
  | "release"
  | "nourish"
  | "deplete"
  | "regulate"
  | "overwhelm"
  | "transform";

/** Ordinal vocabulary, NOT a coefficient (§3). */
export type HuyenKhiMagnitude =
  | "trace"
  | "light"
  | "moderate"
  | "strong"
  | "dominant";

// ── School (§7) ─────────────────────────────────────────────────────────────

export type HuyenKhiSchoolProfile = "shared" | "nam-phai" | "trung-chau";

/** Profile that may appear before school is resolved (extraction stage). */
export type HuyenKhiExtractionSchoolProfile =
  | HuyenKhiSchoolProfile
  | "unresolved";

// ── Source registry (§5) ────────────────────────────────────────────────────

export type HuyenKhiSourceKind =
  | "calculation-core"
  | "classical-primary"
  | "modern-vietnamese-reference"
  | "modern-chinese-reference"
  | "expert-review"
  | "external-output-benchmark"
  | "internal-specification";

export interface HuyenKhiSource {
  readonly sourceId: string;
  readonly title: string;
  readonly kind: HuyenKhiSourceKind;
  readonly status: string;
  readonly allowedUsage?: readonly string[];
  readonly prohibitedUsage?: readonly string[];
  // Registry entries carry extra descriptive keys (authorityFor, locations…);
  // schema is `additionalProperties: true`, so keep them but untyped-narrow.
  readonly [key: string]: unknown;
}

export interface HuyenKhiSourceRegistry {
  readonly schemaVersion: string;
  readonly registryId: string;
  readonly sources: readonly HuyenKhiSource[];
}

// ── Claim registry (§5) ─────────────────────────────────────────────────────

export type HuyenKhiClaimStatus =
  | "approved-engineering"
  | "approved-research-policy"
  | "primary-source-reviewed"
  | "secondary-source-reviewed"
  | "expert-consensus"
  | "experimental"
  | "disputed"
  | "unresolved";

export interface HuyenKhiClaim {
  readonly claimId: string;
  readonly summary: string;
  readonly status: HuyenKhiClaimStatus;
  readonly sourceIds: readonly string[];
  readonly locator?: Readonly<Record<string, unknown>>;
  readonly schoolProfiles?: readonly HuyenKhiSchoolProfile[];
  readonly limitations?: readonly string[];
}

export interface HuyenKhiClaimRegistry {
  readonly schemaVersion: string;
  readonly registryId: string;
  readonly claims: readonly HuyenKhiClaim[];
}

// ── Rule contract (§4) ──────────────────────────────────────────────────────

export type HuyenKhiRuleStatus =
  | "draft"
  | "reviewed"
  | "approved"
  | "experimental"
  | "disputed"
  | "disabled";

export type HuyenKhiRuleSpecificity =
  | "exact-combination"
  | "exact-star-state"
  | "exact-star"
  | "star-family"
  | "generic-structure";

export type HuyenKhiRuleSubjectKind =
  | "palace-foundation"
  | "major-star"
  | "minor-star"
  | "star-family"
  | "transformation"
  | "void-marker"
  | "relation"
  | "combination";

export interface HuyenKhiRuleSubject {
  readonly kind: HuyenKhiRuleSubjectKind;
  readonly id: string;
}

export interface HuyenKhiRuleCondition {
  readonly fact?: string;
  readonly operator?: string;
  readonly value?: unknown;
  readonly [key: string]: unknown;
}

export interface HuyenKhiRuleEffect {
  readonly dimension: HuyenKhiDimension;
  readonly operation: HuyenKhiOperation;
  readonly magnitude: HuyenKhiMagnitude;
  /** Which physical fact the effect targets (for dedup/suppression checks). */
  readonly targetFactSelector?: Readonly<Record<string, unknown>>;
}

export interface HuyenKhiRule {
  readonly ruleId: string;
  readonly version: string;
  readonly status: HuyenKhiRuleStatus;
  readonly schoolProfile: HuyenKhiSchoolProfile;
  readonly specificity: HuyenKhiRuleSpecificity;
  readonly subject: HuyenKhiRuleSubject;
  readonly conditions: readonly HuyenKhiRuleCondition[];
  readonly effects: readonly HuyenKhiRuleEffect[];
  readonly stackingGroup: string;
  readonly suppressesRuleIds?: readonly string[];
  readonly sourceIds: readonly string[];
  readonly claimIds?: readonly string[];
  readonly limitations?: readonly string[];
}

/** A non-effective example catalog. NEVER loaded as knowledge (§3, gates). */
export interface HuyenKhiNonEffectiveRuleCatalog {
  readonly schemaVersion: string;
  readonly catalogId: string;
  readonly effective: false;
  readonly notes?: string;
  readonly rules: readonly HuyenKhiRule[];
}

// ── Expert fixtures (§9) ────────────────────────────────────────────────────

export type HuyenKhiFixtureReviewerStatus =
  | "draft"
  | "reviewed"
  | "approved"
  | "disputed";

export interface HuyenKhiFixtureExpectedState {
  readonly capacity?: PalaceQiCapacity;
  readonly coherence?: PalaceQiCoherence;
  readonly expression?: PalaceQiExpression;
  readonly regulation?: PalaceQiRegulation;
  readonly tendency?: PalaceQiTendency;
}

export interface HuyenKhiFixtureReview {
  readonly reviewerId: string;
  readonly role: HuyenKhiReviewRole;
  readonly schoolProfile: HuyenKhiSchoolProfile;
  readonly decision: HuyenKhiFixtureReviewerStatus;
  readonly expectedState?: HuyenKhiFixtureExpectedState;
  readonly expectedEffectiveRuleIds?: readonly string[];
  readonly forbiddenRuleIds?: readonly string[];
  readonly rationale: string;
  readonly reviewedAt: string;
}

export interface HuyenKhiExpertFixture {
  readonly fixtureId: string;
  readonly title: string;
  readonly category: string;
  readonly schoolProfile: HuyenKhiSchoolProfile;
  readonly inputFacts: Readonly<Record<string, unknown>>;
  readonly expectedState?: HuyenKhiFixtureExpectedState;
  readonly expectedEffectiveRuleIds?: readonly string[];
  readonly forbiddenRuleIds?: readonly string[];
  readonly reviewQuestions: readonly string[];
  readonly rationale?: string;
  readonly reviewerStatus: HuyenKhiFixtureReviewerStatus;
  readonly reviews?: readonly HuyenKhiFixtureReview[];
}

export interface HuyenKhiExpertFixturePlan {
  readonly schemaVersion: string;
  readonly fixtureSetId: string;
  readonly minimumApprovedRequiredForNextPhase: number;
  readonly preferredApproved?: number;
  readonly fixtures: readonly HuyenKhiExpertFixture[];
}

// ── Catalogs & policies (§7, §8) ────────────────────────────────────────────

export interface HuyenKhiTerm {
  readonly termId: string;
  readonly labelVi: string;
  readonly definition: string;
  readonly notEquivalentTo?: readonly string[];
  readonly phase?: string;
}

export interface HuyenKhiNamespaceSeparation {
  readonly left: string;
  readonly right: string;
  readonly rule: string;
}

export interface HuyenKhiTerminology {
  readonly schemaVersion: string;
  readonly catalogId: string;
  readonly terms: readonly HuyenKhiTerm[];
  readonly namespaceSeparations?: readonly HuyenKhiNamespaceSeparation[];
}

export interface HuyenKhiDimensionSpec {
  readonly orderedStates?: readonly string[];
  readonly unorderedStates?: readonly string[];
  readonly numericMappingForbidden: true;
}

export interface HuyenKhiSymbolicDimensions {
  readonly schemaVersion: string;
  readonly catalogId: string;
  readonly dimensions: Readonly<Record<HuyenKhiDimension, HuyenKhiDimensionSpec>>;
  readonly magnitudeVocabulary: readonly HuyenKhiMagnitude[];
  readonly effectOperations: readonly HuyenKhiOperation[];
}

export interface HuyenKhiSchoolProfileConfig {
  readonly status?: string;
  readonly allowedFactNamespaces?: readonly string[];
  readonly inheritsSharedFacts?: boolean;
  readonly ruleFallbackToOtherSchool?: boolean;
  readonly fallbackPolicy?: string;
}

export interface HuyenKhiSchoolPolicy {
  readonly schemaVersion: string;
  readonly catalogId: string;
  readonly profiles: Readonly<Record<string, HuyenKhiSchoolProfileConfig>>;
  readonly missingProfileBehavior: string;
}

export interface HuyenKhiConflictRule {
  readonly id: string;
  readonly condition: string;
  readonly behavior: string;
}

export interface HuyenKhiRuleConflictPolicy {
  readonly schemaVersion: string;
  readonly policyId: string;
  readonly specificityOrder: readonly HuyenKhiRuleSpecificity[];
  readonly rules: readonly HuyenKhiConflictRule[];
  readonly silentResolutionForbidden: true;
}

// ── Source extraction workflow (§6) ─────────────────────────────────────────

export interface SourceExtractionLocator {
  readonly edition?: string;
  readonly volume?: string;
  readonly page?: string;
  readonly section?: string;
  readonly stableUrl?: string;
}

export type SourceExtractionStatus =
  | "draft"
  | "reviewed"
  | "rejected"
  | "disputed";

export interface SourceExtractionRecord {
  readonly extractionId: string;
  readonly taskId: string;
  readonly sourceId: string;
  readonly locator: SourceExtractionLocator;
  readonly conciseParaphrase: string;
  readonly candidateClaimIds: readonly string[];
  readonly schoolProfile: HuyenKhiExtractionSchoolProfile;
  readonly extractor: string;
  readonly reviewer: string | null;
  readonly status: SourceExtractionStatus;
  readonly contradictionNotes: readonly string[];
}

export interface HuyenKhiSourceExtractionQueue {
  readonly schemaVersion: string;
  readonly queueId?: string;
  readonly records: readonly SourceExtractionRecord[];
  readonly [key: string]: unknown;
}

export type HuyenKhiReviewRole =
  | "researcher"
  | "source-reviewer"
  | "school-expert"
  | "adjudicator";

export interface HuyenKhiExpertReviewWorkflow {
  readonly schemaVersion: string;
  readonly workflowId: string;
  readonly roles: readonly HuyenKhiReviewRole[];
  readonly states: readonly HuyenKhiFixtureReviewerStatus[];
  readonly requirements: Readonly<Record<string, readonly string[]>>;
  readonly blindReviewRecommended?: boolean;
  readonly personalChartDataRequired?: boolean;
}

export interface HuyenKhiReleaseGates {
  readonly schemaVersion: string;
  readonly gateId: string;
  readonly hardGates: Readonly<Record<string, number | boolean>>;
  readonly nextPhasePromotionGates: Readonly<Record<string, unknown>>;
  readonly productionGate: string;
}

// ── Manifest (§12) ──────────────────────────────────────────────────────────

export interface HuyenKhiOntologyManifest {
  readonly schemaVersion: string;
  readonly manifestId: string;
  readonly version: string;
  readonly status: string;
  readonly files: readonly string[];
  readonly forbiddenRuntimeDependencies: readonly string[];
}

// ── Loaded ontology bundle ──────────────────────────────────────────────────

export interface HuyenKhiOntology {
  readonly manifest: HuyenKhiOntologyManifest;
  readonly sourceRegistry: HuyenKhiSourceRegistry;
  readonly claimRegistry: HuyenKhiClaimRegistry;
  readonly terminology: HuyenKhiTerminology;
  readonly symbolicDimensions: HuyenKhiSymbolicDimensions;
  readonly schoolPolicy: HuyenKhiSchoolPolicy;
  readonly ruleConflictPolicy: HuyenKhiRuleConflictPolicy;
  readonly sourceExtractionQueue: HuyenKhiSourceExtractionQueue;
  readonly expertReviewWorkflow: HuyenKhiExpertReviewWorkflow;
  readonly releaseGates: HuyenKhiReleaseGates;
  readonly fixturePlan: HuyenKhiExpertFixturePlan;
  /** Effective rules loaded as knowledge. Empty in V0.1 — no evaluator. */
  readonly rules: readonly HuyenKhiRule[];
}

// ── Validation & reports (§12, §13) ─────────────────────────────────────────

export type HuyenKhiIssueSeverity = "error" | "warning";

export interface HuyenKhiValidationIssue {
  readonly severity: HuyenKhiIssueSeverity;
  readonly code: string;
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

export type HuyenKhiLoadResult =
  | { readonly ok: true; readonly ontology: HuyenKhiOntology }
  | { readonly ok: false; readonly issues: readonly HuyenKhiValidationIssue[] };
