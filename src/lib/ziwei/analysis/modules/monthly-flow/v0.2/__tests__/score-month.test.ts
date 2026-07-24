import { describe, it, expect } from "vitest";
import { scoreMonth } from "../score-month";

describe("Event-Driven Hierarchical Scorer V0.2", () => {
  describe("Section 10: Annual Envelope Examples", () => {
    it("Năm trung bình, tháng cát mạnh", () => {
      // Annual = 58, Palace = +12, Transformation = +25
      const result = scoreMonth({
        annualBaseline: 58,
        isDauQuanMonth: false,
        palaceRawDelta: 12,
        transformations: [
          { mutagen: "Lộc", starName: "Test", role: "direct-focus", baseMutagenDelta: 25, roleWeight: 1, contribution: 25 }
        ],
        collisionKind: null
      });

      expect(result.rawMonthlyScore).toBe(95); // 58 + 12 + 25 = 95
      expect(result.annualEnvelope.floor).toBe(28); // 58 - 30
      expect(result.annualEnvelope.ceiling).toBe(88); // 58 + 30
      expect(result.finalMonthlyScore).toBe(88);
      expect(result.clippedByAnnualCeiling).toBe(true);
    });

    it("Năm xấu, tháng cát mạnh", () => {
      // Annual = 38, Palace = +10, Transformation = +25
      const result = scoreMonth({
        annualBaseline: 38,
        isDauQuanMonth: false,
        palaceRawDelta: 10,
        transformations: [
          { mutagen: "Lộc", starName: "Test", role: "direct-focus", baseMutagenDelta: 25, roleWeight: 1, contribution: 25 }
        ],
        collisionKind: null
      });

      expect(result.rawMonthlyScore).toBe(73); // 38 + 10 + 25 = 73
      expect(result.annualEnvelope.floor).toBe(8);
      expect(result.annualEnvelope.ceiling).toBe(68);
      expect(result.finalMonthlyScore).toBe(68);
      expect(result.clippedByAnnualCeiling).toBe(true);
    });

    it("Năm trung bình, tháng hung mạnh", () => {
      // Annual = 58, Palace = -15, Transformation = -25
      const result = scoreMonth({
        annualBaseline: 58,
        isDauQuanMonth: false,
        palaceRawDelta: -15,
        transformations: [
          { mutagen: "Kỵ", starName: "Test", role: "direct-focus", baseMutagenDelta: -25, roleWeight: 1, contribution: -25 }
        ],
        collisionKind: null
      });

      expect(result.rawMonthlyScore).toBe(18); // 58 - 15 - 25 = 18
      expect(result.annualEnvelope.floor).toBe(28);
      expect(result.annualEnvelope.ceiling).toBe(88);
      expect(result.finalMonthlyScore).toBe(28);
      expect(result.clippedByAnnualFloor).toBe(true);
    });

    it("Năm tốt, tháng hung", () => {
      // Annual = 72, Palace = -15, Transformation = -25
      const result = scoreMonth({
        annualBaseline: 72,
        isDauQuanMonth: false,
        palaceRawDelta: -15,
        transformations: [
          { mutagen: "Kỵ", starName: "Test", role: "direct-focus", baseMutagenDelta: -25, roleWeight: 1, contribution: -25 }
        ],
        collisionKind: null
      });

      expect(result.rawMonthlyScore).toBe(32); // 72 - 15 - 25 = 32
      expect(result.annualEnvelope.floor).toBe(42);
      expect(result.annualEnvelope.ceiling).toBe(100);
      expect(result.finalMonthlyScore).toBe(42);
      expect(result.clippedByAnnualFloor).toBe(true);
    });

    it("Kỵ trùng tầng", () => {
      // Annual = 52, Palace = -10, Transformation = -50 (collision)
      const result = scoreMonth({
        annualBaseline: 52,
        isDauQuanMonth: false,
        palaceRawDelta: -10,
        transformations: [
          { mutagen: "Kỵ", starName: "Test", role: "direct-focus", baseMutagenDelta: -25, roleWeight: 1, contribution: -25 },
          { mutagen: "Kỵ", starName: "Test", role: "direct-focus", baseMutagenDelta: -25, roleWeight: 1, contribution: -25 }
        ],
        collisionKind: "same-star-annual-monthly"
      });

      expect(result.transformations.finalDelta).toBe(-50); // Replacement value
      expect(result.rawMonthlyScore).toBe(-8); // 52 - 10 - 50 = -8
      expect(result.annualEnvelope.floor).toBe(22);
      expect(result.annualEnvelope.ceiling).toBe(82);
      expect(result.finalMonthlyScore).toBe(22);
      expect(result.clippedByAnnualFloor).toBe(true);
    });
  });

  describe("Dominant Event Aggregation & Tie-Break", () => {
    it("Hóa Lộc tọa thủ +25, Hóa Kỵ tam hợp -16.25", () => {
      const result = scoreMonth({
        annualBaseline: 50,
        isDauQuanMonth: false,
        palaceRawDelta: 0,
        transformations: [
          { mutagen: "Lộc", starName: "Test1", role: "direct-focus", baseMutagenDelta: 25, roleWeight: 1.0, contribution: 25 },
          { mutagen: "Kỵ", starName: "Test2", role: "trine", baseMutagenDelta: -25, roleWeight: 0.65, contribution: -16.25 }
        ],
        collisionKind: null
      });

      expect(result.transformations.dominantDelta).toBe(25);
      expect(result.transformations.secondaryAppliedDelta).toBe(-16.25 * 0.5); // -8.125
      expect(result.transformations.finalDelta).toBe(16.875);
    });

    it("Tie-break Kỵ > Lộc > Quyền > Khoa (cùng cường độ 15)", () => {
      const result = scoreMonth({
        annualBaseline: 50,
        isDauQuanMonth: false,
        palaceRawDelta: 0,
        transformations: [
          { mutagen: "Lộc", starName: "Test1", role: "trine", baseMutagenDelta: 25, roleWeight: 0.6, contribution: 15 },
          { mutagen: "Kỵ", starName: "Test2", role: "trine", baseMutagenDelta: -25, roleWeight: 0.6, contribution: -15 }
        ],
        collisionKind: null
      });

      // Kỵ has higher rank, so Kỵ (-15) should be dominant
      expect(result.transformations.dominantContributionId).toBe("Kỵ-Test2");
      expect(result.transformations.dominantDelta).toBe(-15);
      expect(result.transformations.secondaryAppliedDelta).toBe(15 * 0.5); // 7.5
      expect(result.transformations.finalDelta).toBe(-7.5);
    });
  });
});
