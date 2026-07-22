import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import type { BirthInput, ChartData, ChartStar } from "@/types/chart";
import { analyzeAnnualAxesNamPhaiV08 } from "../analyze";
import { matchPalaceStars } from "../match-stars";
import { isLuuThaiTueInPalace, scoreV08Domain } from "../score-domain";
import { normalizeStarIdentity } from "../star-identity";
import {
  loadAnnualAxesKnowledgeV08NamPhai,
  resetAnnualAxesKnowledgeV08NamPhaiCache,
  type AnnualAxesKnowledgeV08NamPhai,
  validateAnnualAxesKnowledgeV08NamPhai,
  exactCanonicalStarName,
  isAnnualOnlyStarName,
  inferTemporalLayerFromCanonicalName,
  exactCanonicalStarName as knowledgeNormalizer,
} from "../../../../knowledge/annual-axes/v0.8";
import { resolveAnnualPalace } from "../resolve-annual-palace";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

const loaded = loadAnnualAxesKnowledgeV08NamPhai();
if (!loaded.ok) throw new Error(loaded.issues.map((i) => i.message).join("; "));
const knowledge: AnnualAxesKnowledgeV08NamPhai = loaded.knowledge;

function withStars(chart: ChartData, palaceIndex: number, stars: ChartStar[]): ChartData {
  return {
    ...chart,
    palaces: chart.palaces.map((p) =>
      p.index === palaceIndex ? { ...p, stars: [...(p.stars ?? []), ...stars] } : p,
    ),
  };
}

function wealthPalaceIndex(chart: ChartData): number {
  const r = resolveAnnualPalace(chart, "Tài Bạch");
  if (!r.ok) throw new Error(r.reason);
  return r.palace.palaceIndex;
}

describe("V0.8 temporal identity", () => {
  it("Natal Hóa Kỵ does not match Lưu Hóa Kỵ", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    const natal = withStars(chart, idx, [{ name: "Hóa Kỵ", source: "natal-mutagen" }]);
    const matched = matchPalaceStars({
      chart: natal,
      palaceIndex: idx,
      annualPalaceName: "Tài Bạch",
      domain: "wealth",
      knowledge,
    });
    expect(matched.matchedFacts.some((f) => f.ruleId.includes("hoa-ky"))).toBe(false);
  });

  it("Natal Kình Dương does not match Lưu Kình Dương", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    const natal = withStars(chart, idx, [{ name: "Kình Dương", source: "natal" }]);
    const matched = matchPalaceStars({
      chart: natal,
      palaceIndex: idx,
      annualPalaceName: "Tài Bạch",
      domain: "wealth",
      knowledge,
    });
    expect(matched.matchedFacts.some((f) => f.ruleId.includes("kinh-duong"))).toBe(false);
  });

  it("Natal Lộc Tồn does not match Lưu Lộc Tồn", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    const natal: ChartData = {
      ...chart,
      palaces: chart.palaces.map((p) =>
        p.index === idx ? { ...p, stars: [{ name: "Lộc Tồn", source: "natal" }] } : p,
      ),
    };
    const matched = matchPalaceStars({
      chart: natal,
      palaceIndex: idx,
      annualPalaceName: "Tài Bạch",
      domain: "wealth",
      knowledge,
    });
    expect(matched.matchedFacts.some((f) => f.ruleId.includes("loc-ton"))).toBe(false);
    expect(matched.positivePoints).toBe(0);
  });

  it("Lưu Hóa Kỵ from annual source matches correctly", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    const annual = withStars(chart, idx, [{ name: "Lưu Hóa Kỵ", source: "annual-mutagen" }]);
    const matched = matchPalaceStars({
      chart: annual,
      palaceIndex: idx,
      annualPalaceName: "Tài Bạch",
      domain: "wealth",
      knowledge,
    });
    expect(matched.negativePoints).toBe(3);
    expect(matched.matchedFacts[0]?.exactMatchedStarName).toBe("Lưu Hóa Kỵ");
    expect(matched.matchedFacts[0]?.temporalLayer).toBe("annual");
  });

  it("Lưu Kình Dương from annual source matches correctly", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    const annual = withStars(chart, idx, [{ name: "Lưu Kình Dương", source: "annual" }]);
    const matched = matchPalaceStars({
      chart: annual,
      palaceIndex: idx,
      annualPalaceName: "Tài Bạch",
      domain: "wealth",
      knowledge,
    });
    expect(matched.negativePoints).toBe(2);
  });

  it("preserves Lưu prefix in exact identity", () => {
    const identity = normalizeStarIdentity({ name: "Lưu Hóa Kỵ", source: "annual-mutagen" });
    expect(identity.exactCanonicalName).toBe("Lưu Hóa Kỵ");
    expect(identity.baseCanonicalName).toBe("Hóa Kỵ");
    expect(identity.temporalLayer).toBe("annual");
  });
});

