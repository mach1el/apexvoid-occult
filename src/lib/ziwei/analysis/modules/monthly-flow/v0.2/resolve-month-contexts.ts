import type { ChartData, Palace } from "@/types/chart";
import { modulo } from "@/lib/ziwei/calculation/math";
import { stemBranchForLunarMonth, tuHoaTargets } from "@/lib/ziwei/engine-nam-phai";
import { CYCLE_BRANCHES } from "@/lib/ziwei/constants";
import type {
  MonthlyFlowV02MonthResult,
  MonthlyFlowV02Result,
  AnnualBaselineInput,
  MonthlyTransformationContribution,
  MonthlyJiCollisionKind,
  MonthlyDomainProjection,
  MonthlyFlowBand
} from "./types";
import { scoreMonth } from "./score-month";

export interface ResolveMonthlyFlowV02Input {
  chart: ChartData;
  annualBaseline: AnnualBaselineInput | null;
  annualYear: number;
  annualStem: string;
  annualBranch: string;
}

function getBand(score: number): MonthlyFlowBand {
  if (score > 75) return "breakthrough";
  if (score >= 55) return "favorable";
  if (score >= 45) return "stable";
  if (score >= 25) return "obstructed";
  return "alert";
}

export function buildV02Result(input: ResolveMonthlyFlowV02Input): MonthlyFlowV02Result {
  // CANDIDATE POLICIES (Not yet approved, but implemented for testing/research)
  
  const annualBranchIndex = CYCLE_BRANCHES.indexOf(input.annualBranch);
  
  // Need to extract birth details. ChartData usually has meta or we extract from existing setup
  // We'll mock extracting these from chart for now since this is V0.2 scaffolding.
  const birthMonth = (input.chart as any).lunarMonth ?? 1;
  const birthHourIndex = (input.chart as any).hourIndex ?? 0;

  // Công thức: start - (month - 1) + hour
  // start = annualBranchIndex
  const dauQuanIndex = modulo(annualBranchIndex - (birthMonth - 1) + birthHourIndex, 12);
  
  const months: MonthlyFlowV02MonthResult[] = [];

  for (let month = 1; month <= 12; month++) {
    const isDauQuanMonth = (month === 1);
    
    // Cung khởi tháng 1 (Đẩu Quân) đếm thuận mỗi tháng một cung
    const focusPalaceIndex = modulo(dauQuanIndex + (month - 1), 12);
    
    // Ngũ Hổ Độn
    const calendar = stemBranchForLunarMonth(input.annualStem, month);

    // Tứ Hóa Event Triggers
    const targets = tuHoaTargets(calendar.stem);
    const contributions: MonthlyTransformationContribution[] = [];
    let collisionKind: MonthlyJiCollisionKind | null = null;
    
    const baseline = input.annualBaseline ? input.annualBaseline.score : 50; // Fallback for scaffolding only

    const breakdown = scoreMonth({
      annualBaseline: baseline,
      isDauQuanMonth,
      palaceRawDelta: 0, // Mock palace delta until policy approved
      transformations: contributions,
      collisionKind
    });

    const domainProjections: MonthlyDomainProjection[] = [];

    months.push({
      monthIndex: month,
      lunarMonth: month,
      isLeapMonth: false, // Leap policy is pending
      calendarStem: calendar.stem,
      calendarBranch: calendar.branch,
      focusPalaceIndex,
      overallMonthlyScore: breakdown.finalMonthlyScore,
      overallBand: getBand(breakdown.finalMonthlyScore),
      breakdown,
      domainProjections
    });
  }

  return {
    annualYear: input.annualYear,
    annualStem: input.annualStem,
    annualBranch: input.annualBranch,
    months
  };
}
