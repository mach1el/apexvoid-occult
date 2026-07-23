import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { calculate as calculateTrungChau } from "@/lib/ziwei/engine-trung-chau";
import type { BirthInput, ChartData } from "@/types/chart";
import {
  analyzeMajorFortuneTimelineV03,
  deriveThreePillarBase,
} from "@/lib/ziwei/analysis/modules/major-fortune/v0.3-ordinal-timeline";
import { analyzeMajorFortuneOrdinalV03 } from "@/lib/ziwei/analysis/modules/major-fortune/v0.3-ordinal-adapter";
import { resolveMajorFortuneMutagensForStem } from "@/lib/ziwei/calculation/resolve-major-fortune-mutagens";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

function scoreFingerprint(
  points: ReturnType<typeof analyzeMajorFortuneTimelineV03>["points"],
) {
  return points.map((p) => ({
    cycleIndex: p.cycleIndex,
    startAge: p.startAge,
    endAge: p.endAge,
    activePalaceIndex: p.activePalaceIndex,
    totalScore: p.totalScore,
    threePillarBaseScore: p.threePillarBaseScore,
    tuHoaDelta: p.tuHoaDelta,
    band: p.band,
    status: p.status,
    scoreState: p.scoreState,
    scoringCoverageWeight: p.scoringCoverageWeight,
    contextCoverageWeight: p.contextCoverageWeight,
    pillarLevels: p.pillars
      ? Object.fromEntries(
          Object.entries(p.pillars).map(([k, v]) => [k, { level: v.level, delta: v.delta }]),
        )
      : null,
  }));
}

