/**
 * Chart UI publish (V1.1) — non-scoring guardrails.
 *
 * The chart-UI task only adds display metadata to PalaceEvidence and
 * reorganizes how the UI groups/renders evidence. It must not change any
 * scoring, aggregation, or normalization output. This file locks down the
 * regression chart's numeric output (same chart as invariants.test.ts) and
 * checks the new metadata fields are self-consistent with the existing
 * diminishing-return computation, without duplicating that computation.
 */
import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { analyzeAllPalaces } from "@/lib/ziwei/analysis/modules/palace-overview";
import { loadPalaceOverviewKnowledgeV1 } from "@/lib/ziwei/analysis/knowledge";
import type { BirthInput } from "@/types/chart";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

function scoringSnapshot(school: "nam-phai" | "trung-chau") {
  const chart =
    school === "nam-phai" ? calculateNamPhai(REGRESSION) : calculateNamPhai(REGRESSION);
  const { results } = analyzeAllPalaces(chart, { school });
  return results
    .map((r) => ({
      palaceIndex: r.palaceIndex,
      score: r.score,
      band: r.band,
      rawAxes: r.rawAxes,
      axes: r.axes,
      intensity: r.intensity,
      evidenceCompleteness: r.evidenceCompleteness,
    }))
    .sort((a, b) => a.palaceIndex - b.palaceIndex);
}

describe("chart UI publish — metadata does not affect scoring", () => {
  it("regression chart scores/axes/band match the locked baseline", () => {
    expect(scoringSnapshot("nam-phai")).toMatchSnapshot();
  });

  it("evidence metadata fields are additive only — axes shape unchanged", () => {
    const chart = calculateNamPhai(REGRESSION);
    const { results } = analyzeAllPalaces(chart, { school: "nam-phai" });
    for (const result of results) {
      for (const e of result.allEvidence) {
        expect(Object.keys(e.axes).sort()).toEqual(
          ["activation", "pressure", "stability", "support"].sort(),
        );
      }
    }
  });

  it("diminishingRank/diminishingFactor on minor evidence match profile.familyDiminishingReturns order", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const factors = loaded.knowledge.profile.familyDiminishingReturns;

    const chart = calculateNamPhai(REGRESSION);
    const { results } = analyzeAllPalaces(chart, { school: "nam-phai" });

    let checked = 0;
    for (const result of results) {
      const minorEvidence = result.allEvidence.filter(
        (e) => e.category === "minor-star-family",
      );
      const byGroup = new Map<string, typeof minorEvidence>();
      for (const e of minorEvidence) {
        const key = e.diminishingGroup ?? "unknown";
        const list = byGroup.get(key) ?? [];
        list.push(e);
        byGroup.set(key, list);
      }
      for (const list of byGroup.values()) {
        const ranks = list.map((e) => e.diminishingRank).sort((a, b) => a! - b!);
        // Ranks assigned within a group must be distinct (matches the
        // contributors.forEach((c, index) => ...) loop in collect-evidence.ts).
        expect(new Set(ranks).size).toBe(ranks.length);
        for (const e of list) {
          expect(e.diminishingRank).toBeGreaterThanOrEqual(0);
          expect(e.diminishingFactor).toBe(factors[e.diminishingRank!]);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("every evidence entry classifies into exactly one chart-UI group (A-G) by category/role/axis", () => {
    const chart = calculateNamPhai(REGRESSION);
    const { results } = analyzeAllPalaces(chart, { school: "nam-phai" });

    function classify(e: (typeof results)[number]["allEvidence"][number]) {
      if (e.category === "major-star") {
        return e.palaceRole === "focus" && !e.borrowedFromOpposite ? "A" : "B";
      }
      if (e.category === "transformation") return "C";
      if (e.category === "minor-star-family") {
        return e.axes.support >= e.axes.pressure ? "D" : "E";
      }
      if (e.category === "chang-sheng" || e.category === "void-environment") return "F";
      if (e.category === "structural-rule") return "G";
      return null;
    }

    let total = 0;
    for (const result of results) {
      for (const e of result.allEvidence) {
        const group = classify(e);
        expect(group).not.toBeNull();
        total += 1;
      }
    }
    expect(total).toBeGreaterThan(0);
  });
});
