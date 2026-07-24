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
          stars: p.stars.map(s => ({ name: s, layer: s.includes("Khôi") ? "Phụ Tinh" : "Chính Tinh", brightness: "Miếu" } as Star)) 
        } as unknown as Palace;
      }
      return { index: i, element: "Kim", stars: [] } as unknown as Palace;
    })
  } as unknown as ChartData;
}

describe("buildV02Result", () => {
  it("returns unavailable when annualBaseline is missing", () => {
    const input: ResolveMonthlyFlowV02Input = {
      chart: mockChart([], "Thủy"),
      annualBaseline: null,
      annualYear: 2026,
      annualStem: "Bính",
      annualBranch: "Ngọ"
    };

    const result = buildV02Result(input);
    expect(result.status).toBe("unavailable");
    expect(result.reason).toBe("annual-baseline-unavailable");
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
      annualBranch: "Ngọ" // Index 6
    };

    const result = buildV02Result(input);
    expect(result.status).toBe("resolved");
    expect(result.months).toHaveLength(12);

    // Check Month 1 (index 6 in chart)
    const month1 = result.months[0];
    if (!month1) throw new Error("Month1 not generated");
    expect(month1.monthIndex).toBe(1);
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

    // Check Domain Projections for Month 1
    // family = floor(30 * 0.8) = 24 -> 100 + 24 = 100 (clamp)
    // social = floor(30 * 0.9) = 27 -> 100 + 27 = 100
    // Actually base final is 100, clamped domain is 100
    const familyProj = month1.domainProjections.find(d => d.domain === "family")!;
    expect(familyProj.domainSpecificDelta).toBe(24);
    expect(familyProj.domainProjectionScore).toBe(100);
  });
});
