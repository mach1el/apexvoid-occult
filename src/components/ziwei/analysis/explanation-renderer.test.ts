import { describe, expect, it } from "vitest";
import { loadPalaceOverviewKnowledgeV1 } from "@/lib/ziwei/analysis/knowledge";
import { formatContribution, renderExplanationKey } from "./explanation-renderer";

describe("renderExplanationKey — minor-star family fallback", () => {
  it("resolves every real catalog minor-star explanationKey to a described label, not the bare fallback", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const scored = loaded.knowledge.minorStars.stars.filter(
      (s) => s.scoringMode === "direct",
    );
    expect(scored.length).toBeGreaterThan(0);

    for (const star of scored) {
      const rendered = renderExplanationKey(star.explanationKey, star.canonicalName);
      expect(rendered).not.toBe(star.canonicalName);
      expect(rendered).toContain("·");
    }
  });

  it("falls back to the raw label for an unknown key shape", () => {
    expect(renderExplanationKey("minor.no-such-family.foo", "Sao Lạ")).toBe("Sao Lạ");
    expect(renderExplanationKey("totally.unknown", "Sao Lạ")).toBe("Sao Lạ");
  });

  it("keeps existing major./chang-sheng./LABELS behavior untouched", () => {
    expect(renderExplanationKey("major.Tử Vi", "x")).toBe("Chính tinh Tử Vi");
    expect(renderExplanationKey("chang-sheng.Trường Sinh", "x")).toBe(
      "Trường Sinh · Trường Sinh",
    );
    expect(renderExplanationKey("void.local-attenuation", "x")).toBe(
      "Suy giảm cục bộ Tuần/Triệt",
    );
  });
});

describe("formatContribution", () => {
  it("formats each non-negligible axis with sign and localized label", () => {
    expect(
      formatContribution({ support: 1.2, pressure: 0, stability: -0.8, activation: 0 }),
    ).toBe("+1.2 hỗ trợ, −0.8 ổn định");
  });

  it("returns an em dash when every axis is negligible", () => {
    expect(
      formatContribution({ support: 0.01, pressure: 0, stability: 0, activation: -0.02 }),
    ).toBe("—");
  });
});
