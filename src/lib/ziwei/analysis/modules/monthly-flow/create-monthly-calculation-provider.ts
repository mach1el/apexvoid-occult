/**
 * Wire ChartEngine → MonthlyCalculationProvider without exposing Lộc Tồn index helpers.
 */
import type { School } from "../../../../../types/chart";
import type { ZiweiSchool } from "../../facts";
import { getEngine } from "../../../chart";
import type { MonthlyCalculationProvider } from "./types";

/**
 * Create a school-bound Calculation Core provider for Monthly Flow.
 * Returns null when the engine for `school` is missing.
 */
export function createMonthlyCalculationProvider(
  school: ZiweiSchool,
): MonthlyCalculationProvider | null {
  const engine = getEngine(school as School);
  if (!engine) return null;

  return {
    school,
    tuHoaTargets: (stem: string) => engine.tuHoaTargets(stem),
    stemBranchForLunarMonth: (yearStem: string, lunarMonth: number) =>
      engine.stemBranchForLunarMonth(yearStem, lunarMonth),
  };
}