describe("V0.8 alias integrity", () => {
  it("Lưu Thiên Khôi does not match Lưu Thiên Việt", () => {
    const chart = calculateNamPhai(REGRESSION);
    const r = resolveAnnualPalace(chart, "Điền Trạch");
    if (!r.ok) throw new Error(r.reason);
    const withKhoi = withStars(chart, r.palace.palaceIndex, [
      { name: "Lưu Thiên Khôi", source: "annual" },
    ]);
    const matched = matchPalaceStars({
      chart: withKhoi,
      palaceIndex: r.palace.palaceIndex,
      annualPalaceName: "Điền Trạch",
      domain: "family",
      knowledge,
    });
    expect(matched.matchedFacts.some((f) => f.ruleId.includes("viet"))).toBe(false);
    expect(matched.matchedFacts.some((f) => f.ruleId.includes("khoi"))).toBe(true);
  });

  it("Lưu Kình Dương does not match Lưu Đà La", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    const withKinh = withStars(chart, idx, [{ name: "Lưu Kình Dương", source: "annual" }]);
    const matched = matchPalaceStars({
      chart: withKinh,
      palaceIndex: idx,
      annualPalaceName: "Tài Bạch",
      domain: "wealth",
      knowledge,
    });
    expect(matched.matchedFacts.some((f) => f.ruleId.includes("da-la"))).toBe(false);
  });

  it("Long Trì does not match Phượng Các", () => {
    const chart = calculateNamPhai(REGRESSION);
    const r = resolveAnnualPalace(chart, "Điền Trạch");
    if (!r.ok) throw new Error(r.reason);
    const withLong = withStars(chart, r.palace.palaceIndex, [
      { name: "Long Trì", source: "natal" },
    ]);
    const matched = matchPalaceStars({
      chart: withLong,
      palaceIndex: r.palace.palaceIndex,
      annualPalaceName: "Điền Trạch",
      domain: "family",
      knowledge,
    });
    expect(matched.matchedFacts.some((f) => f.ruleId.includes("phuong"))).toBe(false);
    expect(matched.matchedFacts.some((f) => f.ruleId.includes("long-tri"))).toBe(true);
  });

  it("Tam Thai does not match Bát Tọa", () => {
    const chart = calculateNamPhai(REGRESSION);
    const r = resolveAnnualPalace(chart, "Điền Trạch");
    if (!r.ok) throw new Error(r.reason);
    const withThai = withStars(chart, r.palace.palaceIndex, [
      { name: "Tam Thai", source: "natal" },
    ]);
    const matched = matchPalaceStars({
      chart: withThai,
      palaceIndex: r.palace.palaceIndex,
      annualPalaceName: "Điền Trạch",
      domain: "family",
      knowledge,
    });
    expect(matched.matchedFacts.some((f) => f.ruleId.includes("bat-toa"))).toBe(false);
  });

  it("spelling alias Lưu Khôi resolves to Lưu Thiên Khôi", () => {
    const chart = calculateNamPhai(REGRESSION);
    const r = resolveAnnualPalace(chart, "Điền Trạch");
    if (!r.ok) throw new Error(r.reason);
    const withAlias: ChartData = {
      ...chart,
      palaces: chart.palaces.map((p) =>
        p.index === r.palace.palaceIndex
          ? { ...p, stars: [{ name: "Lưu Khôi", source: "annual" }] }
          : p,
      ),
    };
    const matched = matchPalaceStars({
      chart: withAlias,
      palaceIndex: r.palace.palaceIndex,
      annualPalaceName: "Điền Trạch",
      domain: "family",
      knowledge,
    });
    expect(matched.matchedFacts).toHaveLength(1);
    expect(matched.matchedFacts[0]?.exactMatchedStarName).toBe("Lưu Thiên Khôi");
  });
});

describe("V0.8 Lưu Thái Tuế prominence", () => {
  it("bare natal Thái Tuế does not activate annual prominence", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    const withNatal = {
      ...withStars(chart, idx, [{ name: "Thái Tuế", source: "natal" }]),
      taiTuePalace: null,
    };
    expect(isLuuThaiTueInPalace(withNatal, idx)).toBe(false);
    const scored = scoreV08Domain({ chart: withNatal, domain: "wealth", knowledge });
    expect(scored.isThaiTueHighlighted).toBe(false);
  });

  it("valid Lưu Thái Tuế activates prominence exactly once and preserves direction", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    const positive = withStars(chart, idx, [
      { name: "Lưu Hóa Lộc", source: "annual-mutagen" },
      { name: "Lưu Thái Tuế", source: "annual" },
    ]);
    const withoutTai = withStars(chart, idx, [
      { name: "Lưu Hóa Lộc", source: "annual-mutagen" },
    ]);
    const withTai = scoreV08Domain({ chart: positive, domain: "wealth", knowledge });
    const base = scoreV08Domain({ chart: withoutTai, domain: "wealth", knowledge });
    expect(withTai.isThaiTueHighlighted).toBe(true);
    expect(withTai.trace.thaiTueMultiplier).toBe(1.25);
    expect(base.trace.axisRawBeforeThaiTue).toBeGreaterThan(0);
    expect(withTai.trace.prominenceAdjustedRaw).toBeCloseTo(
      base.trace.axisRawBeforeThaiTue * 1.25,
      5,
    );
  });

  it("Lưu Thái Tuế does not create direction from zero", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    // Clear wealth palace stars then add only Lưu Thái Tuế.
    const cleared: ChartData = {
      ...chart,
      palaces: chart.palaces.map((p) =>
        p.index === idx
          ? { ...p, stars: [{ name: "Lưu Thái Tuế", source: "annual" }] }
          : { ...p, stars: [] },
      ),
      taiTuePalace: null,
    };
    const scored = scoreV08Domain({ chart: cleared, domain: "wealth", knowledge });
    expect(scored.isThaiTueHighlighted).toBe(true);
    expect(scored.trace.axisRawBeforeThaiTue).toBe(0);
    expect(scored.trace.prominenceAdjustedRaw).toBe(0);
  });
});

