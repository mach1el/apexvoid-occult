/**
 * CLI: append an expert review to a fixture (never overwrites earlier reviews).
 *   npm run research:huyen-khi:review-fixture -- \
 *     --fixture HK-FIX-001-MAJOR-MIEU-SUPPORT \
 *     --reviewer expert-a --role school-expert --school shared \
 *     --decision reviewed --rationale "..."
 *
 * All arguments are validated (strict enums) BEFORE the review is appended.
 * Disagreement is retained (use --decision disputed); never averaged or
 * silently overwritten. Reviewer status is DERIVED from the ledger, not stored.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ONTOLOGY_DIR, ONTOLOGY_FILES } from "../paths";
import { appendFixtureReview, validateReview } from "../validate-fixture";
import type {
  HuyenKhiExpertFixture,
  HuyenKhiExpertFixturePlan,
  HuyenKhiFixtureReview,
} from "../types";

const ROLES = ["researcher", "source-reviewer", "school-expert", "adjudicator"] as const;
const SCHOOLS = ["shared", "nam-phai", "trung-chau"] as const;
const DECISIONS = ["reviewed", "approved", "disputed"] as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fail(message: string): never {
  process.stderr.write(`review-fixture: ${message}\n`);
  process.exit(1);
}

function requireArg(name: string): string {
  const value = arg(name);
  if (value === undefined || value === "") fail(`--${name} is required`);
  return value;
}

function requireEnum<T extends string>(name: string, allowed: readonly T[]): T {
  const value = requireArg(name);
  if (!(allowed as readonly string[]).includes(value)) {
    fail(`--${name} must be one of [${allowed.join(", ")}]; got '${value}'`);
  }
  return value as T;
}

function main(): void {
  const fixtureId = requireArg("fixture");
  const review: HuyenKhiFixtureReview = {
    reviewerId: requireArg("reviewer"),
    role: requireEnum("role", ROLES),
    schoolProfile: requireEnum("school", SCHOOLS),
    decision: requireEnum("decision", DECISIONS),
    rationale: requireArg("rationale"),
    reviewedAt: arg("at") ?? new Date().toISOString(),
  };

  // Validate the constructed review against the review sub-schema.
  const reviewIssues = validateReview(review);
  if (reviewIssues.length > 0) {
    fail(reviewIssues.map((i) => `${i.path}: ${i.message}`).join("; "));
  }

  const planPath = path.join(ONTOLOGY_DIR, ONTOLOGY_FILES.fixturePlan);
  const parsed: unknown = JSON.parse(readFileSync(planPath, "utf-8"));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { fixtures?: unknown }).fixtures)
  ) {
    fail("fixture plan is malformed (expected { fixtures: [...] })");
  }
  const plan = parsed as HuyenKhiExpertFixturePlan;

  const index = plan.fixtures.findIndex((f) => f.fixtureId === fixtureId);
  if (index < 0) fail(`fixture '${fixtureId}' not found`);

  const updated = appendFixtureReview(plan.fixtures[index]!, review);
  const fixtures: HuyenKhiExpertFixture[] = [...plan.fixtures];
  fixtures[index] = updated;
  const nextPlan: HuyenKhiExpertFixturePlan = { ...plan, fixtures };

  writeFileSync(planPath, `${JSON.stringify(nextPlan, null, 2)}\n`, "utf-8");
  process.stdout.write(
    `Appended ${review.decision} review by ${review.reviewerId} to ${fixtureId}. Ledger now has ${updated.reviews?.length ?? 0} review(s).\n`,
  );
}

main();
