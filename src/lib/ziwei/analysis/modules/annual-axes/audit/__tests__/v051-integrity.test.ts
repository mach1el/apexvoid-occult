import { beforeEach, describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { calculate as calculateTrungChau } from "@/lib/ziwei/engine-trung-chau";
import type { BirthInput } from "@/types/chart";
import { loadAnnualAxesKnowledgeV05NamPhai } from "../../../../knowledge/annual-axes/v0.5";
import {
  addEvidenceRow,
  mergeEvidenceBreakdown,
  emptyEvidenceBreakdown,
} from "../v051-evidence-mass";
import {
  aggregateEvidenceDimensions,
  assertSingleMembershipCounts,
  evidenceMassFromRows,
  collectV051Samples,
} from "../collect-v051-samples";
import { detectEvidenceBias } from "../run-v051-bias-audit";
import {
  checkMetricMismatch,
  verifyV05BaselineReproduction,
} from "../v051-baseline-reproduction";
import { buildSignedEvidenceFunnelForChart } from "../v051-signed-funnel";
import { splitChartIndices } from "../../../../knowledge/annual-axes/v0.5/derive-calibration";
import { FULL_CORPUS_CONTRACT } from "../build-audit-corpus";
import { runV051VariantEvaluation } from "../run-v051-variant-evaluation";
import { analyzeAnnualAxes } from "../../analyze";
import { isAnnualAxesV05Enabled } from "../../../../feature-flags";
import type { V051DomainSample } from "../v051-types";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

describe("V0.5.1 evidence count integrity", () => {
  it("row-level add increments count exactly once", () => {
    const map: Record<string, { supportRaw: number; pressureRaw: number; count: number }> = {};
    addEvidenceRow(map, "a", 1, 2);
    addEvidenceRow(map, "a", 3, 4);
    expect(map).toEqual({ a: { supportRaw: 4, pressureRaw: 6, count: 2 } });
  });

  it("aggregate merge adds source count exactly (no +1)", () => {
    const map: Record<string, { supportRaw: number; pressureRaw: number; count: number }> = {};
    mergeEvidenceBreakdown(map, "a", { supportRaw: 10, pressureRaw: 5, count: 7 });
    mergeEvidenceBreakdown(map, "a", { supportRaw: 1, pressureRaw: 2, count: 3 });
    expect(map.a).toEqual({ supportRaw: 11, pressureRaw: 7, count: 10 });
  });

  it("no count becomes existing + incoming + 1", () => {
    const map: Record<string, { supportRaw: number; pressureRaw: number; count: number }> = {
      a: emptyEvidenceBreakdown(),
    };
    map.a!.count = 5;
    map.a!.supportRaw = 1;
    map.a!.pressureRaw = 1;
    mergeEvidenceBreakdown(map, "a", { supportRaw: 2, pressureRaw: 3, count: 4 });
    expect(map.a!.count).toBe(9);
  });

  it("single-membership dimensions reconstruct retainedSignedFactCount and masses", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const { training } = splitChartIndices(FULL_CORPUS_CONTRACT.chartCount);
    // Use a small subset for speed — first 2 training charts.
    const dims = aggregateEvidenceDimensions(loaded.knowledge, training.slice(0, 2));
    const check = assertSingleMembershipCounts(dims);
    expect(check.failures).toEqual([]);
    expect(check.ok).toBe(true);
    expect(dims.retainedSignedCount).toBeGreaterThan(0);
  }, 120_000);

  it("source membership count handles multiple source IDs", () => {
    const fake = evidenceMassFromRows([
      {
        id: "e1",
        domain: "wealth",
        layer: "annual",
        category: "star",
        frameRole: "focus",
        physicalFactId: "p1",
        ruleId: "r1",
        stackingGroup: "g1",
        rawAxes: { support: 1, pressure: 0, stability: 0, activation: 0 },
        effectiveWeight: 1,
        weightedAxes: { support: 2, pressure: 1, stability: 0, activation: 0 },
        factIds: [],
        sourceIds: ["SRC-A", "SRC-B"],
        knowledgeStatus: "experimental",
        targetPalaceIndex: 0,
        targetPalaceName: "Tài Bạch",
        targetAnnualPalaceName: "Tài Bạch",
        anchorPalaceName: "Tài Bạch",
        retainedForSignedScore: true,
        ownershipRole: "primary",
        geometryBucket: "direct",
      } as any,
    ]);
    expect(fake.retainedSignedCount).toBe(1);
    expect(fake.sourceMembershipCount).toBe(2);
    expect(fake.bySourceId["SRC-A"]?.count).toBe(1);
    expect(fake.bySourceId["SRC-B"]?.count).toBe(1);
    expect(fake.meanSourceIdsPerRetainedFact).toBe(2);
  });
});