describe("V0.8 missing-data policy", () => {
  it("missing primary palace -> unavailable without fabricated 50", () => {
    const chart = calculateNamPhai(REGRESSION);
    const broken: ChartData = {
      ...chart,
      annualHeadPalace: null,
      palaces: chart.palaces.map((p) => ({ ...p, annualPalaceName: undefined })),
    };
    const scored = scoreV08Domain({ chart: broken, domain: "wealth", knowledge });
    expect(scored.availability).toBe("unavailable");
    expect(scored.score).toBeNull();
    expect(scored.trace.absoluteScore).toBeNull();
    const result = analyzeAnnualAxesNamPhaiV08(broken);
    expect(result.axes.wealth.status).toBe("unavailable");
    expect(result.axes.wealth.score).toBeNull();
  });

  it("missing one cooperating palace -> partial-data with coverage", () => {
    const chart = calculateNamPhai(REGRESSION);
    const broken: ChartData = {
      ...chart,
      smallLimitPalace: null,
      palaces: chart.palaces.map((p) => ({ ...p, isSmallLimitPalace: false })),
    };
    const scored = scoreV08Domain({ chart: broken, domain: "health", knowledge });
    expect(scored.availability).toBe("partial-data");
    expect(scored.score).not.toBeNull();
    expect(scored.coverage.resolvedWeight).toBeCloseTo(0.8, 5);
    expect(scored.coverage.totalWeight).toBeCloseTo(1.0, 5);
    expect(scored.coverage.missingPalaces).toContain("Tiểu Hạn");
  });

  it("unique physical palace is scored once when Tiểu Hạn coincides with Lưu Mệnh", () => {
    const chart = calculateNamPhai(REGRESSION);
    const menh = resolveAnnualPalace(chart, "Mệnh");
    if (!menh.ok) throw new Error(menh.reason);
    const coinciding: ChartData = {
      ...chart,
      smallLimitPalace: chart.palaces.find((p) => p.index === menh.palace.palaceIndex) ?? null,
      palaces: chart.palaces.map((p) => ({
        ...p,
        isSmallLimitPalace: p.index === menh.palace.palaceIndex,
        stars:
          p.index === menh.palace.palaceIndex
            ? [{ name: "Lưu Hóa Khoa", source: "annual-mutagen" }]
            : p.stars,
      })),
    };
    const scored = scoreV08Domain({ chart: coinciding, domain: "health", knowledge });
    const khoaFacts = scored.matchedFacts.filter((f) => f.exactMatchedStarName === "Lưu Hóa Khoa");
    // One physical match, weight combined (0.2 + 0.2 = 0.4) on that palace contribution.
    expect(khoaFacts.length).toBe(1);
    expect(khoaFacts[0]?.palaceWeight).toBeCloseTo(0.4, 5);
  });
});

describe("V0.8 architecture contracts", () => {
  it("does not require V0.4 knowledge and reports annual-palace-name", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxesNamPhaiV08(chart);
    expect(result.versions.knowledgeVersion).toBe("0.8.0");
    expect(result.capabilities.domainAnchorCoordinate).toBe("annual-palace-name");
    for (const domain of Object.values(result.axes)) {
      if (domain.engine !== "v0.8") throw new Error("expected v0.8");
      if (domain.status === "unavailable") continue;
      expect("evidence" in domain).toBe(false);
      expect("topSupportDrivers" in domain).toBe(false);
      for (const e of domain.v08Evidence) {
        const mult = domain.scoreTrace.isThaiTueHighlighted
          ? domain.scoreTrace.thaiTueMultiplier
          : 1;
        expect(e.weightedContribution).toBeCloseTo(e.pointValue * e.palaceWeight * mult, 5);
      }
    }
  });

  it("weighted evidence ordering agrees with scoring impact", () => {
    const chart = calculateNamPhai(REGRESSION);
    const idx = wealthPalaceIndex(chart);
    const enriched = withStars(chart, idx, [
      { name: "Lưu Hóa Lộc", source: "annual-mutagen" },
      { name: "Địa Không", source: "natal" },
    ]);
    const result = analyzeAnnualAxesNamPhaiV08(enriched);
    const wealth = result.axes.wealth;
    expect(wealth.status === "available" || wealth.status === "partial-data").toBe(true);
    if (wealth.status === "unavailable" || wealth.engine !== "v0.8") return;
    const support = wealth.topSupportDriversV08;
    const pressure = wealth.topPressureDriversV08;
    if (support.length >= 2) {
      expect(Math.abs(support[0]!.weightedContribution)).toBeGreaterThanOrEqual(
        Math.abs(support[1]!.weightedContribution),
      );
    }
    if (pressure.length >= 2) {
      expect(Math.abs(pressure[0]!.weightedContribution)).toBeGreaterThanOrEqual(
        Math.abs(pressure[1]!.weightedContribution),
      );
    }
  });
});

