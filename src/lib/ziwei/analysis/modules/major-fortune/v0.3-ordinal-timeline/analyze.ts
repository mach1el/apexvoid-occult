/**
 * Major Fortune V0.3 lifetime timeline analysis.
 * Visualization / multi-cycle analysis only — does not change the ordinal formula.
 */
import type { ChartData } from "@/types/chart";
import type { ZiweiSchool } from "../../../facts";
import type {
  MajorFortuneOrdinalBandId,
  MajorFortuneOrdinalResult,
  MajorFortuneOrdinalScoreState,
} from "../v0.3-ordinal/types";
import { analyzeMajorFortuneOrdinalV03 } from "../v0.3-ordinal-adapter/analyze";
import type { MajorFortuneOrdinalV03Analysis } from "../v0.3-ordinal-adapter/types";

export interface MajorFortuneTimelinePoint {
  cycleIndex: number;
  startAge: number;
  endAge: number;
  ageLabel: string;

  activePalaceIndex: number;
  activePalaceName: string;
  activePalaceBranch: string;
  fortuneStem?: string;

  totalScore: number | null;
  threePillarBaseScore: number | null;
  tuHoaDelta: number;

  band: MajorFortuneOrdinalBandId | null;
  status: "available" | "partial" | "unavailable";
  scoreState: MajorFortuneOrdinalScoreState;

  contextCoverageWeight: number;
  scoringCoverageWeight: number;

  pillars: MajorFortuneOrdinalResult["pillars"] | null;
  analysis: MajorFortuneOrdinalV03Analysis | null;

  isCurrentCycle: boolean;
}

export interface MajorFortuneTimelineDiagnostics {
  incompleteCycleMetadata: string[];
  missingCurrentCycle: string[];
  notes: string[];
}

