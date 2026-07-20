import { describe, expect, it } from "vitest";

import { loadHuyenKhiOntology } from "../load-ontology";
import {
  appendFixtureReview,
  countFixtureStatuses,
  deriveReviewerStatus,
  validateFixture,
} from "../validate-fixture";
import type {
  HuyenKhiExpertFixture,
  HuyenKhiFixtureReview,
} from "../types";

function fixture(): HuyenKhiExpertFixture {
  const loaded = loadHuyenKhiOntology();
  if (!loaded.ok) throw new Error("expected load");
  return loaded.ontology.fixturePlan.fixtures[0]!;
}

function review(
  reviewerId: string,
  decision: HuyenKhiFixtureReview["decision"],
  extra: Partial<HuyenKhiFixtureReview> = {},
): HuyenKhiFixtureReview {
  return {
    reviewerId,
    role: "school-expert",
    schoolProfile: "shared",
    decision,
    rationale: "test",
    reviewedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

describe("Huyền Khí ontology — expert fixtures (§9, §14)", () => {
  it("ships at least 30 scenarios (36 supplied)", () => {
    const loaded = loadHuyenKhiOntology();
    if (!loaded.ok) throw new Error("expected load");
    const counts = countFixtureStatuses(loaded.ontology.fixturePlan);
    expect(counts.total).toBe(36);
    expect(counts.total).toBeGreaterThanOrEqual(30);
  });

  it("no fixture contains personal birth data", () => {
    const loaded = loadHuyenKhiOntology();
    if (!loaded.ok) throw new Error("expected load");
    loaded.ontology.fixturePlan.fixtures.forEach((f, index) => {
      const issues = validateFixture(f, "plan", index).filter((i) => i.code === "personal-data");
      expect(issues).toEqual([]);
    });
  });

  it("flags injected personal-chart data (guard is real)", () => {
    const personal = { ...fixture(), inputFacts: { solarDate: "1991-09-21" } };
    const issues = validateFixture(personal, "plan", 0);
    expect(issues.some((i) => i.code === "personal-data")).toBe(true);
  });

  it("reviews append rather than overwrite", () => {
    const f0 = fixture();
    const f1 = appendFixtureReview(f0, review("expert-a", "reviewed"));
    const f2 = appendFixtureReview(f1, review("expert-b", "reviewed"));
    expect(f2.reviews).toHaveLength(2);
    expect(f2.reviews!.map((r) => r.reviewerId).sort()).toEqual(["expert-a", "expert-b"]);
  });

  it("review order does not affect stored result", () => {
    const f0 = fixture();
    const a = appendFixtureReview(appendFixtureReview(f0, review("expert-a", "approved")), review("expert-b", "approved"));
    const b = appendFixtureReview(appendFixtureReview(f0, review("expert-b", "approved")), review("expert-a", "approved"));
    expect(a.reviews).toEqual(b.reviews);
    expect(a.reviewerStatus).toBe(b.reviewerStatus);
  });

  it("disagreement is retained as disputed and excluded from approved count", () => {
    const status = deriveReviewerStatus([
      review("expert-a", "approved"),
      review("expert-b", "disputed"),
    ]);
    expect(status).toBe("disputed");

    const loaded = loadHuyenKhiOntology();
    if (!loaded.ok) throw new Error("expected load");
    // Build a plan with one disputed fixture; it must not count as approved.
    const disputed = { ...fixture(), reviewerStatus: "disputed" as const };
    const counts = countFixtureStatuses({
      ...loaded.ontology.fixturePlan,
      fixtures: [disputed],
    });
    expect(counts.disputed).toBe(1);
    expect(counts.approvedForPromotion).toBe(0);
  });

  it("approval requires two independent approvals (not one)", () => {
    expect(deriveReviewerStatus([review("expert-a", "approved")])).toBe("reviewed");
    expect(
      deriveReviewerStatus([review("expert-a", "approved"), review("expert-b", "approved")]),
    ).toBe("approved");
    // Two approvals from the SAME reviewer do not count as independent.
    expect(
      deriveReviewerStatus([review("expert-a", "approved"), review("expert-a", "approved")]),
    ).toBe("reviewed");
  });

  it("expert + adjudicator approval also promotes", () => {
    expect(
      deriveReviewerStatus([
        review("expert-a", "approved", { role: "school-expert" }),
        review("adj-1", "approved", { role: "adjudicator" }),
      ]),
    ).toBe("approved");
  });
});