describe("V0.8 validator mutations", () => {
  it("rejects duplicate rule ids, invalid palace, weight, polarity, and alias collisions", () => {
    resetAnnualAxesKnowledgeV08NamPhaiCache();
    const base = structuredClone(knowledge);

    const dup = structuredClone(base);
    dup.starRegistry.axes.wealth.positive.push({
      ...dup.starRegistry.axes.wealth.positive[0]!,
    });
    expect(validateAnnualAxesKnowledgeV08NamPhai(dup).ok).toBe(false);

    const badPalace = structuredClone(base);
    badPalace.domainMapping.domains.wealth.primary.palace = "Không Tồn Tại";
    expect(validateAnnualAxesKnowledgeV08NamPhai(badPalace).ok).toBe(false);

    const badWeight = structuredClone(base);
    badWeight.domainMapping.domains.wealth.primary.weight = -0.6;
    expect(validateAnnualAxesKnowledgeV08NamPhai(badWeight).ok).toBe(false);

    const badPolarity = structuredClone(base);
    badPolarity.starRegistry.axes.wealth.positive[0]!.pointClass = "annualTransformNegative";
    expect(validateAnnualAxesKnowledgeV08NamPhai(badPolarity).ok).toBe(false);

    const natalOnlyLuu = structuredClone(base);
    natalOnlyLuu.starRegistry.axes.wealth.negative[0]!.allowedTemporalLayers = ["natal"];
    expect(validateAnnualAxesKnowledgeV08NamPhai(natalOnlyLuu).ok).toBe(false);

    const aliasCollision = structuredClone(base);
    aliasCollision.starAliases.aliases.push(
      { alias: "Lưu Khôi", canonical: "Lưu Thiên Việt" },
    );
    expect(validateAnnualAxesKnowledgeV08NamPhai(aliasCollision).ok).toBe(false);

    const familyAsAlias = structuredClone(base);
    familyAsAlias.starAliases.aliases.push({
      alias: "Long Trì",
      canonical: "Phượng Các",
    });
    expect(validateAnnualAxesKnowledgeV08NamPhai(familyAsAlias).ok).toBe(false);

    const ok = validateAnnualAxesKnowledgeV08NamPhai(base);
    expect(ok.ok).toBe(true);
  });
});

