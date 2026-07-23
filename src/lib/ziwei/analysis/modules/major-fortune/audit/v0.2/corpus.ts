import { calculate as calculateNamPhai } from "../../../../../engine-nam-phai";
import { calculate as calculateTrungChau } from "../../../../../engine-trung-chau";
import type { BirthInput, ChartData } from "../../../../../../../types/chart";
import type { ZiweiSchool } from "../../../../facts";

const HOUR_BRANCHES = [
  "Tý",
  "Sửu",
  "Dần",
  "Mão",
  "Thìn",
  "Tỵ",
  "Ngọ",
  "Mùi",
  "Thân",
  "Dậu",
  "Tuất",
  "Hợi",
] as const;

export interface MajorFortuneV02CorpusContract {
  corpusId: string;
  seed: number;
  chartCount: number;
  trainCount: number;
  holdoutCount: number;
  timezone: string;
  /** Probe year only — cycle expansion selects per-cycle annualYear. */
  probeAnnualYear: number;
  flowBase: "luu-nien";
  includeAllAvailableMajorFortuneCycles: true;
  productFixturesOutsideCalibration: true;
}

export const MF_V02_FULL_CORPUS: MajorFortuneV02CorpusContract = {
  corpusId: "major-fortune-v0.2-audit-corpus",
  seed: 20260723,
  chartCount: 100,
  trainCount: 80,
  holdoutCount: 20,
  timezone: "7",
  probeAnnualYear: 2026,
  flowBase: "luu-nien",
  includeAllAvailableMajorFortuneCycles: true,
  productFixturesOutsideCalibration: true,
};

export const MF_V02_FAST_CORPUS: MajorFortuneV02CorpusContract = {
  ...MF_V02_FULL_CORPUS,
  corpusId: "major-fortune-v0.2-audit-fast",
  chartCount: 8,
  trainCount: 6,
  holdoutCount: 2,
};

export interface MajorFortuneV02BirthChartSpec {
  birthChartId: string;
  split: "train" | "holdout";
  baseInput: BirthInput;
}