describe("analyzeMajorFortuneTimelineV03", () => {
  it("returns all valid Major Fortune cycles sorted by age", () => {
    const chart = calculateTrungChau(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    const palaceCycles = chart.palaces.filter(
      (p) =>
        p.majorFortune &&
        p.majorFortune.order !== undefined &&
        p.majorFortune.start !== undefined &&
        p.majorFortune.end !== undefined,
    );
    expect(timeline.points.length).toBe(palaceCycles.length);
    expect(timeline.points.length).toBeGreaterThan(1);
    for (let i = 1; i < timeline.points.length; i++) {
      const prev = timeline.points[i - 1]!;
      const cur = timeline.points[i]!;
      expect(cur.startAge).toBeGreaterThanOrEqual(prev.startAge);
      if (cur.startAge === prev.startAge) {
        expect(cur.cycleIndex).toBeGreaterThanOrEqual(prev.cycleIndex);
      }
    }
    for (const p of timeline.points) {
      expect(p.ageLabel).toBe(`${p.startAge}–${p.endAge}`);
    }
  });

  it("does not hardcode cycle count and is deterministic", () => {
    const chart = calculateNamPhai(REGRESSION);
    const a = analyzeMajorFortuneTimelineV03(chart, { school: "nam-phai" });
    const b = analyzeMajorFortuneTimelineV03(chart, { school: "nam-phai" });
    const expected = chart.palaces.filter(
      (p) =>
        p.majorFortune?.order !== undefined &&
        p.majorFortune?.start !== undefined &&
        p.majorFortune?.end !== undefined,
    ).length;
    expect(a.points.length).toBe(expected);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("does not mutate ChartData", () => {
    const chart = calculateTrungChau(REGRESSION);
    const beforeActive = chart.majorFortunePalace?.index;
    const beforePalaces = chart.palaces.map((p) => ({
      index: p.index,
      stem: p.stem,
      mf: p.majorFortune ? { ...p.majorFortune } : null,
      starCount: p.stars?.length ?? 0,
    }));
    const beforeMutagens = (chart.majorMutagens ?? []).map((m) => ({
      mutagen: m.mutagen,
      starName: m.starName,
      palaceIndex: m.palace?.index ?? null,
    }));
    analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    expect(chart.majorFortunePalace?.index).toBe(beforeActive);
    expect(
      chart.palaces.map((p) => ({
        index: p.index,
        stem: p.stem,
        mf: p.majorFortune ? { ...p.majorFortune } : null,
        starCount: p.stars?.length ?? 0,
      })),
    ).toEqual(beforePalaces);
    expect(
      (chart.majorMutagens ?? []).map((m) => ({
        mutagen: m.mutagen,
        starName: m.starName,
        palaceIndex: m.palace?.index ?? null,
      })),
    ).toEqual(beforeMutagens);
  });

  it("keeps scores in 0–100 and never converts unavailable to zero", () => {
    const chart = calculateTrungChau(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    for (const p of timeline.points) {
      if (p.totalScore != null) {
        expect(p.totalScore).toBeGreaterThanOrEqual(0);
        expect(p.totalScore).toBeLessThanOrEqual(100);
      }
      if (p.status === "unavailable") {
        expect(p.totalScore).toBeNull();
      }
    }
  });

  it("detects current cycle without affecting scores", () => {
    const chart = calculateTrungChau(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    expect(timeline.currentCycleIndex).not.toBeNull();
    const current = timeline.points.find((p) => p.isCurrentCycle);
    expect(current).toBeTruthy();
    expect(current!.activePalaceIndex).toBe(chart.majorFortunePalace!.index);
    const single = analyzeMajorFortuneOrdinalV03(chart, { school: "trung-chau" });
    expect(current!.totalScore).toBe(single.result?.score ?? null);
  });

  it("annual-year change preserves all point scores (marker may move)", () => {
    const baseInput = { ...REGRESSION };
    const chartA = calculateTrungChau(baseInput);
    const timelineA = analyzeMajorFortuneTimelineV03(chartA, { school: "trung-chau" });

    const otherYear = String(Number(baseInput.annualYear) + 12);
    const chartB = calculateTrungChau({ ...baseInput, annualYear: otherYear });
    const timelineB = analyzeMajorFortuneTimelineV03(chartB, { school: "trung-chau" });

    expect(scoreFingerprint(timelineA.points)).toEqual(scoreFingerprint(timelineB.points));
    // Marker fields may differ
    expect(timelineA.points.some((p) => p.isCurrentCycle)).toBe(true);
  });

  it("Nam Phái retains partial Tứ Hóa and 75% scoring coverage", () => {
    const chart = calculateNamPhai(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "nam-phai" });
    expect(timeline.points.length).toBeGreaterThan(0);
    for (const p of timeline.points) {
      expect(p.pillars?.["tu-hoa-sat-tinh"].level).toBeNull();
      expect(p.pillars?.["tu-hoa-sat-tinh"].state).toBe("partial-data");
      if (p.status !== "unavailable") {
        expect(p.scoringCoverageWeight).toBe(0.75);
        expect(p.contextCoverageWeight).toBe(1);
      }
    }
  });

  it("Trung Châu transformations are resolved per cycle, not reused from current", () => {
    const chart = calculateTrungChau(REGRESSION);
    const currentStem = chart.majorFortunePalace?.stem;
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    const other = timeline.points.find(
      (p) => !p.isCurrentCycle && p.fortuneStem && p.fortuneStem !== currentStem,
    );
    expect(other).toBeTruthy();
    const otherMutagens = resolveMajorFortuneMutagensForStem(
      "trung-chau",
      other!.fortuneStem!,
      chart.palaces,
    );
    const currentMutagens = chart.majorMutagens ?? [];
    // Physical targets differ when stems differ — evidence must not be identical sets.
    const otherXf = other!.analysis?.emittedEvidence.filter(
      (e) => e.signalFamilyId === "major-fortune-transformations",
    );
    const currentPoint = timeline.points.find((p) => p.isCurrentCycle)!;
    const currentXf = currentPoint.analysis?.emittedEvidence.filter(
      (e) => e.signalFamilyId === "major-fortune-transformations",
    );
    if ((otherXf?.length ?? 0) > 0 || (currentXf?.length ?? 0) > 0) {
      expect(JSON.stringify(otherXf)).not.toEqual(JSON.stringify(currentXf));
    }
    expect(otherMutagens.length).toBeGreaterThan(0);
    expect(currentMutagens.length).toBeGreaterThan(0);
  });

  it("enforces direct-palace transformation frame on timeline points", () => {
    const chart = calculateTrungChau(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    for (const p of timeline.points) {
      const xf = (p.analysis?.emittedEvidence ?? []).filter(
        (e) => e.signalFamilyId === "major-fortune-transformations",
      );
      for (const e of xf) {
        expect(e.transformationTuple?.targetPalaceIndex).toBe(p.activePalaceIndex);
      }
    }
  });

  it("derives three-pillar base and Tứ Hóa delta", () => {
    const chart = calculateTrungChau(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    const withScore = timeline.points.find((p) => p.totalScore != null && p.pillars);
    expect(withScore).toBeTruthy();
    const base = deriveThreePillarBase(withScore!.pillars!);
    expect(base).toBe(withScore!.threePillarBaseScore);
    expect(withScore!.tuHoaDelta).toBeCloseTo(
      (withScore!.totalScore ?? 0) - (withScore!.threePillarBaseScore ?? 0),
      5,
    );
  });
});

describe("resolveMajorFortuneMutagensForStem", () => {
  it("matches chart.majorMutagens for the active Trung Châu stem", () => {
    const chart = calculateTrungChau(REGRESSION);
    const stem = chart.majorFortunePalace!.stem!;
    const resolved = resolveMajorFortuneMutagensForStem("trung-chau", stem, chart.palaces);
    const core = chart.majorMutagens ?? [];
    expect(resolved.map((r) => `${r.mutagen}:${r.starName}:${r.palace?.index}`).sort()).toEqual(
      core.map((r) => `${r.mutagen}:${r.starName}:${r.palace?.index}`).sort(),
    );
  });
});

describe("ChartData immutability typing smoke", () => {
  it("accepts ChartData without requiring mutation helpers", () => {
    const chart: ChartData = calculateNamPhai(REGRESSION);
    expect(chart.palaces.length).toBe(12);
  });
});