describe("V0.8 annual-star capability reachability", () => {
  it("every production annual-only rule has a supported producer", () => {
    const supported = new Set(
      knowledge.starCapabilities.capabilities
        .filter((c) => c.supportStatus === "supported")
        .map((c) => c.exactStarName),
    );
    for (const domain of Object.keys(knowledge.starRegistry.axes) as Array<
      keyof typeof knowledge.starRegistry.axes
    >) {
      const axis = knowledge.starRegistry.axes[domain];
      for (const rule of [...axis.positive, ...axis.negative]) {
        if (!isAnnualOnlyStarName(exactCanonicalStarName(rule.starName))) continue;
        expect(supported.has(exactCanonicalStarName(rule.starName))).toBe(true);
      }
    }
  });

  it("unsupported annual stars cannot be active production scoring rules", () => {
    const unsupported = new Set(
      knowledge.starCapabilities.capabilities
        .filter((c) => c.supportStatus !== "supported")
        .map((c) => c.exactStarName),
    );
    expect(unsupported.has("Lưu Đại Hao")).toBe(true);
    expect(unsupported.has("Lưu Tiểu Hao")).toBe(true);
    expect(unsupported.has("Lưu Phục Binh")).toBe(true);
    expect(unsupported.has("Lưu Tuần")).toBe(true);
    expect(unsupported.has("Lưu Triệt")).toBe(true);

    for (const domain of Object.values(knowledge.starRegistry.axes)) {
      for (const rule of [...domain.positive, ...domain.negative]) {
        expect(unsupported.has(exactCanonicalStarName(rule.starName))).toBe(false);
      }
    }
  });

  it("rejects registry mutation that re-enables an unsupported annual rule", () => {
    const mutated = structuredClone(knowledge);
    mutated.starRegistry.axes.wealth.negative.push({
      starName: "Lưu Đại Hao",
      pointClass: "otherAnnualNegative",
      ruleId: "wealth-neg-luu-dai-hao-illegal",
      polarity: "negative",
      allowedTemporalLayers: ["annual"],
      provenance: {
        sourceIds: ["SRC-AA-ENG-008"],
        status: "engineering-hypothesis",
      },
    });
    expect(validateAnnualAxesKnowledgeV08NamPhai(mutated).ok).toBe(false);
  });

  it("real charts emit every supported annual scoring star across a deterministic corpus", () => {
    const productionAnnual = new Set<string>();
    for (const axis of Object.values(knowledge.starRegistry.axes)) {
      for (const rule of [...axis.positive, ...axis.negative]) {
        const exact = exactCanonicalStarName(rule.starName);
        if (isAnnualOnlyStarName(exact)) productionAnnual.add(exact);
      }
    }
    const emitted = new Set<string>();
    const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    for (const annualYear of years) {
      const chart = calculateNamPhai({ ...REGRESSION, annualYear: String(annualYear) });
      for (const palace of chart.palaces) {
        for (const star of palace.stars ?? []) {
          const identity = normalizeStarIdentity(star);
          if (
            identity.temporalLayer === "annual" &&
            productionAnnual.has(identity.exactCanonicalName)
          ) {
            emitted.add(identity.exactCanonicalName);
          }
        }
      }
    }
    for (const starName of productionAnnual) {
      expect(emitted.has(starName)).toBe(true);
    }
  });

  it("natal void/hao stars do not satisfy unsupported annual-only identities", () => {
    const chart = calculateNamPhai(REGRESSION);
    const pairs: Array<{
      natal: string;
      annual: string;
      domain: "wealth" | "career" | "romance";
    }> = [
      { natal: "Tuần", annual: "Lưu Tuần", domain: "career" },
      { natal: "Triệt", annual: "Lưu Triệt", domain: "career" },
      { natal: "Đại Hao", annual: "Lưu Đại Hao", domain: "wealth" },
      { natal: "Tiểu Hao", annual: "Lưu Tiểu Hao", domain: "wealth" },
      { natal: "Phục Binh", annual: "Lưu Phục Binh", domain: "romance" },
    ];
    for (const { natal, annual, domain } of pairs) {
      const idx =
        domain === "wealth"
          ? wealthPalaceIndex(chart)
          : (() => {
              const palaceName =
                domain === "career" ? "Quan Lộc" : "Phu Thê";
              const r = resolveAnnualPalace(chart, palaceName);
              if (!r.ok) throw new Error(r.reason);
              return r.palace.palaceIndex;
            })();
      const cleared: ChartData = {
        ...chart,
        palaces: chart.palaces.map((p) =>
          p.index === idx ? { ...p, stars: [{ name: natal, source: "natal" }] } : p,
        ),
      };
      const matched = matchPalaceStars({
        chart: cleared,
        palaceIndex: idx,
        annualPalaceName: domain === "wealth" ? "Tài Bạch" : domain === "career" ? "Quan Lộc" : "Phu Thê",
        domain,
        knowledge,
      });
      expect(matched.matchedFacts.some((f) => f.exactMatchedStarName === annual)).toBe(
        false,
      );
      expect(matched.matchedFacts.some((f) => f.starName === natal && f.temporalLayer === "annual")).toBe(
        false,
      );
    }
  });
});

describe("V0.8 annual-only temporal validation", () => {
  const annualRules = ["Lưu Hóa Kỵ", "Lưu Kình Dương", "Lưu Lộc Tồn"] as const;

  function mutateLayers(layers: string[]) {
    const mutated = structuredClone(knowledge);
    for (const starName of annualRules) {
      for (const axis of Object.values(mutated.starRegistry.axes)) {
        for (const rule of [...axis.positive, ...axis.negative]) {
          if (exactCanonicalStarName(rule.starName) === starName) {
            rule.allowedTemporalLayers = layers as typeof rule.allowedTemporalLayers;
          }
        }
      }
    }
    return mutated;
  }

  it.each([
    { layers: ["annual"], ok: true },
    { layers: ["natal"], ok: false },
    { layers: ["annual", "natal"], ok: false },
    { layers: ["annual", "unknown"], ok: false },
    { layers: ["annual", "annual"], ok: false },
    { layers: [], ok: false },
  ])("layers $layers => ok=$ok", ({ layers, ok }) => {
    const mutated = mutateLayers(layers);
    expect(validateAnnualAxesKnowledgeV08NamPhai(mutated).ok).toBe(ok);
  });
});

