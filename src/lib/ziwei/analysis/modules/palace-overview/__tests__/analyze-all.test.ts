import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { analyzeAllPalaces } from "../analyze-all-palaces";

const REGRESSION = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female" as const,
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

describe("analyzeAllPalaces", () => {
  it("returns 12 results with bounded scores", () => {
    const chart = calculateNamPhai(REGRESSION);
    const { results, knowledgeValid } = analyzeAllPalaces(chart, {
      school: "nam-phai",
    });
    expect(knowledgeValid).toBe(true);
    expect(results).toHaveLength(12);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.axes.support).toBeGreaterThanOrEqual(0);
      expect(r.axes.pressure).toBeGreaterThanOrEqual(0);
      expect(r.allEvidence.length).toBeGreaterThan(0);
    }
  });

  it("is stable when annualYear changes", () => {
    const a = analyzeAllPalaces(
      calculateNamPhai({ ...REGRESSION, annualYear: "2026" }),
      { school: "nam-phai" },
    ).results;
    const b = analyzeAllPalaces(
      calculateNamPhai({ ...REGRESSION, annualYear: "2027" }),
      { school: "nam-phai" },
    ).results;
    expect(a.map((r) => ({ ...r, allEvidence: r.allEvidence.map((e) => e.id) }))).toEqual(
      b.map((r) => ({ ...r, allEvidence: r.allEvidence.map((e) => e.id) })),
    );
  });
});
