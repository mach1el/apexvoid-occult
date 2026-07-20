/**
 * Expert fixture validation + review workflow helpers (§9).
 *
 * Fixtures are scenario templates, NOT approved answers. Reviews are appended,
 * never overwritten; disagreement is retained (disputed), never averaged;
 * disputed fixtures are excluded from the approved count. Fixtures carry no
 * personal birth data.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { ONTOLOGY_SCHEMAS_DIR } from "./paths";
import { validateAgainstSchema, type JsonSchema } from "./schema-validator";
import { scanForbiddenScoringKeys } from "./numeric-key-scan";
import type {
  HuyenKhiExpertFixture,
  HuyenKhiExpertFixturePlan,
  HuyenKhiFixtureReview,
  HuyenKhiFixtureReviewerStatus,
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

/** Keys that would indicate real personal birth data (forbidden). */
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
  // Personal-data heuristic on the whole fixture.
  scanPersonalKeys(fixture, base).forEach((p) =>
    issues.push({ severity: "error", code: "personal-data", file, path: p.path, message: `possible personal-chart key '${p.key}'` }),
  );

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

/**
 * Append a review WITHOUT overwriting earlier ones, then recompute a derived
 * reviewer status deterministically. Returns a NEW fixture (no mutation).
 */
export function appendFixtureReview(
  fixture: HuyenKhiExpertFixture,
  review: HuyenKhiFixtureReview,
): HuyenKhiExpertFixture {
  const reviews = sortReviews([...(fixture.reviews ?? []), review]);
  return {
    ...fixture,
    reviews,
    reviewerStatus: deriveReviewerStatus(reviews),
  };
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
 * Derived status (§ expert-review-workflow requirements):
 * - any dispute → disputed (retain conflicting reviews);
 * - ≥2 independent approvals, or 1 school-expert + 1 adjudicator → approved;
 * - ≥1 review → reviewed;
 * - else draft.
 */
export function deriveReviewerStatus(
  reviews: readonly HuyenKhiFixtureReview[],
): HuyenKhiFixtureReviewerStatus {
  if (reviews.length === 0) return "draft";
  if (reviews.some((r) => r.decision === "disputed")) return "disputed";

  const approvals = reviews.filter((r) => r.decision === "approved");
  const independentApprovers = new Set(approvals.map((r) => r.reviewerId));
  const hasExpertPlusAdjudicator =
    approvals.some((r) => r.role === "school-expert") &&
    approvals.some((r) => r.role === "adjudicator");

  if (independentApprovers.size >= 2 || hasExpertPlusAdjudicator) {
    return "approved";
  }
  return "reviewed";
}

export interface FixtureStatusCounts {
  readonly total: number;
  readonly draft: number;
  readonly reviewed: number;
  readonly approved: number;
  readonly disputed: number;
  /** Approved excluding disputed — the promotion metric (≥30 for PR #95). */
  readonly approvedForPromotion: number;
}

export function countFixtureStatuses(
  plan: HuyenKhiExpertFixturePlan,
): FixtureStatusCounts {
  let draft = 0;
  let reviewed = 0;
  let approved = 0;
  let disputed = 0;
  for (const fixture of plan.fixtures) {
    switch (fixture.reviewerStatus) {
      case "draft":
        draft += 1;
        break;
      case "reviewed":
        reviewed += 1;
        break;
      case "approved":
        approved += 1;
        break;
      case "disputed":
        disputed += 1;
        break;
    }
  }
  return {
    total: plan.fixtures.length,
    draft,
    reviewed,
    approved,
    disputed,
    approvedForPromotion: approved, // disputed already excluded above
  };
}