describe("V0.8 alias temporal integrity + shared normalizer", () => {
  it("rejects natal↔annual alias crossings and accepts valid spelling aliases", () => {
    const rejectCases = [
      { alias: "Hóa Kỵ", canonical: "Lưu Hóa Kỵ" },
      { alias: "Lưu Hóa Kỵ", canonical: "Hóa Kỵ" },
      { alias: "Kình Dương", canonical: "Lưu Kình Dương" },
      { alias: "Lưu Thiên Việt", canonical: "Thiên Việt" },
    ];
    for (const entry of rejectCases) {
      const mutated = structuredClone(knowledge);
      mutated.starAliases.aliases.push(entry);
      expect(validateAnnualAxesKnowledgeV08NamPhai(mutated).ok).toBe(false);
    }

    expect(exactCanonicalStarName("Hoá Kỵ")).toBe("Hóa Kỵ");
    expect(exactCanonicalStarName("Lưu Hoá Kỵ")).toBe("Lưu Hóa Kỵ");
    expect(exactCanonicalStarName("Lưu Khôi")).toBe("Lưu Thiên Khôi");
    expect(exactCanonicalStarName("Thiên Khôi (Lưu)")).toBe("Lưu Thiên Khôi");
    expect(exactCanonicalStarName("Tả Phụ")).toBe("Tả Phù");
    expect(inferTemporalLayerFromCanonicalName("Lưu Hà")).toBe("non-annual");
    expect(isAnnualOnlyStarName("Lưu Hà")).toBe(false);
  });

  it("runtime and validator normalizers agree on every alias catalog entry", () => {
    for (const entry of knowledge.starAliases.aliases) {
      expect(exactCanonicalStarName(entry.alias)).toBe(exactCanonicalStarName(entry.canonical));
      expect(exactCanonicalStarName(entry.alias)).toBe(
        knowledgeNormalizer(entry.alias),
      );
    }
  });
});

describe("V0.8 provenance and source registry", () => {
  it("rejects missing provenance, unknown sources, duplicates, and classical/engineering contradiction", () => {
    const missingProv = structuredClone(knowledge);
    delete missingProv.starRegistry.axes.wealth.positive[0]!.provenance;
    expect(validateAnnualAxesKnowledgeV08NamPhai(missingProv).ok).toBe(false);

    const missingStatus = structuredClone(knowledge);
    // @ts-expect-error intentional missing status
    delete missingStatus.starRegistry.axes.wealth.positive[0]!.provenance!.status;
    expect(validateAnnualAxesKnowledgeV08NamPhai(missingStatus).ok).toBe(false);

    const missingClaimStatus = structuredClone(knowledge);
    // @ts-expect-error intentional missing status
    delete missingClaimStatus.sourceRegistry.claims[0]!.status;
    expect(validateAnnualAxesKnowledgeV08NamPhai(missingClaimStatus).ok).toBe(false);

    const emptyProv = structuredClone(knowledge);
    emptyProv.starRegistry.axes.wealth.positive[0]!.provenance = {
      sourceIds: [],
      status: "engineering-hypothesis",
    };
    expect(validateAnnualAxesKnowledgeV08NamPhai(emptyProv).ok).toBe(false);

    const unknownSrc = structuredClone(knowledge);
    unknownSrc.starRegistry.axes.wealth.positive[0]!.provenance = {
      sourceIds: ["SRC-DOES-NOT-EXIST"],
      status: "engineering-hypothesis",
    };
    expect(validateAnnualAxesKnowledgeV08NamPhai(unknownSrc).ok).toBe(false);

    const classicalRuleOnEng = structuredClone(knowledge);
    classicalRuleOnEng.starRegistry.axes.wealth.positive[0]!.provenance = {
      sourceIds: ["SRC-AA-ENG-008"],
      status: "classical",
    };
    expect(validateAnnualAxesKnowledgeV08NamPhai(classicalRuleOnEng).ok).toBe(false);

    const classicalRuleOnCore = structuredClone(knowledge);
    classicalRuleOnCore.starRegistry.axes.wealth.positive[0]!.provenance = {
      sourceIds: ["SRC-AA-CORE-001"],
      status: "classical",
    };
    expect(validateAnnualAxesKnowledgeV08NamPhai(classicalRuleOnCore).ok).toBe(false);

    const derivedNoRationale = structuredClone(knowledge);
    derivedNoRationale.starRegistry.axes.wealth.positive[0]!.provenance = {
      sourceIds: ["SRC-AA-ENG-008"],
      status: "derived",
    };
    expect(validateAnnualAxesKnowledgeV08NamPhai(derivedNoRationale).ok).toBe(false);

    const derivedOk = structuredClone(knowledge);
    derivedOk.starRegistry.axes.wealth.positive[0]!.provenance = {
      sourceIds: ["SRC-AA-ENG-008"],
      status: "derived",
      rationale: "Derived from engineering palace-weight policy.",
    };
    expect(validateAnnualAxesKnowledgeV08NamPhai(derivedOk).ok).toBe(true);

    const engOk = structuredClone(knowledge);
    expect(validateAnnualAxesKnowledgeV08NamPhai(engOk).ok).toBe(true);

    const dupSource = structuredClone(knowledge);
    dupSource.sourceRegistry.sources.push({ ...dupSource.sourceRegistry.sources[0]! });
    expect(validateAnnualAxesKnowledgeV08NamPhai(dupSource).ok).toBe(false);

    const dupClaim = structuredClone(knowledge);
    dupClaim.sourceRegistry.claims.push({ ...dupClaim.sourceRegistry.claims[0]! });
    expect(validateAnnualAxesKnowledgeV08NamPhai(dupClaim).ok).toBe(false);

    const unknownClaimSrc = structuredClone(knowledge);
    unknownClaimSrc.sourceRegistry.claims[0]!.sourceId = "SRC-MISSING";
    expect(validateAnnualAxesKnowledgeV08NamPhai(unknownClaimSrc).ok).toBe(false);

    const classicalOnEng = structuredClone(knowledge);
    classicalOnEng.sourceRegistry.claims.push({
      claimId: "CLM-BAD-CLASSICAL",
      sourceId: "SRC-AA-ENG-008",
      summary: "Pretend classical",
      confidence: "high",
      status: "classical",
    });
    expect(validateAnnualAxesKnowledgeV08NamPhai(classicalOnEng).ok).toBe(false);

    const claim804 = knowledge.sourceRegistry.claims.find((c) => c.claimId === "CLM-AA-ENG-804");
    expect(claim804?.status).toBe("engineering-hypothesis");
  });
});

