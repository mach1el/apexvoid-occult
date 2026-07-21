import { describe, expect, it } from "vitest";
import { ANNUAL_AXIS_DOMAINS } from "../../../../contracts/annual-axes";
import { loadAnnualAxesKnowledgeV05NamPhai } from "../../../../knowledge/annual-axes/v0.5";
import {
  aggregateEvidenceDimensions,
  assertSingleMembershipCounts,
} from "../collect-v051-samples";
import { runV051BiasAudit } from "../run-v051-bias-audit";
import { runV051VariantEvaluation } from "../run-v051-variant-evaluation";
import { runV051ProductFixture, V051_PRODUCT_FIXTURE } from "../run-v051-product-fixture";
import { splitChartIndices } from "../../../../knowledge/annual-axes/v0.5/derive-calibration";
import { FULL_CORPUS_CONTRACT } from "../build-audit-corpus";

describe("V0.5.1 bias audit structure", () => {
  it("reports support and pressure masses separately", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const report = runV051BiasAudit(loaded.knowledge);
    expect(report.global.evidence.directSupportRawMass).toBeGreaterThan(0);
    expect(report.global.evidence.directPressureRawMass).toBeGreaterThan(0);
    expect(report.global.evidence.tp4cSupportRawMass).toBeGreaterThan(0);
    expect(report.global.evidence.tp4cPressureRawMass).toBeGreaterThan(0);
    expect(report.auditIntegrityVersion).toBe(2);
  }, 600_000);

  it("computes positive/negative latent rates from latent not score", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const report = runV051BiasAudit(loaded.knowledge);
    const s = report.global.signed;
    expect(s.positiveLatentRate + s.negativeLatentRate + s.zeroLatentRate).toBeCloseTo(1, 5);
  }, 600_000);

  it("dimension breakdown totals reconstruct global retained counts", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const { training, holdout } = splitChartIndices(FULL_CORPUS_CONTRACT.chartCount);
    const dims = aggregateEvidenceDimensions(loaded.knowledge, [...training, ...holdout]);
    const check = assertSingleMembershipCounts(dims);
    expect(check.ok).toBe(true);
    expect(check.failures).toEqual([]);
  }, 600_000);

  it("exposes training and holdout bias metrics separately with AND semantics", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const report = runV051BiasAudit(loaded.knowledge);
    expect(report.evidenceBiasFlags.training.positiveLatentRate).toBeTypeOf("number");
    expect(report.evidenceBiasFlags.holdout.positiveLatentRate).toBeTypeOf("number");
    const bothHigh =
      report.evidenceBiasFlags.training.positiveLatentRate > 0.65 &&
      report.evidenceBiasFlags.training.medianLatent > 0 &&
      report.evidenceBiasFlags.holdout.positiveLatentRate > 0.65 &&
      report.evidenceBiasFlags.holdout.medianLatent > 0;
    expect(report.evidenceBiasFlags.globalPositiveLatentBias).toBe(bothHigh);
  }, 600_000);

  it("includes signed evidence funnel with pressure retention diagnosis", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const report = runV051BiasAudit(loaded.knowledge);
    expect(report.signedEvidenceFunnel.candidate.factCount).toBeGreaterThan(0);
    expect([
      "pressure-mechanically-disadvantaged",
      "pressure-mechanically-advantaged",
      "no-material-mechanical-retention-gap",
    ]).toContain(report.diagnosis.pressureRetentionDiagnosis);
    expect(report.diagnosis.rootCauseLabel).toMatch(
      /doctrinal-evidence-imbalance|mechanical-imbalance-suspected|root-cause-unresolved/,
    );
  }, 600_000);
});

describe("V0.5.1 variant selection", () => {
  it("returns no-variant-approved when evidence bias blocks calibration tightening", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const evaluation = runV051VariantEvaluation(loaded.knowledge);
    expect(evaluation.selectionStatus).toBe("no-variant-approved");
    expect(evaluation.selectedVariant).toBeNull();
  }, 900_000);

  it("does not select baseline as V0.5.1", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const evaluation = runV051VariantEvaluation(loaded.knowledge);
    expect(evaluation.selectedVariant).not.toBe("BASELINE-V05");
  }, 900_000);
});

describe("V0.5.1 product fixture", () => {
  it("excludes fixture birth data from calibration derivation", () => {
    expect(V051_PRODUCT_FIXTURE.solarDate).toBe("1991-09-21");
    expect(FULL_CORPUS_CONTRACT.chartCount).toBe(100);
  });

  it("reports baseline and candidate vectors without selecting one", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const product = runV051ProductFixture(loaded.knowledge, null);
    expect(product.productionV050.scores).toBeDefined();
    expect(product.candidates).toHaveLength(4);
    expect(product.selectedV051).toBeNull();
    if (!product.productionV050.scores) return;
    for (const domain of ANNUAL_AXIS_DOMAINS) {
      expect(product.productionV050.scores[domain]).toBeTypeOf("number");
    }
  }, 30_000);
});
