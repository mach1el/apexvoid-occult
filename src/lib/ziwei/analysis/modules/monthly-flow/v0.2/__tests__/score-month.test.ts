import { describe, it, expect } from "vitest";
import { scoreMonth } from "../score-month";
import type { MonthlyFlowV021Input } from "../types";

function makeInput(
  annualBaseline: number,
  palaceRawDelta: number,
  transformations: any[],
  collisionKind: any
): MonthlyFlowV021Input {
  return {
    annualBaseline: { score: annualBaseline, sourceModule: "test", sourceContractVersion: "1", sourceEngineVersion: "1" },
    focusPalaceFacts: { focusPalaceIndex: 0, lunarMonth: 1, isLeapMonth: false, calendarStem: "Giáp", calendarBranch: "Tý" },
    annualContext: { 
      annualHeadPalaceIndex: 0, 
      smallLimitPalaceIndex: null, 
      taiTuePalaceIndex: null,
      annualHeadStatus: "resolved",
      smallLimitStatus: "resolved",
      taiTueStatus: "resolved"
    },
    transformationContext: {
      contributions: transformations,
      collisionCandidates: collisionKind ? [{ kind: collisionKind, targetStar: "Test", targetPalaceIndex: 0 } as any] : [],
      resolutionStatus: "resolved",
      unresolvedTargets: [],
      ambiguousTargets: [],
      collisionPolicyStatus: collisionKind ? "pending-expert-review" : "not-applicable",
      finalAppliedDelta: 0
    },
    isDauQuanMonth: false,
    palaceRawDelta
  };
}

describe("Event-Driven Hierarchical Scorer V0.2.1", () => {
  describe("Section 10: Annual Envelope Examples", () => {
    it("Năm trung bình, tháng cát mạnh", () => {
      // Annual = 58, Palace = +12, Transformation = +25
      const result = scoreMonth(makeInput(58, 12, [
        { mutagen: "Lộc", starName: "Test", role: "direct-focus", baseMutagenDelta: 25, roleWeight: 1, contribution: 25 }
      ], null));

      expect(result.rawMonthlyScore).toBe(95); // 58 + 12 + 25 = 95
      expect(result.annualEnvelope.floor).toBe(28); // 58 - 30
      expect(result.annualEnvelope.ceiling).toBe(88); // 58 + 30
      expect(result.finalMonthlyScore).toBe(88);
      expect(result.clippedByAnnualCeiling).toBe(true);
    });

    it("Năm xấu, tháng cát mạnh", () => {
      // Annual = 38, Palace = +10, Transformation = +25
      const result = scoreMonth(makeInput(38, 10, [
        { mutagen: "Lộc", starName: "Test", role: "direct-focus", baseMutagenDelta: 25, roleWeight: 1, contribution: 25 }
      ], null));

      expect(result.rawMonthlyScore).toBe(73); // 38 + 10 + 25 = 73
      expect(result.annualEnvelope.floor).toBe(8);
      expect(result.annualEnvelope.ceiling).toBe(68);
      expect(result.finalMonthlyScore).toBe(68);
      expect(result.clippedByAnnualCeiling).toBe(true);
    });

    it("Năm trung bình, tháng hung mạnh", () => {
      // Annual = 58, Palace = -15, Transformation = -25
      const result = scoreMonth(makeInput(58, -15, [
        { mutagen: "Kỵ", starName: "Test", role: "direct-focus", baseMutagenDelta: -25, roleWeight: 1, contribution: -25 }
      ], null));

      expect(result.rawMonthlyScore).toBe(18); // 58 - 15 - 25 = 18
      expect(result.annualEnvelope.floor).toBe(28);
      expect(result.annualEnvelope.ceiling).toBe(88);
      expect(result.finalMonthlyScore).toBe(28);
      expect(result.clippedByAnnualFloor).toBe(true);
    });

    it("Năm tốt, tháng hung", () => {
      // Annual = 72, Palace = -15, Transformation = -25
      const result = scoreMonth(makeInput(72, -15, [
        { mutagen: "Kỵ", starName: "Test", role: "direct-focus", baseMutagenDelta: -25, roleWeight: 1, contribution: -25 }
      ], null));

      expect(result.rawMonthlyScore).toBe(32); // 72 - 15 - 25 = 32
      expect(result.annualEnvelope.floor).toBe(42);
      expect(result.annualEnvelope.ceiling).toBe(100);
      expect(result.finalMonthlyScore).toBe(42);
      expect(result.clippedByAnnualFloor).toBe(true);
    });

    it("Kỵ trùng tầng", () => {
      // In V0.2.1 we no longer apply -50.
      // Annual = 52, Palace = -10, Transformation = -50 (from 2x -25 contributions)
      // wait, the contributions are aggregated normally. 
      // dominant = -25, secondary = -25 * 0.5 = -12.5 -> -37.5. clamp to -35.
      const result = scoreMonth(makeInput(52, -10, [
        { mutagen: "Kỵ", starName: "Test", role: "direct-focus", baseMutagenDelta: -25, roleWeight: 1, contribution: -25 },
        { mutagen: "Kỵ", starName: "Test", role: "direct-focus", baseMutagenDelta: -25, roleWeight: 1, contribution: -25 }
      ], "same-star-annual-monthly"));

      expect(result.transformations.finalDelta).toBe(-35); // V0.2.1 doesn't hardcode -50
      expect(result.rawMonthlyScore).toBe(7); // 52 - 10 - 35 = 7
      expect(result.annualEnvelope.floor).toBe(22);
      expect(result.annualEnvelope.ceiling).toBe(82);
      expect(result.finalMonthlyScore).toBe(22);
      expect(result.clippedByAnnualFloor).toBe(true);
    });
  });

  describe("Dominant Event Aggregation & Tie-Break", () => {
    it("Hóa Lộc tọa thủ +25, Hóa Kỵ tam hợp -16.25", () => {
      const result = scoreMonth(makeInput(50, 0, [
        { mutagen: "Lộc", starName: "Test1", role: "direct-focus", baseMutagenDelta: 25, roleWeight: 1.0, contribution: 25 },
        { mutagen: "Kỵ", starName: "Test2", role: "trine", baseMutagenDelta: -25, roleWeight: 0.65, contribution: -16.25 }
      ], null));

      expect(result.transformations.dominantDelta).toBe(25);
      expect(result.transformations.secondaryAppliedDelta).toBe(-16.25 * 0.5); // -8.125
      expect(result.transformations.finalDelta).toBe(16.875);
    });

    it("Tie-break Kỵ > Lộc > Quyền > Khoa (cùng cường độ 15)", () => {
      const result = scoreMonth(makeInput(50, 0, [
        { mutagen: "Lộc", starName: "Test1", role: "trine", baseMutagenDelta: 25, roleWeight: 0.6, contribution: 15 },
        { mutagen: "Kỵ", starName: "Test2", role: "trine", baseMutagenDelta: -25, roleWeight: 0.6, contribution: -15 }
      ], null));

      // Kỵ has higher rank, so Kỵ (-15) should be dominant
      expect(result.transformations.dominantContributionId).toBe("Kỵ-Test2");
      expect(result.transformations.dominantDelta).toBe(-15);
      expect(result.transformations.secondaryAppliedDelta).toBe(15 * 0.5); // 7.5
      expect(result.transformations.finalDelta).toBe(-7.5);
    });
  });
});