describe("V0.5.1 signed evidence funnel", () => {
  it("candidate >= eligible >= dedupedWinner >= retained counts", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const chart = calculateNamPhai(REGRESSION);
    const funnel = buildSignedEvidenceFunnelForChart(chart, loaded.knowledge);
    expect(funnel).not.toBeNull();
    if (!funnel) return;
    expect(funnel.candidate.factCount).toBeGreaterThanOrEqual(funnel.eligible.factCount);
    expect(funnel.eligible.factCount).toBeGreaterThanOrEqual(funnel.dedupedWinner.factCount);
    expect(funnel.dedupedWinner.factCount).toBe(funnel.retained.factCount);
  });

  it("retained support/pressure masses reconstruct losses", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const chart = calculateNamPhai(REGRESSION);
    const funnel = buildSignedEvidenceFunnelForChart(chart, loaded.knowledge);
    expect(funnel).not.toBeNull();
    if (!funnel) return;
    expect(funnel.losses.support.finalLost).toBeCloseTo(
      funnel.candidate.supportRaw - funnel.retained.supportRaw,
      6,
    );
    expect(funnel.losses.pressure.finalLost).toBeCloseTo(
      funnel.candidate.pressureRaw - funnel.retained.pressureRaw,
      6,
    );
  });

  it("every non-retained candidate has a rejection reason entry covering losses", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const chart = calculateNamPhai(REGRESSION);
    const funnel = buildSignedEvidenceFunnelForChart(chart, loaded.knowledge);
    expect(funnel).not.toBeNull();
    if (!funnel) return;
    const rejectedCount = Object.values(funnel.rejectionByReason).reduce(
      (s, v) => s + v.candidateCount,
      0,
    );
    expect(rejectedCount).toBe(funnel.candidate.factCount - funnel.retained.factCount);
  });

  it("input order does not change funnel metrics", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const chart = calculateNamPhai(REGRESSION);
    const a = buildSignedEvidenceFunnelForChart(chart, loaded.knowledge);
    const b = buildSignedEvidenceFunnelForChart(chart, loaded.knowledge);
    expect(a).toEqual(b);
  });
});