export interface MajorFortuneV02CycleObservation {
  birthChartId: string;
  split: "train" | "holdout";
  school: ZiweiSchool;
  cycleIndex: number;
  startAge: number;
  endAge: number;
  activePalaceIndex: number;
  /** annualYear used only to resolve this cycle via Core age mapping. */
  selectedAnnualYear: number;
  input: BirthInput;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledRange(rand: () => number, count: number): number[] {
  const values = Array.from({ length: count }, (_, i) => i);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [values[i], values[j]] = [values[j]!, values[i]!];
  }
  return values;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function calculateChart(school: ZiweiSchool, input: BirthInput): ChartData {
  return school === "nam-phai" ? calculateNamPhai(input) : calculateTrungChau(input);
}

/**
 * Build 100 unique deterministic birth charts; split train/holdout at chart level.
 */
export function buildMajorFortuneV02BirthCharts(
  contract: MajorFortuneV02CorpusContract,
): MajorFortuneV02BirthChartSpec[] {
  const rand = mulberry32(contract.seed);
  const yearOffsets = shuffledRange(rand, 40);
  const monthOffsets = shuffledRange(rand, 12);
  const dayOffsets = shuffledRange(rand, 28);
  const hourOffsets = shuffledRange(rand, HOUR_BRANCHES.length);
  const out: MajorFortuneV02BirthChartSpec[] = [];

  for (let i = 0; i < contract.chartCount; i++) {
    const gender = i % 2 === 0 ? "female" : "male";
    const year = 1960 + yearOffsets[(i * 7) % yearOffsets.length]!;
    const month = 1 + monthOffsets[(i * 5) % monthOffsets.length]!;
    const day = 1 + dayOffsets[(i * 11) % dayOffsets.length]!;
    const hour = HOUR_BRANCHES[hourOffsets[(i * 7) % hourOffsets.length]!]!;
    const birthChartId = `mfv02-chart-${String(i).padStart(3, "0")}`;
    out.push({
      birthChartId,
      split: i < contract.trainCount ? "train" : "holdout",
      baseInput: {
        solarDate: `${year}-${pad2(month)}-${pad2(day)}`,
        birthHour: hour,
        gender,
        timezone: contract.timezone,
        annualYear: String(contract.probeAnnualYear),
        flowBase: contract.flowBase,
      },
    });
  }
  return out;
}

/** @deprecated use buildMajorFortuneV02BirthCharts */
export function buildMajorFortuneV02BirthInputs(
  contract: MajorFortuneV02CorpusContract,
): BirthInput[] {
  return buildMajorFortuneV02BirthCharts(contract).map((c) => c.baseInput);
}

export function splitTrainHoldout<T>(
  items: readonly T[],
  trainCount: number,
): { train: T[]; holdout: T[] } {
  return {
    train: items.slice(0, trainCount) as T[],
    holdout: items.slice(trainCount) as T[],
  };
}

interface CycleDescriptor {
  cycleIndex: number;
  startAge: number;
  endAge: number;
  activePalaceIndex: number;
}

function listCyclesFromProbe(chart: ChartData): CycleDescriptor[] {
  const cycles: CycleDescriptor[] = [];
  for (const palace of chart.palaces) {
    const mf = palace.majorFortune;
    if (!mf || mf.order === undefined || mf.start === undefined || mf.end === undefined) continue;
    cycles.push({
      cycleIndex: mf.order,
      startAge: mf.start,
      endAge: mf.end,
      activePalaceIndex: palace.index,
    });
  }
  cycles.sort((a, b) => a.cycleIndex - b.cycleIndex);
  return cycles;
}

/**
 * Expand each birth chart × school into every Core-supported Major Fortune cycle.
 * annualYear is chosen so nominalAge = lunar.year offset lands inside the cycle.
 */
export function expandAllMajorFortuneCycleObservations(
  contract: MajorFortuneV02CorpusContract,
  schools: readonly ZiweiSchool[] = ["nam-phai", "trung-chau"],
): MajorFortuneV02CycleObservation[] {
  const charts = buildMajorFortuneV02BirthCharts(contract);
  const observations: MajorFortuneV02CycleObservation[] = [];
  const identityKeys = new Set<string>();

  for (const chartSpec of charts) {
    for (const school of schools) {
      const probe = calculateChart(school, chartSpec.baseInput);
      const lunarYear = probe.lunar.year;
      const cycles = listCyclesFromProbe(probe);
      if (cycles.length === 0) {
        throw new Error(`no major fortune cycles for ${chartSpec.birthChartId}/${school}`);
      }

      for (const cycle of cycles) {
        let resolved: ChartData | null = null;
        let selectedAnnualYear: number | null = null;
        // Core clamps annualYear to [1900, 2100]. Only cycles reachable inside
        // that window are "available" for audit expansion.
        for (let age = cycle.startAge; age <= cycle.endAge; age++) {
          const candidateYear = lunarYear + age - 1;
          if (candidateYear < 1900 || candidateYear > 2100) continue;
          const input: BirthInput = {
            ...chartSpec.baseInput,
            annualYear: String(candidateYear),
          };
          const chart = calculateChart(school, input);
          const active = chart.majorFortunePalace;
          if (
            active?.majorFortune?.order === cycle.cycleIndex &&
            active.index === cycle.activePalaceIndex
          ) {
            resolved = chart;
            selectedAnnualYear = candidateYear;
            break;
          }
        }
        if (!resolved || selectedAnnualYear == null || !resolved.majorFortunePalace) {
          // Unreachable under Core annualYear clamp — skip, do not claim.
          continue;
        }

        const active = resolved.majorFortunePalace;
        const identity = `${chartSpec.birthChartId}|${school}|${cycle.cycleIndex}|${active.index}|${cycle.startAge}-${cycle.endAge}`;
        if (identityKeys.has(identity)) {
          throw new Error(`duplicate cycle identity ${identity}`);
        }
        identityKeys.add(identity);

        observations.push({
          birthChartId: chartSpec.birthChartId,
          split: chartSpec.split,
          school,
          cycleIndex: cycle.cycleIndex,
          startAge: cycle.startAge,
          endAge: cycle.endAge,
          activePalaceIndex: active.index,
          selectedAnnualYear,
          input: {
            ...chartSpec.baseInput,
            annualYear: String(selectedAnnualYear),
          },
        });
      }
    }
  }

  return observations;
}

export function assertNoTrainHoldoutLeak(observations: readonly MajorFortuneV02CycleObservation[]): void {
  const trainCharts = new Set(
    observations.filter((o) => o.split === "train").map((o) => o.birthChartId),
  );
  const holdoutCharts = new Set(
    observations.filter((o) => o.split === "holdout").map((o) => o.birthChartId),
  );
  for (const id of trainCharts) {
    if (holdoutCharts.has(id)) {
      throw new Error(`birth chart ${id} leaked across train/holdout`);
    }
  }
}
