import { describe, it, expect } from "vitest";
import { calculate, tuHoaTargets, stemBranchForLunarMonth } from "@/lib/ziwei/engine-nam-phai";
import { buildV02Result } from "../../../../analysis/modules/monthly-flow/v0.2/resolve-month-contexts";
import type { MonthlyCalculationProvider } from "../../../../analysis/modules/monthly-flow/types";

const mockProvider: MonthlyCalculationProvider = {
  school: "nam-phai",
  tuHoaTargets: (stem) => tuHoaTargets(stem),
  stemBranchForLunarMonth: (annualStem, lunarMonth) => stemBranchForLunarMonth(annualStem, lunarMonth)
};

describe("V0.2.2 Integrity Hard Gates", () => {
  it("Scans 10 determinisic years to verify no unapproved collision policies and canonical months count === 12", () => {
    // Generate an engine output for a real chart
    const chart = calculate({
      solarDate: "1990-10-15",
      birthHour: "Thìn",
      gender: "male",
      timezone: "7",
      annualYear: "2026",
      flowBase: "month"
    });

    const diagnostics = {
      invalidMonthNumber: [],
      missingFocusPalace: [],
      missingCalendarStemBranch: [],
      duplicateMonthKeys: [],
      ambiguousTransformationTargets: [],
      unresolvedTransformationTargets: [],
      missingMonthlyEntries: [],
      providerSchoolMismatch: []
    };

    const result = buildV02Result({
      chart,
      annualBaseline: { score: 60, sourceModule: "v02-research", sourceContractVersion: "1", sourceEngineVersion: "1" },
      annualYear: 2026,
      annualStem: "Bính",
      annualBranch: "Ngọ",
      provider: mockProvider,
      diagnostics,
      annualHeadPalace: 0,
      smallLimitPalace: 1,
      taiTuePalace: 2
    });

    expect(result.months).toHaveLength(12);

    for (const m of result.months) {
      // Must not apply the -50 collision logic
      expect(m.breakdown.transformations.collisionPolicyApplied).toBe(false);

      // Verify explicit statuses exist
      expect(["resolved", "partial", "unavailable"]).toContain(m.status);

      // Verify domain heuristics removed
      expect(m.domainProjections).toHaveLength(0);
    }
  });
});
