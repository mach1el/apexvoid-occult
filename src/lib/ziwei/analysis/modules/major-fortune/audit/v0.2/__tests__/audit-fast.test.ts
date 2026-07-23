import { describe, expect, it } from "vitest";
import {
  assertNoTrainHoldoutLeak,
  expandAllMajorFortuneCycleObservations,
  MF_V02_FAST_CORPUS,
} from "../corpus";
import { runMajorFortuneV02Audit } from "../run-audit";
import { compareV01AgainstFrozen } from "../v01-frozen-control";
import { applyPillarClip } from "../../../v0.2/clip";

describe("Major Fortune V0.2 audit integrity", () => {
  it("expands all Core cycles without train/holdout leak", () => {
    const observations = expandAllMajorFortuneCycleObservations(MF_V02_FAST_CORPUS);
    assertNoTrainHoldoutLeak(observations);
    expect(new Set(observations.map((o) => o.birthChartId)).size).toBe(
      MF_V02_FAST_CORPUS.chartCount,
    );
    expect(observations.length).toBeGreaterThan(MF_V02_FAST_CORPUS.chartCount * 2);
    const identities = new Set(
      observations.map(
        (o) =>
          `${o.birthChartId}|${o.school}|${o.cycleIndex}|${o.activePalaceIndex}|${o.startAge}-${o.endAge}`,
      ),
    );
    expect(identities.size).toBe(observations.length);
    expect(observations.every((o) => Number.isFinite(o.selectedAnnualYear))).toBe(true);
  });

  it("passes hard gates on fast all-cycle corpus", () => {
    const metrics = runMajorFortuneV02Audit(MF_V02_FAST_CORPUS);
    expect(metrics.chartCount).toBe(MF_V02_FAST_CORPUS.chartCount);
    expect(metrics.cycleObservationCount).toBeGreaterThan(metrics.chartCount);
    expect(metrics.includeAllAvailableMajorFortuneCycles).toBe(true);
    expect(metrics.scoreBoundsFailures).toBe(0);
    expect(metrics.cappedDeltaOutOfBoundsFailures).toBe(0);
    expect(metrics.annualYearIndependenceFailures).toBe(0);
    expect(metrics.deterministicRerunFailures).toBe(0);
    expect(metrics.v01Deterministic).toBe(true);
    expect(metrics.v01FrozenControlEquivalent).toBe(true);
    expect(metrics.score.nanOrInfinity).toBe(0);
    expect(metrics.hardGateFailures).toEqual([]);
    expect(metrics.train.observationCount + metrics.holdout.observationCount).toBe(
      metrics.cycleObservationCount,
    );
    for (const rate of Object.values(metrics.pillarClipRate)) {
      expect(rate).toBeLessThanOrEqual(1);
    }
  });

  it("clip rate semantics: raw over cap is clip not hard fail", () => {
    const r = applyPillarClip(40, 30);
    expect(r.clipped).toBe(true);
    expect(r.cappedDelta).toBe(30);
  });

  it("frozen V0.1 control compares against committed fixture", () => {
    const cmp = compareV01AgainstFrozen();
    expect(cmp.v01Deterministic).toBe(true);
    expect(cmp.v01FrozenControlEquivalent).toBe(true);
    expect(cmp.failures).toEqual([]);
  });
});
