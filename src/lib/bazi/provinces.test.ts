import { describe, it, expect } from "vitest";
import { PROVINCES } from "./provinces";

describe("BaZi provinces", () => {
  it("every province longitude is within Vietnam's range (~102-110°E)", () => {
    for (const p of PROVINCES) {
      expect(p.longitude).toBeGreaterThanOrEqual(102);
      expect(p.longitude).toBeLessThanOrEqual(110);
    }
  });

  it("has no duplicate province codes", () => {
    const codes = PROVINCES.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
