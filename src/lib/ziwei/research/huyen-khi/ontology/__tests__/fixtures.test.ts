import { describe, expect, it } from "vitest";

import { loadHuyenKhiOntology } from "../load-ontology";
import {
  appendFixtureReview,
  countFixtureMaturity,
  countFixtureStatuses,
  deriveFixtureStatus,
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

describe("Huyền Khí ontology — expert fixtures (A1, A2, G)", () => {
  it("ships at least 30 scenario templates (36 supplied), all planned maturity", () => {
    const loaded = loadHuyenKhiOntology();
    if (!loaded.ok) throw new Error("expected load");
    const counts = countFixtureStatuses(loaded.ontology.fixturePlan);
    expect(counts.total).toBe(36);
    const maturity = countFixtureMaturity(loaded.ontology.fixturePlan);
    expect(maturity.planned).toBe(36);
  });

  it("all derived statuses are draft (no reviews yet)", () => {
    const loaded = loadHuyenKhiOntology();
    if (!loaded.ok) throw new Error("expected load");
    const counts = countFixtureStatuses(loaded.ontology.fixturePlan);
    expect(counts.draft).toBe(36);
    expect(counts.approvedForPromotion).toBe(0);
  });

  it("no fixture contains personal birth data", () => {
    const loaded = loadHuyenKhiOntology();
    if (!loaded.ok) throw new Error("expected load");
    loaded.ontology.fixturePlan.fixtures.forEach((f, index) => {
      expect(validateFixture(f, "plan", index).filter((i) => i.code === "personal-data")).toEqual([]);
    });
  });

  it("flags injected personal-chart data", () => {
    const personal = { ...fixture(), inputFacts: { solarDate: "1991-09-21" } };
    expect(validateFixture(personal, "plan", 0).some((i) => i.code === "personal-data")).toBe(true);
  });

  it("A1: a manually injected status field cannot satisfy the promotion gate", () => {
    // Schema rejects the unknown field, AND the derived count ignores it.
    const forged = { ...fixture(), reviewerStatus: "approved", maturity: "planned" as const };
    const issues = validateFixture(forged, "plan", 0);
    expect(issues.some((i) => i.code === "schema-invalid")).toBe(true);

    const loaded = loadHuyenKhiOntology();
    if (!loaded.ok) throw new Error("expected load");
    const counts = countFixtureStatuses({
      ...loaded.ontology.fixturePlan,
      fixtures: [{ ...fixture(), reviews: [] }],
    });
    expect(counts.approved).toBe(0);
    expect(counts.approvedForPromotion).toBe(0);
  });

  it("reviews append rather than overwrite", () => {
    const f2 = appendFixtureReview(appendFixtureReview(fixture(), review("expert-a", "reviewed")), review("expert-b", "reviewed"));
    expect(f2.reviews).toHaveLength(2);
    expect(deriveFixtureStatus(f2.reviews)).toBe("reviewed");
  });

  it("review order does not affect stored result", () => {
    const f0 = fixture();
    const a = appendFixtureReview(appendFixtureReview(f0, review("expert-a", "approved")), review("expert-b", "approved"));
    const b = appendFixtureReview(appendFixtureReview(f0, review("expert-b", "approved")), review("expert-a", "approved"));
    expect(a.reviews).toEqual(b.reviews);
    expect(deriveFixtureStatus(a.reviews)).toBe(deriveFixtureStatus(b.reviews));
  });

  it("disagreement is retained as disputed and excluded from approved count", () => {
    expect(deriveFixtureStatus([review("a", "approved"), review("b", "disputed")])).toBe("disputed");
    const loaded = loadHuyenKhiOntology();
    if (!loaded.ok) throw new Error("expected load");
    const disputed = appendFixtureReview(appendFixtureReview(fixture(), review("a", "approved")), review("b", "disputed"));
    const counts = countFixtureStatuses({ ...loaded.ontology.fixturePlan, fixtures: [disputed] });
    expect(counts.disputed).toBe(1);
    expect(counts.approvedForPromotion).toBe(0);
  });

  it("approval requires two INDEPENDENT approvals (not one, not the same twice)", () => {
    expect(deriveFixtureStatus([review("a", "approved")])).toBe("reviewed");
    expect(deriveFixtureStatus([review("a", "approved"), review("b", "approved")])).toBe("approved");
    expect(deriveFixtureStatus([review("a", "approved"), review("a", "approved")])).toBe("reviewed");
  });

  it("expert + adjudicator approval also promotes", () => {
    expect(
      deriveFixtureStatus([
        review("a", "approved", { role: "school-expert" }),
        review("adj", "approved", { role: "adjudicator" }),
      ]),
    ).toBe("approved");
  });

  it("A2: a review missing required fields fails validation", () => {
    const badReviewFixture = {
      ...fixture(),
      reviews: [{ reviewerId: "a", decision: "approved" }],
    };
    expect(validateFixture(badReviewFixture, "plan", 0).some((i) => i.code === "schema-invalid")).toBe(true);
  });

  it("A2: a review with an unknown enum value fails validation", () => {
    const badRole = {
      ...fixture(),
      reviews: [{ ...review("a", "approved"), role: "hacker" }],
    };
    expect(validateFixture(badRole, "plan", 0).some((i) => i.code === "schema-invalid")).toBe(true);
  });
});