describe("V0.8 score-band validation", () => {
  it("ordered bands pass; swapped/overlap/gap/dup/unknown/missing bounds fail", () => {
    expect(validateAnnualAxesKnowledgeV08NamPhai(structuredClone(knowledge)).ok).toBe(true);

    const swapFirst = structuredClone(knowledge);
    const b0 = swapFirst.scoreBands.bands[0]!;
    swapFirst.scoreBands.bands[0] = swapFirst.scoreBands.bands[1]!;
    swapFirst.scoreBands.bands[1] = b0;
    expect(validateAnnualAxesKnowledgeV08NamPhai(swapFirst).ok).toBe(false);

    const swapLast = structuredClone(knowledge);
    const last = swapLast.scoreBands.bands.length - 1;
    const tmp = swapLast.scoreBands.bands[last]!;
    swapLast.scoreBands.bands[last] = swapLast.scoreBands.bands[last - 1]!;
    swapLast.scoreBands.bands[last - 1] = tmp;
    expect(validateAnnualAxesKnowledgeV08NamPhai(swapLast).ok).toBe(false);

    const overlap = structuredClone(knowledge);
    overlap.scoreBands.bands[1]!.minInclusive = 40;
    expect(validateAnnualAxesKnowledgeV08NamPhai(overlap).ok).toBe(false);

    const gap = structuredClone(knowledge);
    gap.scoreBands.bands[1]!.minInclusive = 55;
    expect(validateAnnualAxesKnowledgeV08NamPhai(gap).ok).toBe(false);

    const dupId = structuredClone(knowledge);
    dupId.scoreBands.bands[2]!.id = "guarded";
    expect(validateAnnualAxesKnowledgeV08NamPhai(dupId).ok).toBe(false);

    const unknownId = structuredClone(knowledge);
    unknownId.scoreBands.bands[0]!.id = "mystery";
    expect(validateAnnualAxesKnowledgeV08NamPhai(unknownId).ok).toBe(false);

    const missing10 = structuredClone(knowledge);
    missing10.scoreBands.bands[0]!.minInclusive = 11;
    expect(validateAnnualAxesKnowledgeV08NamPhai(missing10).ok).toBe(false);

    const missing90 = structuredClone(knowledge);
    const lastBand = missing90.scoreBands.bands[missing90.scoreBands.bands.length - 1]!;
    lastBand.maxInclusive = 89;
    delete lastBand.maxExclusive;
    expect(validateAnnualAxesKnowledgeV08NamPhai(missing90).ok).toBe(false);
  });
});

describe("V0.8 mapping logical uniqueness", () => {
  it("rejects duplicate roles and duplicate logical palace inputs", () => {
    const dupRole = structuredClone(knowledge);
    dupRole.domainMapping.domains.wealth.cooperating[0]!.role = "primary";
    dupRole.domainMapping.domains.wealth.primary.role = "primary";
    expect(validateAnnualAxesKnowledgeV08NamPhai(dupRole).ok).toBe(false);

    const samePalaceDiffRoles = structuredClone(knowledge);
    samePalaceDiffRoles.domainMapping.domains.wealth.cooperating[0]!.palace = "Tài Bạch";
    samePalaceDiffRoles.domainMapping.domains.wealth.cooperating[0]!.role = "coop-a";
    expect(validateAnnualAxesKnowledgeV08NamPhai(samePalaceDiffRoles).ok).toBe(false);

    const dupSmall = structuredClone(knowledge);
    dupSmall.domainMapping.domains.health.cooperating.push({
      type: "small-limit-palace",
      weight: 0.1,
      role: "small-limit-extra",
    });
    // Fix weights so weight-sum isn't the only failure mode.
    dupSmall.domainMapping.domains.health.cooperating[0]!.weight = 0.1;
    dupSmall.domainMapping.domains.health.cooperating[1]!.weight = 0.2;
    expect(validateAnnualAxesKnowledgeV08NamPhai(dupSmall).ok).toBe(false);

    expect(validateAnnualAxesKnowledgeV08NamPhai(structuredClone(knowledge)).ok).toBe(true);
  });

  it("runtime physical collision still combines weights", () => {
    const chart = calculateNamPhai(REGRESSION);
    const menh = resolveAnnualPalace(chart, "Mệnh");
    if (!menh.ok) throw new Error(menh.reason);
    const coinciding: ChartData = {
      ...chart,
      smallLimitPalace: chart.palaces.find((p) => p.index === menh.palace.palaceIndex) ?? null,
      palaces: chart.palaces.map((p) => ({
        ...p,
        isSmallLimitPalace: p.index === menh.palace.palaceIndex,
      })),
    };
    const scored = scoreV08Domain({ chart: coinciding, domain: "health", knowledge });
    const shared = [scored.trace.primary, ...scored.trace.cooperating].filter(
      (t) => t.palaceIndex === menh.palace.palaceIndex,
    );
    expect(shared.length).toBeGreaterThanOrEqual(2);
    const combined = shared.reduce((s, t) => s + t.configuredWeight, 0);
    expect(combined).toBeCloseTo(0.4, 5);
  });
});

