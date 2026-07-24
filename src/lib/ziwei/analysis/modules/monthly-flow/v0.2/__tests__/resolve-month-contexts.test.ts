import { describe, it, expect } from "vitest";
import { buildV02Result, ResolveMonthlyFlowV02Input } from "../resolve-month-contexts";
import type { ChartData, ChartPalace as Palace, ChartStar as Star } from "@/types/chart";

function mockChart(palaces: Array<{ index: number, stars: string[], element: string }>, element: string): ChartData {
  return {
    menhElement: element,
    lunar: { day: 1, month: 1, year: 2026 },
    hourIndex: 0,
    palaces: Array.from({ length: 12 }).map((_, i) => {
      const p = palaces.find(x => x.index === i);
      if (p) {
        return {
          index: i,
          element: p.element,
          stem: p.element === "Thủy" ? "Nhâm" : undefined,
          branch: "Tuất",
          flowMonths: [{ month: i === 6 ? 1 : (i > 6 ? i - 5 : i + 7), palace: { index: i } as any }],
          stars: p.stars.map(s => ({ name: s, layer: s.includes("Khôi") ? "Phụ Tinh" : "Chính Tinh", brightness: "Miếu", source: "natal" } as Star))
        } as unknown as Palace;
      }
      return { index: i, element: "Kim", stars: [], flowMonths: [{ month: i === 6 ? 1 : (i > 6 ? i - 5 : i + 7), palace: { index: i } as any }] } as unknown as Palace;
    })
  } as unknown as ChartData;
}

const mockProvider: any = {
  school: "nam-phai",
  tuHoaTargets: () => [],
  stemBranchForLunarMonth: (annualStem: string, month: number) => ({ stem: "Giáp", branch: "Tý" })
};

const mockDiagnostics: any = {
  invalidMonthNumber: [],
  missingFocusPalace: [],
  missingCalendarStemBranch: [],
  duplicateMonthKeys: [],
  ambiguousTransformationTargets: [],
  unresolvedTransformationTargets: [],
  missingMonthlyEntries: [],
  providerSchoolMismatch: []
};

describe("buildV02Result", () => {
  it("returns unavailable when annualBaseline is missing", () => {
    const input: ResolveMonthlyFlowV02Input = {
      chart: mockChart([], "Thủy"),
      annualBaseline: null,
      annualYear: 2026,
      annualStem: "Bính",
      annualBranch: "Ngọ",
      provider: mockProvider,
      diagnostics: mockDiagnostics,
      annualHeadPalace: 0,
      smallLimitPalace: null,
      taiTuePalace: null
    };

    const result = buildV02Result(input);
    expect(result.status).toBe("unavailable");
    expect(result.reasonCodes).toContain("annual-baseline-unavailable");
    expect(result.months).toHaveLength(0);
  });

  it("calculates 12 months with correct projections without fallback 50", () => {
    const input: ResolveMonthlyFlowV02Input = {
      chart: mockChart([
        // Focus month 1 (Đẩu Quân) will be at index (6 - 0 + 0) = 6
        { index: 6, stars: ["Tử Vi", "Thiên Khôi"], element: "Thủy" }
      ], "Thủy"),
      annualBaseline: { score: 70, sourceModule: "mock", sourceContractVersion: "1", sourceEngineVersion: "1" },
      annualYear: 2026,
      annualStem: "Bính",
      annualBranch: "Ngọ", // Index 6
      provider: mockProvider,
      diagnostics: mockDiagnostics,
      annualHeadPalace: 0, // This is not null, so provenance is resolved
      smallLimitPalace: null,
      taiTuePalace: null
    };

    const result = buildV02Result(input);
    // Since element is mocked to Thủy (Nhâm Tuất = Thủy), and we have natal stars, it shouldn't be partial, UNLESS some policy is marked partial by default.
    // In evaluate-palace.ts, `elementRelation.status = "partial"` is applied when everything is available (since policy is pending review).
    // So monthStatus will be "partial", yearStatus will be "partial".
    expect(result.status).toBe("partial");
    expect(result.months).toHaveLength(12);

    // Check Month 1 (index 6 in chart)
    const month1 = result.months.find(m => m.monthIndex === 1);
    if (!month1) throw new Error("Month1 not generated");
    expect(month1.focusPalaceIndex).toBe(6);

    // Palace Evaluator integration check for Month 1
    // Tử Vi (Miếu) -> +10
    // Thiên Khôi (Major support) -> +15
    // Thủy vs Thủy (Tỷ hòa) -> +5
    // Total palace raw = 30 -> capped to 25.
    // Tháng 1 Đẩu Quân -> 25 * 1.5 = 37.5
    // Baseline = 70. 70 + 37.5 = 107.5.
    // Envelope Ceiling = 70 + 30 = 100.
    // Final score = 100.
    expect(month1.breakdown.palace.raw).toBe(30);
    expect(month1.breakdown.palace.capped).toBe(25);
    expect(month1.breakdown.palace.amplified).toBe(37.5);
    expect(month1.overallMonthlyScore).toBe(100);
    expect(month1.domainProjections).toHaveLength(0); // V0.2.1 removed domain heuristics
  });
});
