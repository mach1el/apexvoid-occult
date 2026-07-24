import { describe, it, expect } from "vitest";
import { evaluatePalace } from "../evaluate-palace";
import type { ChartPalace as Palace, ChartStar as Star } from "@/types/chart";

function mockStar(name: string, layer: string, brightness?: string): Star {
  return { name, layer, brightness } as unknown as Star;
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
    expect(result.mainStarQualityDelta).toBe(-5);
    expect(result.diagnostics.mainStarQualityStatus).toBe("partial");
  });

  it("Miếu + Miếu -> +10 (capped)", () => {
    const palace = mockPalace([
      mockStar("Tử Vi", "Chính Tinh", "Miếu"),
      mockStar("Thiên Phủ", "Chính Tinh", "Miếu")
    ], "Kim");
    const result = evaluatePalace(palace, "Thủy");
    expect(result.mainStarQualityDelta).toBe(10);
  });

  it("Miếu + Hãm -> 0", () => {
    const palace = mockPalace([
      mockStar("Tử Vi", "Chính Tinh", "Miếu"),
      mockStar("Tham Lang", "Chính Tinh", "Hãm")
    ], "Kim");
    const result = evaluatePalace(palace, "Thủy");
    expect(result.mainStarQualityDelta).toBe(0);
  });

  it("Major support bucket (+15)", () => {
    const palace = mockPalace([
      mockStar("Tử Vi", "Chính Tinh", "Bình"),
      mockStar("Thiên Khôi", "Phụ Tinh"),
      mockStar("Thiên Việt", "Phụ Tinh") // Multiple major supports should still only give +15
    ], "Kim");
    const result = evaluatePalace(palace, "Thủy");
    expect(result.majorSupportDelta).toBe(15);
    // 0 (Bình) + 15 (Major) + 5 (Kim sinh Thủy) = 20
    expect(result.palaceRawDelta).toBe(20);
  });

  it("Tuần + Triệt -> -10 (not -20)", () => {
    const palace = mockPalace([
      mockStar("Tử Vi", "Chính Tinh", "Bình"),
      mockStar("Tuần", "Phụ Tinh"),
      mockStar("Triệt", "Phụ Tinh")
    ], "Kim");
    const result = evaluatePalace(palace, "Thủy");
    expect(result.voidMarkerDelta).toBe(-10);
  });

  it("Element relation missing", () => {
    const palace = mockPalace([mockStar("Tử Vi", "Chính Tinh", "Bình")]);
    const result = evaluatePalace(palace, undefined);
    expect(result.elementRelationDelta).toBe(0);
    expect(result.diagnostics.elementRelationStatus).toBe("unavailable");
  });
});