describe("V0.8 alias duplicate entries", () => {
  it("rejects exact duplicate aliases and chains", () => {
    const exactDup = structuredClone(knowledge);
    exactDup.starAliases.aliases.push({
      alias: "Lưu Khôi",
      canonical: "Lưu Thiên Khôi",
    });
    expect(validateAnnualAxesKnowledgeV08NamPhai(exactDup).ok).toBe(false);

    const chain = structuredClone(knowledge);
    chain.starAliases.aliases.push({ alias: "Hóa Kỵ", canonical: "Hoá Kỵ" });
    expect(validateAnnualAxesKnowledgeV08NamPhai(chain).ok).toBe(false);
  });
});

describe("V0.8 capability invariants", () => {
  it("enforces producer/source rules by supportStatus", () => {
    const noProducer = structuredClone(knowledge);
    const supported = noProducer.starCapabilities.capabilities.find(
      (c) => c.supportStatus === "supported",
    )!;
    delete supported.producer;
    expect(validateAnnualAxesKnowledgeV08NamPhai(noProducer).ok).toBe(false);

    const unsupportedWithProducer = structuredClone(knowledge);
    const unsupported = unsupportedWithProducer.starCapabilities.capabilities.find(
      (c) => c.supportStatus === "unsupported",
    )!;
    unsupported.producer = "fake-producer";
    expect(validateAnnualAxesKnowledgeV08NamPhai(unsupportedWithProducer).ok).toBe(false);

    const emptySrc = structuredClone(knowledge);
    emptySrc.starCapabilities.capabilities[0]!.sourceIds = [];
    expect(validateAnnualAxesKnowledgeV08NamPhai(emptySrc).ok).toBe(false);

    expect(validateAnnualAxesKnowledgeV08NamPhai(structuredClone(knowledge)).ok).toBe(true);
  });
});

describe("V0.8 CI path coverage for fixtures", () => {
  it("deploy workflow includes research V0.8 fixture paths", () => {
    const yaml = readFileSync(
      join(process.cwd(), ".github/workflows/deploy.yml"),
      "utf8",
    );
    expect(yaml).toContain("research/annual-axes/distribution/v0.8/**");
    expect(yaml).toContain("github.event.pull_request.base.sha");
    expect(yaml).toContain("git show --check");
  });
});

describe("V0.8 evidence/trace reconstructability", () => {
  it("reconstructs axisRaw and weightedContribution from unique physical palaces", () => {
    const chart = calculateNamPhai(REGRESSION);
    const scored = scoreV08Domain({ chart, domain: "health", knowledge });
    expect(scored.availability).not.toBe("unavailable");

    // Reconstruct from unique palace contributions via rolesSharingPalace grouping.
    const byPalace = new Map<number, { palaceRaw: number; weight: number }>();
    const traces = [scored.trace.primary, ...scored.trace.cooperating].filter(
      (t) => t.palaceIndex != null && !t.missingReason,
    );
    for (const t of traces) {
      const idx = t.palaceIndex!;
      if (byPalace.has(idx)) continue;
      const combinedWeight = traces
        .filter((x) => x.palaceIndex === idx)
        .reduce((s, x) => s + x.configuredWeight, 0);
      byPalace.set(idx, { palaceRaw: t.palaceRaw, weight: combinedWeight });
    }
    const reconstructed = [...byPalace.values()].reduce(
      (s, p) => s + p.palaceRaw * p.weight,
      0,
    );
    expect(reconstructed).toBeCloseTo(scored.trace.axisRawBeforeThaiTue, 8);

    const mult = scored.isThaiTueHighlighted ? scored.trace.thaiTueMultiplier : 1;
    for (const fact of scored.matchedFacts) {
      expect(fact.weightedContribution).toBeCloseTo(
        fact.points * fact.palaceWeight * (fact.thaiTueProminenceApplied ? mult : 1),
        8,
      );
    }
  });
});
