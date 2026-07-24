import type { ChartData, ChartPalace as Palace } from "@/types/chart";
import { stemBranchForLunarMonth, tuHoaTargets } from "@/lib/ziwei/engine-nam-phai";

const CYCLE_BRANCHES = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tị", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
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
import { evaluatePalace } from "./evaluate-palace";
import { resolveTransformations } from "./resolve-transformations";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function modulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

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
  if (!input.annualBaseline) {
    return {
      status: "unavailable",
      reason: "annual-baseline-unavailable",
      annualYear: input.annualYear,
      annualStem: input.annualStem,
      annualBranch: input.annualBranch,
      months: []
    };
  }
  
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

    // Evaluate Palace
    const targetPalace = input.chart.palaces[focusPalaceIndex];
    const evaluated = targetPalace ? evaluatePalace(targetPalace, input.chart.menhElement) : null;
    const palaceRawDelta = evaluated ? evaluated.palaceRawDelta : 0;
    
    // Tứ Hóa Event Triggers
    const targets = tuHoaTargets(calendar.stem);
    const resolvedT = resolveTransformations({
      chart: input.chart,
      targets,
      focusPalaceIndex
    });
    
    const breakdown = scoreMonth({
      annualBaseline: input.annualBaseline.score,
      isDauQuanMonth,
      palaceRawDelta,
      transformations: resolvedT.contributions,
      collisionKind: resolvedT.collisionKind
    });
    const finalScore = breakdown.finalMonthlyScore;

    const DOMAINS: Array<{ name: MonthlyDomainProjection["domain"]; delta: number }> = [
      { name: "family", delta: Math.floor(palaceRawDelta * 0.8) },
      { name: "wealth", delta: Math.floor(palaceRawDelta * 1.2) },
      { name: "career", delta: Math.floor(palaceRawDelta * 1.1) },
      { name: "social", delta: Math.floor(palaceRawDelta * 0.9) },
      { name: "romance", delta: Math.floor(palaceRawDelta * 0.7) }
    ];

    const domainProjections: MonthlyDomainProjection[] = DOMAINS.map(d => ({
      domain: d.name,
      overallMonthlyScore: finalScore,
      domainSpecificDelta: d.delta,
      domainProjectionScore: clamp(finalScore + d.delta, 0, 100)
    }));

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
    status: "resolved",
    annualScoreSource: input.annualBaseline,
    annualYear: input.annualYear,
    annualStem: input.annualStem,
    annualBranch: input.annualBranch,
    months
  };
}
