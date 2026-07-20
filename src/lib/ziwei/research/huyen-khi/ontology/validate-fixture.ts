/**
 * Expert fixture validation + review workflow helpers (A1, A2, G).
 *
 * Fixtures are scenario templates, NOT approved answers. `maturity` is an
 * authoring stage set by hand; reviewer status (reviewed/approved/disputed) is
 * DERIVED from the append-only review ledger — a manually written status can
 * never satisfy the promotion gate. Reviews are appended, never overwritten;
 * disagreement is retained (disputed), never averaged; disputed fixtures are
 * excluded from the approved count. Fixtures carry no personal birth data.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { ONTOLOGY_SCHEMAS_DIR } from "./paths";
import { validateAgainstSchema, type JsonSchema } from "./schema-validator";
import { scanForbiddenScoringKeys } from "./numeric-key-scan";
import type {
  HuyenKhiDerivedFixtureStatus,
  HuyenKhiExpertFixture,
  HuyenKhiExpertFixturePlan,
  HuyenKhiFixtureMaturity,
  HuyenKhiFixtureReview,
  HuyenKhiValidationIssue,
} from "./types";

let fixtureSchema: JsonSchema | null = null;
function getFixtureSchema(): JsonSchema {
  if (!fixtureSchema) {
    fixtureSchema = JSON.parse(
      readFileSync(path.join(ONTOLOGY_SCHEMAS_DIR, "expert-fixture.schema.v0.1.json"), "utf-8"),
    ) as JsonSchema;
  }
  return fixtureSchema;
}

/** The review sub-schema, extracted from the fixture schema. */
function getReviewSchema(): JsonSchema {
  const reviews = getFixtureSchema().properties?.reviews;
  const items = (reviews as JsonSchema | undefined)?.items;
  if (!items) throw new Error("fixture schema missing reviews.items");
  return items;
}

const PERSONAL_DATA_KEYS = [
  "solardate",
  "birthdate",
  "birthhour",
  "birthtime",
  "gender",
  "name",
  "fullname",
  "dob",
  "lunardate",
];

const RESEARCH_READY_REQUIRED = [
  "researchQuestion",
  "candidateSourceIds",
  "expectedEvidence",
] as const;

const REVIEWABLE_REQUIRED = [
  "rationale",
] as const;

export function validateFixture(
  fixture: unknown,
  file = "expert-fixture-plan.v0.1.json",
  index = 0,
): HuyenKhiValidationIssue[] {
  const issues: HuyenKhiValidationIssue[] = [];
  const base = `$.fixtures[${index}]`;

  for (const v of validateAgainstSchema(fixture, getFixtureSchema(), base)) {
    issues.push({ severity: "error", code: "schema-invalid", file, path: v.path, message: v.message });
  }
  for (const hit of scanForbiddenScoringKeys(fixture, base)) {
    issues.push({ severity: "error", code: "numeric-scoring-key", file, path: hit.path, message: `forbidden scoring key '${hit.key}'` });
  }
  scanPersonalKeys(fixture, base).forEach((p) =>
    issues.push({ severity: "error", code: "personal-data", file, path: p.path, message: `possible personal-chart key '${p.key}'` }),
  );

  // Maturity-stage requirements (A/G). Only run when the object is shaped.
  if (!issues.some((i) => i.code === "schema-invalid") && isFixture(fixture)) {
    issues.push(...validateMaturityRequirements(fixture, file, base));
    // Every review record must also satisfy the review sub-schema.
    (fixture.reviews ?? []).forEach((review, ri) => {
      for (const v of validateAgainstSchema(review, getReviewSchema(), `${base}.reviews[${ri}]`)) {
        issues.push({ severity: "error", code: "schema-invalid", file, path: v.path, message: v.message });
      }
    });
  }

  return issues;
}

function isFixture(value: unknown): value is HuyenKhiExpertFixture {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).maturity === "string"
  );
}

/** research-ready and reviewable stages must carry their required content. */
function validateMaturityRequirements(
  fixture: HuyenKhiExpertFixture,
  file: string,
  base: string,
): HuyenKhiValidationIssue[] {
  const issues: HuyenKhiValidationIssue[] = [];
  const maturity: HuyenKhiFixtureMaturity = fixture.maturity;
  const needsResearch = maturity === "research-ready" || maturity === "reviewable";
  const needsReviewable = maturity === "reviewable";
  const record = fixture as unknown as Record<string, unknown>;

  const missing = (key: string) => {
    const v = record[key];
    return v === undefined || (Array.isArray(v) && v.length === 0) || v === "";
  };

  if (needsResearch) {
    if (Object.keys(fixture.inputFacts ?? {}).length === 0) {
      issues.push({ severity: "error", code: "maturity-incomplete", file, path: `${base}.inputFacts`, message: `${maturity} requires non-empty canonical input facts` });
    }
    for (const key of RESEARCH_READY_REQUIRED) {
      if (missing(key)) {
        issues.push({ severity: "error", code: "maturity-incomplete", file, path: `${base}.${key}`, message: `${maturity} requires '${key}'` });
      }
    }
  }
  if (needsReviewable) {
    for (const key of REVIEWABLE_REQUIRED) {
      if (missing(key)) {
        issues.push({ severity: "error", code: "maturity-incomplete", file, path: `${base}.${key}`, message: `reviewable requires '${key}'` });
      }
    }
    const hasExpectations =
      (fixture.expectedEffectiveRuleIds?.length ?? 0) > 0 ||
      (fixture.forbiddenRuleIds?.length ?? 0) > 0 ||
      Object.keys(fixture.expectedState ?? {}).length > 0;
    if (!hasExpectations) {
      issues.push({ severity: "error", code: "maturity-incomplete", file, path: `${base}`, message: `reviewable requires proposed expected dimensions and/or expected/forbidden rule IDs` });
    }
  }
  return issues;
}