export interface MajorFortuneTimelineResult {
  model: "v0.3-ordinal-timeline";
  school: ZiweiSchool;
  points: MajorFortuneTimelinePoint[];
  currentCycleIndex: number | null;
  diagnostics: MajorFortuneTimelineDiagnostics;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function deriveThreePillarBase(
  pillars: MajorFortuneOrdinalResult["pillars"] | null | undefined,
): number | null {
  if (!pillars) return null;
  const thien = pillars["thien-thoi"];
  const dia = pillars["dia-loi"];
  const nhan = pillars["nhan-hoa"];
  if (!thien || !dia || !nhan) return null;
  // Use evaluator deltas (0 when level null / partial) — visualization only.
  return clampScore(50 + thien.delta + dia.delta + nhan.delta);
}

function listValidCycles(chart: ChartData): {
  valid: Array<{
    cycleIndex: number;
    startAge: number;
    endAge: number;
    activePalaceIndex: number;
    activePalaceName: string;
    activePalaceBranch: string;
    fortuneStem?: string;
  }>;
  incomplete: string[];
} {
  const incomplete: string[] = [];
  const valid = [];
  for (const palace of chart.palaces) {
    const mf = palace.majorFortune;
    if (!mf) {
      incomplete.push(`palace:${palace.index}:missing-majorFortune`);
      continue;
    }
    if (
      mf.order === undefined ||
      mf.start === undefined ||
      mf.end === undefined ||
      !Number.isFinite(mf.order) ||
      !Number.isFinite(mf.start) ||
      !Number.isFinite(mf.end)
    ) {
      incomplete.push(
        `palace:${palace.index}:${palace.name}:incomplete:${mf.order ?? "?"}-${mf.start ?? "?"}-${mf.end ?? "?"}`,
      );
      continue;
    }
    valid.push({
      cycleIndex: mf.order,
      startAge: mf.start,
      endAge: mf.end,
      activePalaceIndex: palace.index,
      activePalaceName: palace.name,
      activePalaceBranch: palace.branch,
      fortuneStem: palace.stem ?? undefined,
    });
  }
  valid.sort((a, b) => {
    if (a.startAge !== b.startAge) return a.startAge - b.startAge;
    return a.cycleIndex - b.cycleIndex;
  });
  return { valid, incomplete };
}

function resolveCurrentCycleIndex(
  chart: ChartData,
  points: Array<{ cycleIndex: number; activePalaceIndex: number }>,
  diagnostics: MajorFortuneTimelineDiagnostics,
): number | null {
  const active = chart.majorFortunePalace;
  if (!active) {
    diagnostics.missingCurrentCycle.push("chart:no-active-major-fortune-palace");
    return null;
  }
  const byIndex = points.find((p) => p.activePalaceIndex === active.index);
  if (byIndex) return byIndex.cycleIndex;
  const order = active.majorFortune?.order;
  if (order !== undefined) {
    const byOrder = points.find((p) => p.cycleIndex === order);
    if (byOrder) return byOrder.cycleIndex;
  }
  diagnostics.missingCurrentCycle.push(
    `active-palace-not-in-timeline:${active.index}:${active.name}`,
  );
  return null;
}

/**
 * Analyze every Calculation-Core-resolved Major Fortune cycle on the chart.
 * Does not mutate ChartData. Scores are independent of annual/monthly facts.
 */
export function analyzeMajorFortuneTimelineV03(
  chart: ChartData,
  options: { school: ZiweiSchool },
): MajorFortuneTimelineResult {
  const diagnostics: MajorFortuneTimelineDiagnostics = {
    incompleteCycleMetadata: [],
    missingCurrentCycle: [],
    notes: [],
  };

  const { valid, incomplete } = listValidCycles(chart);
  diagnostics.incompleteCycleMetadata = incomplete;

  const points: MajorFortuneTimelinePoint[] = [];

  for (const cycle of valid) {
    const analysis = analyzeMajorFortuneOrdinalV03(chart, {
      school: options.school,
      cycleOverride: {
        cycleIndex: cycle.cycleIndex,
        startAge: cycle.startAge,
        endAge: cycle.endAge,
        activePalaceIndex: cycle.activePalaceIndex,
      },
    });

    const result = analysis.result;
    const totalScore = result?.score ?? null;
    const threePillarBaseScore = deriveThreePillarBase(result?.pillars ?? null);
    const tuHoaDelta =
      totalScore == null || threePillarBaseScore == null
        ? 0
        : totalScore - threePillarBaseScore;

    const status: MajorFortuneTimelinePoint["status"] =
      !result || analysis.adapterStatus === "unavailable"
        ? "unavailable"
        : result.status === "partial" || analysis.adapterStatus === "partial"
          ? "partial"
          : "available";

    points.push({
      cycleIndex: cycle.cycleIndex,
      startAge: cycle.startAge,
      endAge: cycle.endAge,
      ageLabel: `${cycle.startAge}–${cycle.endAge}`,
      activePalaceIndex: cycle.activePalaceIndex,
      activePalaceName: cycle.activePalaceName,
      activePalaceBranch: cycle.activePalaceBranch,
      fortuneStem: cycle.fortuneStem,
      totalScore,
      threePillarBaseScore,
      tuHoaDelta,
      band: result?.band ?? null,
      status,
      scoreState: result?.scoreState ?? "unavailable",
      contextCoverageWeight: result?.coverage.contextCoverageWeight ?? 0,
      scoringCoverageWeight: result?.coverage.scoringCoverageWeight ?? 0,
      pillars: result?.pillars ?? null,
      analysis,
      isCurrentCycle: false,
    });
  }

  const currentCycleIndex = resolveCurrentCycleIndex(chart, points, diagnostics);
  for (const point of points) {
    point.isCurrentCycle =
      currentCycleIndex != null && point.cycleIndex === currentCycleIndex;
  }

  return {
    model: "v0.3-ordinal-timeline",
    school: options.school,
    points,
    currentCycleIndex,
    diagnostics,
  };
}

export { deriveThreePillarBase };
