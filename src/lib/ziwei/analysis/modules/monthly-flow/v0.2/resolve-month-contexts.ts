import type { ChartData, ChartPalace as Palace } from "@/types/chart";
import { tuHoaTargets } from "@/lib/ziwei/engine-nam-phai";

import type {
  MonthlyFlowV02MonthResult,
  MonthlyFlowV02Result,
  AnnualBaselineInput,
  MonthlyTransformationContribution,
  MonthlyJiCollisionKind,
  MonthlyDomainProjection,
  MonthlyFlowBand,
  MonthlyFlowV021Input
} from "./types";
import { scoreMonth } from "./score-month";
import { evaluatePalace } from "./evaluate-palace";
import { resolveTransformations } from "./resolve-transformations";
import { resolveMonthContexts } from "../resolve-month-contexts";
import type { MonthlyCalculationProvider, MonthlyFlowYearDiagnostics } from "../types";

export interface ResolveMonthlyFlowV02Input {
  chart: ChartData;
  annualBaseline: AnnualBaselineInput | null;
  annualYear: number;
  annualStem: string;
  annualBranch: string;
  provider: MonthlyCalculationProvider; // injected
  diagnostics: MonthlyFlowYearDiagnostics; // injected
  annualHeadPalace: number; // provenance
  smallLimitPalace: number | null; // provenance
  taiTuePalace: number | null; // provenance
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
  
  // 1. Resolve Canonical Coordinates
  const canonicalContexts = resolveMonthContexts({
    chart: input.chart,
    school: "nam-phai",
    provider: input.provider,
    diagnostics: input.diagnostics
  });

  if (canonicalContexts.rejected || canonicalContexts.contexts.length < 12) {
    return {
      status: "partial",
      reason: "canonical-context-rejected",
      annualScoreSource: input.annualBaseline,
      annualYear: input.annualYear,
      annualStem: input.annualStem,
      annualBranch: input.annualBranch,
      months: []
    };
  }

  const months: MonthlyFlowV02MonthResult[] = [];

  for (const ctx of canonicalContexts.contexts) {
    const focusPalaceIndex = ctx.identity.focusPalaceIndex;
    const isDauQuanMonth = (ctx.identity.lunarMonth === 1);
    
    // Evaluate Palace
    const targetPalace = input.chart.palaces.find(p => p.index === focusPalaceIndex);
    const evaluated = targetPalace ? evaluatePalace(targetPalace, input.chart.menhElement) : null;
    const palaceRawDelta = evaluated ? evaluated.palaceRawDelta : 0;
    
    // Tứ Hóa Event Triggers (using canonical facts)
    const resolvedT = resolveTransformations({
      chart: input.chart,
      canonicalTransformations: ctx.transformations,
      focusPalaceIndex,
      isPartial: ctx.transformationsPartial
    });
    
    const v021Input: MonthlyFlowV021Input = {
      annualBaseline: input.annualBaseline,
      focusPalaceFacts: {
        focusPalaceIndex: ctx.identity.focusPalaceIndex,
        lunarMonth: ctx.identity.lunarMonth,
        isLeapMonth: ctx.identity.isLeapMonth,
        calendarStem: ctx.identity.calendarStem,
        calendarBranch: ctx.identity.calendarBranch
      },
      annualContext: {
        annualHeadPalace: input.annualHeadPalace,
        smallLimitPalace: input.smallLimitPalace,
        taiTuePalace: input.taiTuePalace
      },
      transformationContext: {
        contributions: resolvedT.contributions,
        collisionKind: resolvedT.collisionKind,
        isPartial: ctx.transformationsPartial
      },
      isDauQuanMonth,
      palaceRawDelta
    };

    const breakdown = scoreMonth(v021Input);
    const finalScore = breakdown.finalMonthlyScore;

    // V0.2.1: Domain heuristics removed
    const domainProjections: MonthlyDomainProjection[] = [];

    months.push({
      monthIndex: ctx.identity.lunarMonth, // Regular month mapping
      lunarMonth: ctx.identity.lunarMonth,
      isLeapMonth: ctx.identity.isLeapMonth,
      calendarStem: ctx.identity.calendarStem,
      calendarBranch: ctx.identity.calendarBranch,
      focusPalaceIndex,
      provenance: {
        annualHeadPalace: input.annualHeadPalace,
        smallLimitPalace: input.smallLimitPalace,
        taiTuePalace: input.taiTuePalace
      },
      overallMonthlyScore: finalScore,
      overallBand: getBand(finalScore),
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