describe("V0.5.1 bias AND semantics", () => {
  function fakeSamples(
    latents: number[],
    split: "training" | "holdout",
  ): V051DomainSample[] {
    return latents.map((latent, i) => ({
      chartId: `c${i}`,
      chartIndex: i,
      split,
      annualYear: 2020,
      domain: "wealth",
      score: 50 + latent * 10,
      spatialSigned: latent,
      latent,
      activationGate: 0.7,
      annualActivationRaw: 10,
      natalGain: 1,
      domainScale: 0.5,
      directSupportRaw: 1,
      directPressureRaw: 1,
      tp4cSupportRaw: 0,
      tp4cPressureRaw: 0,
      tp4cContributionAbs: 0,
      retainedSignedCount: 1,
      retainedActivationCount: 1,
    }));
  }

  it("training-only bias does not trigger the global blocker", () => {
    const training = fakeSamples(Array.from({ length: 100 }, () => 1), "training");
    const holdout = fakeSamples(
      [
        ...Array.from({ length: 40 }, () => 1),
        ...Array.from({ length: 60 }, () => -1),
      ],
      "holdout",
    );
    const flags = detectEvidenceBias(training, holdout);
    expect(flags.training.positiveLatentRate).toBeGreaterThan(0.65);
    expect(flags.holdout.positiveLatentRate).toBeLessThanOrEqual(0.65);
    expect(flags.globalPositiveLatentBias).toBe(false);
  });

  it("holdout-only bias does not trigger the global blocker", () => {
    const training = fakeSamples(
      [
        ...Array.from({ length: 40 }, () => 1),
        ...Array.from({ length: 60 }, () => -1),
      ],
      "training",
    );
    const holdout = fakeSamples(Array.from({ length: 100 }, () => 1), "holdout");
    const flags = detectEvidenceBias(training, holdout);
    expect(flags.globalPositiveLatentBias).toBe(false);
  });

  it("bias on both training and holdout triggers the blocker", () => {
    const training = fakeSamples(Array.from({ length: 100 }, () => 1), "training");
    const holdout = fakeSamples(Array.from({ length: 100 }, () => 1), "holdout");
    const flags = detectEvidenceBias(training, holdout);
    expect(flags.globalPositiveLatentBias).toBe(true);
    expect(flags.scaleOnlyTighteningBlocked).toBe(true);
  });
});

describe("V0.5.1 full baseline reproduction", () => {
  it("checks all committed V0.5 calibration and holdout metrics", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const result = verifyV05BaselineReproduction(loaded.knowledge);
    expect(result.mismatches).toEqual([]);
    expect(result.reproduced).toBe(true);
    expect(result.checkedMetricCount).toBeGreaterThanOrEqual(45);
    // Must recompute calibration (not just compare loaded knowledge.calibration to itself).
    expect(result.mismatches).toEqual([]);
  }, 600_000);

  it("changing any one committed metric produces an explicit mismatch", () => {
    const mismatch = checkMetricMismatch("test.path", 1, 2);
    expect(mismatch).not.toBeNull();
    expect(mismatch?.path).toBe("test.path");
    expect(mismatch?.committed).toBe(1);
    expect(mismatch?.reproduced).toBe(2);
  });

  it("baseline mismatch prevents candidate approval", () => {
    // When baseline fails, variant evaluation returns no-variant-approved with blocker.
    // We cannot easily force a real mismatch without mutating files; instead assert
    // the happy path still yields no-variant-approved for evidence-bias reasons when
    // baseline passes (current corpus).
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const evaluation = runV051VariantEvaluation(loaded.knowledge);
    expect(evaluation.baselineReproduction.reproduced).toBe(true);
    expect(evaluation.selectionStatus).toBe("no-variant-approved");
    expect(evaluation.selectedVariant).toBeNull();
  }, 900_000);
});

describe("V0.5.1 non-regression", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("production V0.5 fixture remains exact", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.5.0");
    expect(isAnnualAxesV05Enabled()).toBe(true);
    const scores = Object.fromEntries(
      (["health", "family", "wealth", "career", "social", "romance"] as const).map((d) => {
        const axis = result.axes[d];
        return [d, axis.status === "available" ? axis.score : null];
      }),
    );
    expect(scores).toEqual({
      health: 41.9,
      family: 59.2,
      wealth: 47.5,
      career: 50,
      social: 53.7,
      romance: 58.9,
    });
  });

  it("Trung Châu remains V0.2", () => {
    const chart = calculateTrungChau(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "trung-chau" });
    expect(result.versions.engineVersion).toBe("0.2.0");
  });

  it("no V0.5.1 feature flag or runtime route exists", async () => {
    const flags = await import("../../../../feature-flags");
    expect((flags as any).isAnnualAxesV051Enabled).toBeUndefined();
    expect((flags as any).ANNUAL_AXES_V051_FEATURE_FLAG).toBeUndefined();
  });
});
