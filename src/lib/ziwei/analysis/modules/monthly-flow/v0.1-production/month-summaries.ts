/**
 * Display-only month summaries for Monthly Flow production UI.
 * Composite = arithmetic mean of available domain scores; never fed back
 * into scoring.
 */
import { ANNUAL_AXIS_DOMAINS, type AnnualAxisDomain } from "../../../contracts/annual-axes";
import type { MonthResult } from "../types";

export interface MonthlyFlowMonthSummary {
  monthKey: string;
  lunarMonth: number;
  isLeapMonth: boolean;
  status: "available" | "partial" | "unavailable";

  /** Display-only mean of available axes; null when unavailable. */
  compositeScore: number | null;
  availableAxisCount: number;
  axisCoverage: number;

  domainScores: Partial<Record<AnnualAxisDomain, number>>;
  strongestDomain: AnnualAxisDomain | null;
  weakestDomain: AnnualAxisDomain | null;

  result: MonthResult;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Build a display summary for one month. Does not mutate `result`.
 */
export function buildMonthlyFlowMonthSummary(result: MonthResult): MonthlyFlowMonthSummary {
  const domainScores: Partial<Record<AnnualAxisDomain, number>> = {};
  const available: Array<{ domain: AnnualAxisDomain; score: number }> = [];

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const axis = result.axes[domain];
    if (axis.status === "available" && axis.score != null) {
      domainScores[domain] = axis.score;
      available.push({ domain, score: axis.score });
    }
  }

  if (result.status === "unavailable" || available.length === 0) {
    return {
      monthKey: result.identity.monthKey,
      lunarMonth: result.identity.lunarMonth,
      isLeapMonth: result.identity.isLeapMonth,
      status: result.status,
      compositeScore: null,
      availableAxisCount: available.length,
      axisCoverage: available.length / 6,
      domainScores,
      strongestDomain: null,
      weakestDomain: null,
      result,
    };
  }

  const mean = available.reduce((sum, a) => sum + a.score, 0) / available.length;
  const sorted = [...available].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0;
  });

  return {
    monthKey: result.identity.monthKey,
    lunarMonth: result.identity.lunarMonth,
    isLeapMonth: result.identity.isLeapMonth,
    status: result.status,
    compositeScore: round1(mean),
    availableAxisCount: available.length,
    axisCoverage: available.length / 6,
    domainScores,
    strongestDomain: sorted[0]?.domain ?? null,
    weakestDomain: sorted[sorted.length - 1]?.domain ?? null,
    result,
  };
}

export function buildMonthlyFlowMonthSummaries(
  months: readonly MonthResult[],
): MonthlyFlowMonthSummary[] {
  return months.map(buildMonthlyFlowMonthSummary);
}
