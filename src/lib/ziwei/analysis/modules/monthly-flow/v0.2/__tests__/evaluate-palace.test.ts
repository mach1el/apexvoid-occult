import { describe, it, expect } from "vitest";
import { evaluatePalace } from "../evaluate-palace";
import type { ChartPalace as Palace, ChartStar as Star } from "@/types/chart";

function mockStar(name: string, layer: string, brightness?: string): Star {
  // Add source so it is eligible
  return { name, layer, brightness, source: "natal" } as unknown as Star;
}

function mockPalace(stars: Star[], element?: string): Palace {
  // Canh Tuất -> Thoa Xuyến Kim, Nhâm Tuất -> Đại Hải Thủy
  let stem = undefined;
  let branch = "Tuất";
  if (element === "Kim") stem = "Canh";
  else if (element === "Thủy") stem = "Nhâm";
  return { stars, stem, branch } as unknown as Palace;
}

describe("Palace Evaluator V0.2", () => {
  it("VCD không đắc Tam Không -> -5", () => {
    const palace = mockPalace([], "Kim");
    const result = evaluatePalace(palace, "Thủy");
    expect(result.components.mainStarQuality.delta).toBe(-5);
    expect(result.status).toBe("partial");
    expect(result.components.mainStarQuality.status).toBe("partial");
  });

  it("Miếu + Miếu -> +10 (capped)", () => {
    const palace = mockPalace([
      mockStar("Tử Vi", "Chính Tinh", "Miếu"),
      mockStar("Thiên Phủ", "Chính Tinh", "Miếu")
    ], "Kim");
    const result = evaluatePalace(palace, "Thủy");
    expect(result.components.mainStarQuality.delta).toBe(10);
  });

  it("Miếu + Hãm -> 0", () => {
    const palace = mockPalace([
      mockStar("Tử Vi", "Chính Tinh", "Miếu"),
      mockStar("Tham Lang", "Chính Tinh", "Hãm")
    ], "Kim");
    const result = evaluatePalace(palace, "Thủy");
    expect(result.components.mainStarQuality.delta).toBe(0);
  });

  it("Major support bucket (+15)", () => {
    const palace = mockPalace([
      mockStar("Tử Vi", "Chính Tinh", "Bình"),
      mockStar("Thiên Khôi", "Phụ Tinh"),
      mockStar("Thiên Việt", "Phụ Tinh") // Multiple major supports should still only give +15
    ], "Kim");
    const result = evaluatePalace(palace, "Thủy");
    expect(result.components.majorSupport.delta).toBe(15);
    // 0 (Bình) + 15 (Major) + 5 (Kim sinh Thủy) = 20
    expect(result.rawDelta).toBe(20);
  });

  it("Tuần + Triệt -> -10 (not -20)", () => {
    const palace = mockPalace([
      mockStar("Tử Vi", "Chính Tinh", "Bình"),
      mockStar("Tuần", "Phụ Tinh"),
      mockStar("Triệt", "Phụ Tinh")
    ], "Kim");
    const result = evaluatePalace(palace, "Thủy");
    expect(result.components.voidMarker.delta).toBe(-10);
  });

  it("Element relation missing", () => {
    const palace = mockPalace([mockStar("Tử Vi", "Chính Tinh", "Bình")]);
    const result = evaluatePalace(palace, undefined);
    expect(result.components.elementRelation.delta).toBe(null);
    expect(result.components.elementRelation.status).toBe("unavailable");
  });
});
