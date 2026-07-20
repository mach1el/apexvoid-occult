/**
 * CLI: append an expert review to a fixture (never overwrites earlier reviews).
 *   npm run research:huyen-khi:review-fixture -- \
 *     --fixture HK-FIX-001-MAJOR-MIEU-SUPPORT \
 *     --reviewer expert-a --role school-expert --school shared \
 *     --decision reviewed --rationale "..."
 *
 * Writes the updated plan back to disk. Disagreement is retained (use
 * --decision disputed); it is never averaged or silently overwritten.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ONTOLOGY_DIR, ONTOLOGY_FILES } from "../paths";
import { appendFixtureReview } from "../validate-fixture";
import type {
  HuyenKhiExpertFixture,
  HuyenKhiExpertFixturePlan,
  HuyenKhiFixtureReview,
  HuyenKhiFixtureReviewerStatus,
  HuyenKhiReviewRole,
  HuyenKhiSchoolProfile,
} from "../types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fail(message: string): never {
  process.stderr.write(`review-fixture: ${message}\n`);
  process.exit(1);
}

function main(): void {
  const fixtureId = arg("fixture") ?? fail("--fixture is required");
  const reviewerId = arg("reviewer") ?? fail("--reviewer is required");
  const role = (arg("role") ?? "school-expert") as HuyenKhiReviewRole;
  const schoolProfile = (arg("school") ?? fail("--school is required")) as HuyenKhiSchoolProfile;
  const decision = (arg("decision") ?? "reviewed") as HuyenKhiFixtureReviewerStatus;
  const rationale = arg("rationale") ?? fail("--rationale is required");
  const reviewedAt = arg("at") ?? new Date().toISOString();

  const planPath = path.join(ONTOLOGY_DIR, ONTOLOGY_FILES.fixturePlan);
  const plan = JSON.parse(readFileSync(planPath, "utf-8")) as HuyenKhiExpertFixturePlan;

  const index = plan.fixtures.findIndex((f) => f.fixtureId === fixtureId);
  if (index < 0) fail(`fixture '${fixtureId}' not found`);

  const review: HuyenKhiFixtureReview = {
    reviewerId,
    role,
    schoolProfile,
    decision,
    rationale,
    reviewedAt,
  };

  const updated = appendFixtureReview(plan.fixtures[index]!, review);
  const fixtures: HuyenKhiExpertFixture[] = [...plan.fixtures];
  fixtures[index] = updated;
  const nextPlan: HuyenKhiExpertFixturePlan = { ...plan, fixtures };

  writeFileSync(planPath, `${JSON.stringify(nextPlan, null, 2)}\n`, "utf-8");
  process.stdout.write(
    `Appended ${decision} review by ${reviewerId} to ${fixtureId}. New status: ${updated.reviewerStatus}.\n`,
  );
}

main();
