import { describe, expect, it } from "vitest";
import {
  loadPalaceOverviewKnowledgeV1,
  resetPalaceOverviewKnowledgeCache,
  validatePalaceOverviewKnowledge,
} from "../index";

describe("palace-overview knowledge v1", () => {
  it("loads and validates experimental catalogs", () => {
    resetPalaceOverviewKnowledgeCache();
    const result = loadPalaceOverviewKnowledgeV1();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.knowledge.profile.id).toBe("palace-overview-v1");
    expect(result.knowledge.profile.version).toBe("1.1.0-experimental");
    expect(result.knowledge.majorStars.stars).toHaveLength(14);
    expect(result.knowledge.structuralRules.rules).toHaveLength(3);
    const validation = validatePalaceOverviewKnowledge(result.knowledge);
    expect(validation.ok).toBe(true);
  });

  it("loads the V1.1 minor-star catalog (92 records, 18 families)", () => {
    resetPalaceOverviewKnowledgeCache();
    const result = loadPalaceOverviewKnowledgeV1();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.knowledge.minorStars.stars).toHaveLength(92);
    expect(result.knowledge.minorFamilies.families).toHaveLength(18);

    const contextOnly = result.knowledge.minorStars.stars.filter(
      (s) => s.scoringMode === "context-only",
    );
    expect(contextOnly).toHaveLength(3);
    expect(contextOnly.map((s) => s.canonicalName).sort()).toEqual(
      ["Phàn An", "Tức Thần", "Đẩu Quân"].sort(),
    );

    const trungChauOnly = result.knowledge.minorStars.stars.filter(
      (s) =>
        s.schoolProfiles.length === 1 &&
        s.schoolProfiles[0] === "trung-chau-v1",
    );
    expect(trungChauOnly).toHaveLength(13);

    // No family should still embed direct star membership after the V1.1 split.
    for (const family of result.knowledge.minorFamilies.families) {
      expect((family as unknown as Record<string, unknown>).starNames).toBeUndefined();
    }
  });

  it("rejects a duplicate minor-star record id", () => {
    resetPalaceOverviewKnowledgeCache();
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const mutated = {
      ...loaded.knowledge,
      minorStars: {
        ...loaded.knowledge.minorStars,
        stars: loaded.knowledge.minorStars.stars.map((s, i) =>
          i === 1 ? { ...s, id: loaded.knowledge.minorStars.stars[0]!.id } : s,
        ),
      },
    };
    const validation = validatePalaceOverviewKnowledge(mutated);
    expect(validation.ok).toBe(false);
    expect(
      validation.issues.some((i) => i.message.includes("duplicate minor-star record id")),
    ).toBe(true);
  });
});
