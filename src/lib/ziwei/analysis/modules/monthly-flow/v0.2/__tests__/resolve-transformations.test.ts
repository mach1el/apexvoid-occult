import { describe, it, expect } from "vitest";
import { resolveTransformations } from "../resolve-transformations";
import type { ChartData, ChartPalace as Palace, ChartStar as Star } from "@/types/chart";

function mockChart(palaces: Array<{ index: number, stars: string[] }>): ChartData {
  return {
    palaces: Array.from({ length: 12 }).map((_, i) => {
      const p = palaces.find(x => x.index === i);
      if (p) {
        return { index: i, stars: p.stars.map(s => ({ name: s, type: "Chính Tinh" } as Star)) } as Palace;
      }
      return { index: i, stars: [] } as unknown as Palace;
    })
  } as unknown as ChartData;
}

describe("resolveTransformations V0.2", () => {
  it("Resolves weights according to expert policies", () => {
    // Focus = 0
    // Tử Vi (Lộc) at 0 -> direct-focus (1.0)
    // Phá Quân (Quyền) at 6 -> opposite (0.8)
    // Vũ Khúc (Khoa) at 4 -> trine (0.65)
    // Thái Dương (Kỵ) at 2 -> outside (0.0)
    
    const chart = mockChart([
      { index: 0, stars: ["Tử Vi"] },
      { index: 6, stars: ["Phá Quân"] },
      { index: 4, stars: ["Vũ Khúc"] },
      { index: 2, stars: ["Thái Dương"] },
    ]);

    const targets = [
      { mutagen: "Lộc", starName: "Tử Vi" },
      { mutagen: "Quyền", starName: "Phá Quân" },
      { mutagen: "Khoa", starName: "Vũ Khúc" },
      { mutagen: "Kỵ", starName: "Thái Dương" },
    ];

    const result = resolveTransformations({ chart, targets, focusPalaceIndex: 0 });

    expect(result.contributions).toHaveLength(3); // Thái Dương is outside, so it should be ignored (or pushed with 0 weight)
    
    const loc = result.contributions.find(c => c.mutagen === "Lộc");
    expect(loc?.role).toBe("direct-focus");
    expect(loc?.contribution).toBe(25); // 25 * 1.0

    const quyen = result.contributions.find(c => c.mutagen === "Quyền");
    expect(quyen?.role).toBe("opposite");
    expect(quyen?.contribution).toBe(15 * 0.8); // 12

    const khoa = result.contributions.find(c => c.mutagen === "Khoa");
    expect(khoa?.role).toBe("trine");
    expect(khoa?.contribution).toBe(15 * 0.65); // 9.75
  });

  it("Excludes duplicate physical stars", () => {
    // Two Cự Môn in different palaces (invalid state, but we test the diagnostic)
    const chart = mockChart([
      { index: 0, stars: ["Cự Môn"] },
      { index: 5, stars: ["Cự Môn"] },
    ]);

    const targets = [ { mutagen: "Kỵ", starName: "Cự Môn" } ];
    const result = resolveTransformations({ chart, targets, focusPalaceIndex: 0 });
    
    expect(result.contributions).toHaveLength(0); // Should skip and report diagnostic
    expect(result.diagnostics.partialReasons).toContain("duplicate-physical-target-Cự Môn");
  });
});
