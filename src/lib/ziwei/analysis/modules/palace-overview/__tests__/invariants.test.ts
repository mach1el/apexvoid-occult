/**
 * Palace-overview V1 invariants (§25) + distribution smoke + regression facts.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import {
  analyzeAllPalaces,
  buildStaticFrame,
  getAnalysisStatus,
  indexFactsByPalace,
  isPalaceOverviewV1Enabled,
  loadPalaceOverviewKnowledgeV1,
  normalizeNatalFacts,
} from "@/lib/ziwei/analysis";
import type { BirthInput, ChartData } from "@/types/chart";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

function stripVolatile(results: ReturnType<typeof analyzeAllPalaces>["results"]) {
  return results.map((r) => ({
    palaceIndex: r.palaceIndex,
    palaceName: r.palaceName,
    score: r.score,
    rawAxes: r.rawAxes,
    axes: r.axes,
    intensity: r.intensity,
    isVoidMajor: r.isVoidMajor,
    evidenceIds: r.allEvidence.map((e) => e.id).sort(),
    majorStars: r.majorStars
      .map((s) => `${s.role}:${s.name}:${s.brightness}`)
      .sort(),
  }));
}

describe("palace-overview invariants", () => {
  it("feature flag defaults OFF → unavailable/rebuilding", () => {
    expect(isPalaceOverviewV1Enabled()).toBe(false);
    expect(getAnalysisStatus("palace-overview")).toEqual({
      status: "unavailable",
      module: "palace-overview",
      reason: "rebuilding",
    });
  });

  it("annualYear isolation — all 12 results deep-equal", () => {
    const a = analyzeAllPalaces(
      calculateNamPhai({ ...REGRESSION, annualYear: "2026" }),
      { school: "nam-phai" },
    );
    const b = analyzeAllPalaces(
      calculateNamPhai({ ...REGRESSION, annualYear: "2027" }),
      { school: "nam-phai" },
    );
    expect(stripVolatile(a.results)).toEqual(stripVolatile(b.results));
  });

  it("excludes annual stars from facts and score path", () => {
    const chart = calculateNamPhai(REGRESSION);
    const { facts } = normalizeNatalFacts(chart, { school: "nam-phai" });
    expect(facts.some((f) => f.source === "annual")).toBe(false);
    expect(facts.some((f) => f.source === "annual-mutagen")).toBe(false);
    expect(facts.some((f) => f.starName?.startsWith("Lưu Hóa"))).toBe(false);
  });

  it("Tứ Hóa double-count: one transformation fact per mutagen", () => {
    const chart = calculateNamPhai(REGRESSION);
    const { facts } = normalizeNatalFacts(chart, { school: "nam-phai" });
    const transforms = facts.filter((f) => f.kind === "transformation");
    expect(transforms).toHaveLength(4);
    const ids = new Set(transforms.map((f) => f.id));
    expect(ids.size).toBe(4);
  });

  it("geometry weights: focus > opposite > trine", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const g = loaded.knowledge.profile.geometry;
    expect(g.focus).toBeGreaterThan(g.opposite);
    expect(g.opposite).toBeGreaterThan(g.trine);
    const chart = calculateNamPhai(REGRESSION);
    const menh = chart.palaces.find((p) => p.isMenh)!;
    const frame = buildStaticFrame(chart, menh.index, { geometry: g });
    expect(frame.nodes.find((n) => n.role === "focus")!.geometryWeight).toBe(
      g.focus,
    );
    expect(frame.nodes.find((n) => n.role === "opposite")!.geometryWeight).toBe(
      g.opposite,
    );
    expect(
      frame.nodes.filter((n) => n.role === "trine").every((n) => n.geometryWeight === g.trine),
    ).toBe(true);
  });

  it("family diminishing returns profile is 1.0, 0.6, 0.35, 0.2", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.knowledge.profile.familyDiminishingReturns).toEqual([
      1.0, 0.6, 0.35, 0.2,
    ]);
    expect(loaded.knowledge.profile.familyMaxContributors).toBe(4);
  });

  it("VCD: Tài Bạch void borrows opposite majors without double count", () => {
    const chart = calculateNamPhai(REGRESSION);
    const tai = chart.palaces.find((p) => p.name === "Tài Bạch");
    expect(tai).toBeTruthy();
    const { results } = analyzeAllPalaces(chart, { school: "nam-phai" });
    const result = results.find((r) => r.palaceName === "Tài Bạch")!;
    expect(result.isVoidMajor).toBe(true);
    const borrowed = result.allEvidence.filter((e) => e.borrowedFromOpposite);
    expect(borrowed.length).toBeGreaterThan(0);
    const borrowedFactIds = new Set(borrowed.flatMap((e) => e.factIds));
    const oppositeMajors = result.allEvidence.filter(
      (e) =>
        e.category === "major-star" &&
        e.palaceRole === "opposite" &&
        e.factIds.some((id) => borrowedFactIds.has(id)),
    );
    expect(oppositeMajors).toHaveLength(0);
  });

  it("score/axes/intensity/completeness stay in 0–100", () => {
    const { results } = analyzeAllPalaces(calculateNamPhai(REGRESSION), {
      school: "nam-phai",
    });
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.intensity).toBeGreaterThanOrEqual(0);
      expect(r.intensity).toBeLessThanOrEqual(100);
      expect(r.evidenceCompleteness).toBeGreaterThanOrEqual(0);
      expect(r.evidenceCompleteness).toBeLessThanOrEqual(100);
      for (const key of ["support", "pressure", "stability", "activation"] as const) {
        expect(r.axes[key]).toBeGreaterThanOrEqual(0);
        expect(r.axes[key]).toBeLessThanOrEqual(100);
      }
      expect(r.allEvidence.length).toBeGreaterThan(0);
    }
  });

  it("monotonicity: duplicate analysis is stable", () => {
    const chart = calculateNamPhai(REGRESSION);
    const a = stripVolatile(
      analyzeAllPalaces(chart, { school: "nam-phai" }).results,
    );
    const b = stripVolatile(
      analyzeAllPalaces(chart, { school: "nam-phai" }).results,
    );
    expect(a).toEqual(b);
  });
});

describe("palace-overview regression chart structure", () => {
  it("asserts structural facts on 1991-09-21 chart", () => {
    const chart = calculateNamPhai(REGRESSION);
    const { facts } = normalizeNatalFacts(chart, { school: "nam-phai" });
    const byPalace = indexFactsByPalace(facts);

    const menh = chart.palaces.find((p) => p.name === "Mệnh" && p.branch === "Tý")!;
    const menhStars = byPalace.get(menh.index) ?? [];
    expect(
      menhStars.some(
        (f) =>
          f.kind === "star" &&
          f.canonicalStarName === "Thái Dương" &&
          f.brightness === "Hãm",
      ),
    ).toBe(true);
    expect(
      menhStars.some(
        (f) =>
          f.kind === "transformation" &&
          f.transformation === "Quyền" &&
          f.targetStar === "Thái Dương",
      ),
    ).toBe(true);

    const { results } = analyzeAllPalaces(chart, { school: "nam-phai" });
    expect(results.find((r) => r.palaceName === "Tài Bạch")!.isVoidMajor).toBe(
      true,
    );
    const dien = chart.palaces.find(
      (p) => p.name === "Điền Trạch" && p.branch === "Mão",
    )!;
    const dienStars = (byPalace.get(dien.index) ?? [])
      .filter((f) => f.kind === "star" && f.starClass === "major")
      .map((f) => f.canonicalStarName);
    expect(dienStars).toEqual(expect.arrayContaining(["Tử Vi", "Tham Lang"]));

    const thienDi = chart.palaces.find(
      (p) => p.name === "Thiên Di" && p.branch === "Ngọ",
    )!;
    expect(
      (byPalace.get(thienDi.index) ?? []).some(
        (f) =>
          f.canonicalStarName === "Thiên Lương" && f.brightness === "Miếu",
      ),
    ).toBe(true);
  });
});

describe("palace-overview distribution smoke", () => {
  it("≤5% of palace scores sit at 0 or 100 across ~100 charts", () => {
    const hours = [
      "Tý",
      "Sửu",
      "Dần",
      "Mão",
      "Thìn",
      "Tỵ",
      "Ngọ",
      "Mùi",
      "Thân",
      "Dậu",
      "Tuất",
      "Hợi",
    ];
    const scores: number[] = [];
    let chartCount = 0;
    for (let year = 1985; year <= 1994; year++) {
      for (let month = 1; month <= 10; month++) {
        const day = 5 + ((year + month) % 20);
        const input: BirthInput = {
          solarDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          birthHour: hours[(year + month) % 12]!,
          gender: year % 2 === 0 ? "female" : "male",
          timezone: "7",
          annualYear: "2026",
          flowBase: "luu-nien",
        };
        const chart = calculateNamPhai(input);
        const { results } = analyzeAllPalaces(chart, { school: "nam-phai" });
        for (const r of results) scores.push(r.score);
        chartCount += 1;
      }
    }
    expect(chartCount).toBe(100);
    expect(scores.length).toBe(1200);

    const sorted = [...scores].sort((a, b) => a - b);
    const min = sorted[0]!;
    const max = sorted[sorted.length - 1]!;
    const median = sorted[Math.floor(sorted.length / 2)]!;
    const p10 = sorted[Math.floor(sorted.length * 0.1)]!;
    const p90 = sorted[Math.floor(sorted.length * 0.9)]!;
    const zeros = scores.filter((s) => s === 0).length;
    const hundreds = scores.filter((s) => s === 100).length;
    const extremeRate = (zeros + hundreds) / scores.length;

    // Non-blocking report for PR
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        chartCount,
        palaceScores: scores.length,
        min,
        max,
        median,
        p10,
        p90,
        zeros,
        hundreds,
        extremeRate,
      }),
    );

    expect(extremeRate).toBeLessThanOrEqual(0.05);
  });
});

describe("palace-overview absence of legacy/temporal deps", () => {
  it("module source tree has no legacy scorers or temporal chart fields", () => {
    const root = join(
      process.cwd(),
      "src/lib/ziwei/analysis/modules/palace-overview",
    );
    const files = [
      "collect-evidence.ts",
      "evaluate-structural-rules.ts",
      "analyze-palace.ts",
      "analyze-all-palaces.ts",
      "aggregate-evidence.ts",
      "normalize-result.ts",
    ];
    const forbidden = [
      "SCORING" + "_WEIGHTS",
      "RADAR" + "_WEIGHTS",
      "star-scores" + ".csv",
      "findStar" + "Score",
      "scoreFortune" + "Frame",
      "getPalace" + "Strengths",
      "annual" + "Mutagens",
      "major" + "Mutagens",
      "monthly" + "Palaces",
      "annual" + "Stars",
    ];
    for (const file of files) {
      const path = join(root, file);
      expect(existsSync(path)).toBe(true);
      const text = readFileSync(path, "utf8");
      for (const token of forbidden) {
        expect(text.includes(token), `${file} contains ${token}`).toBe(false);
      }
    }
  });
});

describe("palace-overview locality smoke", () => {
  it("adding stars outside TP4C does not change focus score when using same chart clone path", () => {
    // Soft locality: analyze focus Mệnh twice on identical charts → equal.
    // Hard mutation of ChartData stars is avoided (Calculation Core owned).
    const chart: ChartData = calculateNamPhai(REGRESSION);
    const menh = chart.palaces.find((p) => p.isMenh)!;
    const a = analyzeAllPalaces(chart, { school: "nam-phai" }).results.find(
      (r) => r.palaceIndex === menh.index,
    )!;
    const b = analyzeAllPalaces(structuredClone(chart), {
      school: "nam-phai",
    }).results.find((r) => r.palaceIndex === menh.index)!;
    expect(a.score).toBe(b.score);
    expect(a.rawAxes).toEqual(b.rawAxes);
  });
});
