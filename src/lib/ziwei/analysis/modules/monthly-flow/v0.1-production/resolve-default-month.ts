/**
 * UI-only helpers for Monthly Flow production (current month selection).
 * Inject `now` in tests — never call Date.now inside the scorer.
 */
import type { ZiweiSchool } from "../../../facts";
import { getEngine } from "../../../../chart";
import type { School } from "../../../../../../types/chart";
import type { MonthlyFlowMonthSummary } from "./month-summaries";

export interface ResolveDefaultMonthOptions {
  annualYear: number;
  school: ZiweiSchool;
  monthSummaries: readonly MonthlyFlowMonthSummary[];
  /** Injected clock for deterministic tests. */
  now?: Date;
  timezone?: number;
}

/**
 * Default selected lunar month:
 * 1. current lunar month when annualYear === calendar year and resolvable;
 * 2. otherwise lunar month 1;
 * 3. otherwise first scoreable summary.
 */
export function resolveDefaultSelectedMonthKey(
  options: ResolveDefaultMonthOptions,
): string | null {
  const {
    annualYear,
    school,
    monthSummaries,
    now = new Date(),
    timezone = 7,
  } = options;

  const regular = monthSummaries.filter((m) => !m.isLeapMonth);

  if (now.getFullYear() === annualYear) {
    const engine = getEngine(school as School);
    if (engine?.solarToLunar) {
      const lunar = engine.solarToLunar(
        now.getDate(),
        now.getMonth() + 1,
        now.getFullYear(),
        timezone,
      );
      if (
        lunar &&
        Number.isInteger(lunar.month) &&
        lunar.month >= 1 &&
        lunar.month <= 12 &&
        lunar.leap === 0
      ) {
        const match = regular.find((m) => m.lunarMonth === lunar.month);
        if (match) return match.monthKey;
      }
    }
  }

  const month1 = regular.find((m) => m.lunarMonth === 1);
  if (month1) return month1.monthKey;

  const firstScoreable = monthSummaries.find((m) => m.status !== "unavailable");
  return firstScoreable?.monthKey ?? monthSummaries[0]?.monthKey ?? null;
}