function scanPersonalKeys(value: unknown, basePath: string): { path: string; key: string }[] {
  const out: { path: string; key: string }[] = [];
  const walk = (v: unknown, p: string) => {
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, `${p}[${i}]`));
    } else if (v && typeof v === "object") {
      for (const [key, child] of Object.entries(v as Record<string, unknown>)) {
        if (PERSONAL_DATA_KEYS.includes(key.toLowerCase())) {
          out.push({ path: `${p}.${key}`, key });
        }
        walk(child, `${p}.${key}`);
      }
    }
  };
  walk(value, basePath);
  return out;
}

/** Validate a single review object against the review sub-schema (A2, CLI). */
export function validateReview(review: unknown): HuyenKhiValidationIssue[] {
  return validateAgainstSchema(review, getReviewSchema(), "$review").map((v) => ({
    severity: "error" as const,
    code: "schema-invalid",
    file: "review",
    path: v.path,
    message: v.message,
  }));
}

/** Append a review WITHOUT overwriting earlier ones. Returns a NEW fixture. */
export function appendFixtureReview(
  fixture: HuyenKhiExpertFixture,
  review: HuyenKhiFixtureReview,
): HuyenKhiExpertFixture {
  return { ...fixture, reviews: sortReviews([...(fixture.reviews ?? []), review]) };
}

/** Order-independent: sort by reviewer then timestamp then decision. */
function sortReviews(
  reviews: readonly HuyenKhiFixtureReview[],
): HuyenKhiFixtureReview[] {
  return [...reviews].sort((a, b) =>
    a.reviewerId !== b.reviewerId
      ? a.reviewerId.localeCompare(b.reviewerId)
      : a.reviewedAt !== b.reviewedAt
        ? a.reviewedAt.localeCompare(b.reviewedAt)
        : a.decision.localeCompare(b.decision),
  );
}

/**
 * Derived reviewer status from the append-only ledger (A1):
 * - no reviews → draft;
 * - any dispute → disputed;
 * - ≥2 independent approvals, or 1 school-expert + 1 adjudicator → approved;
 * - else reviewed.
 *
 * A hand-written status field does not exist and cannot influence this.
 */
export function deriveFixtureStatus(
  reviews: readonly HuyenKhiFixtureReview[] | undefined,
): HuyenKhiDerivedFixtureStatus {
  const ledger = reviews ?? [];
  if (ledger.length === 0) return "draft";
  if (ledger.some((r) => r.decision === "disputed")) return "disputed";

  const approvals = ledger.filter((r) => r.decision === "approved");
  const independentApprovers = new Set(approvals.map((r) => r.reviewerId));
  const hasExpertPlusAdjudicator =
    approvals.some((r) => r.role === "school-expert") &&
    approvals.some((r) => r.role === "adjudicator");

  if (independentApprovers.size >= 2 || hasExpertPlusAdjudicator) return "approved";
  return "reviewed";
}

export interface FixtureStatusCounts {
  readonly total: number;
  readonly draft: number;
  readonly reviewed: number;
  readonly approved: number;
  readonly disputed: number;
  /** Approved (disputed already excluded) — the promotion metric. */
  readonly approvedForPromotion: number;
}

/** Counts DERIVED from each fixture's review ledger — never a stored status. */
export function countFixtureStatuses(
  plan: HuyenKhiExpertFixturePlan,
): FixtureStatusCounts {
  let draft = 0;
  let reviewed = 0;
  let approved = 0;
  let disputed = 0;
  for (const fixture of plan.fixtures) {
    switch (deriveFixtureStatus(fixture.reviews)) {
      case "draft": draft += 1; break;
      case "reviewed": reviewed += 1; break;
      case "approved": approved += 1; break;
      case "disputed": disputed += 1; break;
    }
  }
  return { total: plan.fixtures.length, draft, reviewed, approved, disputed, approvedForPromotion: approved };
}

export interface FixtureMaturityCounts {
  readonly planned: number;
  readonly researchReady: number;
  readonly reviewable: number;
}

export function countFixtureMaturity(
  plan: HuyenKhiExpertFixturePlan,
): FixtureMaturityCounts {
  let planned = 0;
  let researchReady = 0;
  let reviewable = 0;
  for (const fixture of plan.fixtures) {
    switch (fixture.maturity) {
      case "planned": planned += 1; break;
      case "research-ready": researchReady += 1; break;
      case "reviewable": reviewable += 1; break;
    }
  }
  return { planned, researchReady, reviewable };
}
