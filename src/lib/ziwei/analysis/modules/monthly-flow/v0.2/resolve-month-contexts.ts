import type { ChartData, ChartPalace as Palace } from "@/types/chart";
import { tuHoaTargets } from "@/lib/ziwei/engine-nam-phai";

import type {
  MonthlyFlowV02MonthResult,
  MonthlyFlowV02Result,
  AnnualBaselineInput,
  MonthlyDomainProjection,
  MonthlyFlowBand,
  MonthlyFlowV021Input,
  MonthlyFlowResolutionStatus,
  MonthlyFlowV02ReasonCode,
  MonthlyAnnualContext
} from "./types";
import { scoreMonth } from "./score-month";
import { evaluatePalace } from "./evaluate-palace";
import { resolveTransformations } from "./resolve-transformations";
import { validateAnnualBaseline } from "./validate-annual-baseline";
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
  annualHeadPalace: number | null; // provenance
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
  const baselineValidation = validateAnnualBaseline(input.annualBaseline);
  let yearStatus: MonthlyFlowResolutionStatus = baselineValidation.status === "resolved" ? "resolved" : "unavailable";
  const yearReasonCodes = new Set<MonthlyFlowV02ReasonCode>(baselineValidation.reasonCodes);

  if (yearStatus === "unavailable") {
    return {
      status: "unavailable",
      reasonCodes: Array.from(yearReasonCodes),
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

  if (canonicalContexts.rejected || canonicalContexts.contexts.length !== 12) {
    yearReasonCodes.add("canonical-context-unavailable");
    return {
      status: "partial",
      reasonCodes: Array.from(yearReasonCodes),
      annualScoreSource: input.annualBaseline!,
      annualYear: input.annualYear,
      annualStem: input.annualStem,
      annualBranch: input.annualBranch,
      months: []
    };
  }

  const months: MonthlyFlowV02MonthResult[] = [];
  
  const annualContext: MonthlyAnnualContext = {
    annualHeadPalaceIndex: input.annualHeadPalace,
    smallLimitPalaceIndex: input.smallLimitPalace,
    taiTuePalaceIndex: input.taiTuePalace,
    annualHeadStatus: input.annualHeadPalace !== null ? "resolved" : "unavailable",
    smallLimitStatus: input.smallLimitPalace !== null ? "resolved" : "unavailable",
    taiTueStatus: input.taiTuePalace !== null ? "resolved" : "unavailable",
  };

  if (annualContext.annualHeadStatus === "unavailable") {
    yearReasonCodes.add("annual-head-unavailable");
    yearStatus = "partial"; // Provenance missing doesn't break the whole engine but marks it partial
  }

  for (const ctx of canonicalContexts.contexts) {
    let monthStatus: MonthlyFlowResolutionStatus = "resolved";
    const monthReasonCodes = new Set<MonthlyFlowV02ReasonCode>();
    
    if (annualContext.annualHeadStatus === "unavailable") {
      monthStatus = "partial";
      monthReasonCodes.add("annual-head-unavailable");
    }

    const focusPalaceIndex = ctx.identity.focusPalaceIndex;
    const isDauQuanMonth = (ctx.identity.lunarMonth === 1);
    
    // Evaluate Palace
    const targetPalace = input.chart.palaces.find(p => p.index === focusPalaceIndex);
    if (!targetPalace) {
      monthStatus = "unavailable";
      monthReasonCodes.add("focus-palace-unavailable");
      // Cannot proceed with this month
      // Construct empty partial month or continue? 
      // V0.2.2 requirements ask for detailed result object.
      // We will let it fail gracefully later or just provide empty results.
    }

    const evaluated = targetPalace ? evaluatePalace(targetPalace, input.chart.menhElement) : null;
    const palaceRawDelta = evaluated ? evaluated.rawDelta : 0;

    if (evaluated && evaluated.status !== "resolved") {
      if (evaluated.status === "unavailable") monthStatus = "unavailable";
      else if (monthStatus !== "unavailable") monthStatus = "partial";
      evaluated.reasonCodes.forEach(c => monthReasonCodes.add(c));
    }
    
    // Tứ Hóa Event Triggers (using canonical facts)
    const resolvedT = resolveTransformations({
      chart: input.chart,
      canonicalTransformations: ctx.transformations,
      focusPalaceIndex,
      unresolvedTargets: ctx.transformationsPartial ? ["unknown-target"] : [],
      ambiguousTargets: []
    });

    if (resolvedT.resolutionStatus !== "resolved") {
      if (monthStatus !== "unavailable") monthStatus = "partial";
      monthReasonCodes.add("monthly-transformations-partial");
      
      if (resolvedT.unresolvedTargets.length > 0) monthReasonCodes.add("monthly-transformation-target-unresolved");
      if (resolvedT.ambiguousTargets.length > 0) monthReasonCodes.add("monthly-transformation-target-ambiguous");
      if (resolvedT.collisionCandidates.length > 0) monthReasonCodes.add("ji-collision-policy-pending");
    }
    
    const v021Input: MonthlyFlowV021Input = {
      annualBaseline: input.annualBaseline!,
      focusPalaceFacts: {
        focusPalaceIndex: ctx.identity.focusPalaceIndex,
        lunarMonth: ctx.identity.lunarMonth,
        isLeapMonth: ctx.identity.isLeapMonth,
        calendarStem: ctx.identity.calendarStem,
        calendarBranch: ctx.identity.calendarBranch
      },
      annualContext,
      transformationContext: resolvedT,
      isDauQuanMonth,
      palaceRawDelta
    };

    const breakdown = scoreMonth(v021Input);
    const finalScore = breakdown.finalMonthlyScore;

    const domainProjections: MonthlyDomainProjection[] = [];

    months.push({
      status: monthStatus,
      reasonCodes: Array.from(monthReasonCodes),
      diagnostics: {
        unresolvedTransformationTargets: resolvedT.unresolvedTargets,
        ambiguousTransformationTargets: resolvedT.ambiguousTargets
      },
      monthIndex: ctx.identity.lunarMonth,
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
    
    // Rollup month status to year status
    if (monthStatus === "unavailable") yearStatus = "unavailable";
    else if (monthStatus === "partial" && yearStatus !== "unavailable") yearStatus = "partial";
    monthReasonCodes.forEach(c => yearReasonCodes.add(c));
  }

  return {
    status: yearStatus,
    reasonCodes: Array.from(yearReasonCodes),
    annualScoreSource: input.annualBaseline!,
    annualYear: input.annualYear,
    annualStem: input.annualStem,
    annualBranch: input.annualBranch,
    months
  };
}
