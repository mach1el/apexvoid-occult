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

describe("resolveTransformations V0.2.1", () => {
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

    const canonicalTransformations = [
      { mutagen: "Lộc" as const, starName: "Tử Vi", canonicalStarName: "Tử Vi", targetPalaceIndex: 0, targetNatalPalaceName: "Mệnh" },
      { mutagen: "Quyền" as const, starName: "Phá Quân", canonicalStarName: "Phá Quân", targetPalaceIndex: 6, targetNatalPalaceName: "Thiên Di" },
      { mutagen: "Khoa" as const, starName: "Vũ Khúc", canonicalStarName: "Vũ Khúc", targetPalaceIndex: 4, targetNatalPalaceName: "Tài Bạch" },
      { mutagen: "Kỵ" as const, starName: "Thái Dương", canonicalStarName: "Thái Dương", targetPalaceIndex: 2, targetNatalPalaceName: "Phu Thê" },
    ];

    const result = resolveTransformations({ chart, canonicalTransformations, focusPalaceIndex: 0, isPartial: false });

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

  it("Detects same-palace collision (V0.2.1 simplified)", () => {
    // If target has Natal Hóa Kỵ on the same palace
    const chart = mockChart([
      { index: 0, stars: ["Cự Môn"] }
    ]);
    // Add Hóa Kỵ to palace 0 manually with source natal
    chart.palaces[0]!.stars!.push({ name: "Hóa Kỵ", type: "Phụ Tinh", source: "natal" } as any);

    const canonicalTransformations = [ 
      { mutagen: "Kỵ" as const, starName: "Cự Môn", canonicalStarName: "Cự Môn", targetPalaceIndex: 0, targetNatalPalaceName: "Mệnh" } 
    ];
    
    const result = resolveTransformations({ chart, canonicalTransformations, focusPalaceIndex: 0, isPartial: false });
    
    expect(result.collisionKind).toBe("same-palace-natal-monthly");
  });
});
