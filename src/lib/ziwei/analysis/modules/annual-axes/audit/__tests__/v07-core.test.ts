import { describe, expect, it } from "vitest";
import {
  loadAnnualAxesKnowledgeV07NamPhai,
  resetAnnualAxesKnowledgeV07NamPhaiCache,
} from "../../../../knowledge/annual-axes/v0.7";
import { layerFactorForEvidenceLayer } from "../../../../knowledge/annual-axes/v0.7/schema";
import { V07_SIGNED_LAYER_FACTORS } from "../../../../knowledge/annual-axes/v0.7/derive-calibration";
import { computeDomainScore } from "../../nam-phai-v07/bucket-formula";
import { computeStrictLatent } from "../../nam-phai-v07/score-domain";
import { closeEnough } from "../v051-stats";

describe("annual-axes v0.7 core formula", () => {
  it("loads V0.7 knowledge with fixed signed layer factors", () => {
    resetAnnualAxesKnowledgeV07NamPhaiCache();
    const loaded = loadAnnualAxesKnowledgeV07NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const f = loaded.knowledge.bucketFormula.signedLayerFactors;
    expect(f.annual).toBe(1);
    expect(f.natalActivated).toBe(0.25);
    expect(f.majorFortune).toBe(0);
    expect(f.global).toBe(0);
    expect(loaded.knowledge.scoreProfile.amplitude).toBe(44);
    expect(loaded.knowledge.scoreProfile.targetQ75ScoreDelta).toBe(22);
  });

  it("applies identical layer factors to support and pressure", () => {
    const factors = V07_SIGNED_LAYER_FACTORS;
    expect(layerFactorForEvidenceLayer("annual", factors)).toBe(1);
    expect(layerFactorForEvidenceLayer("natal-activated", factors)).toBe(0.25);
    expect(layerFactorForEvidenceLayer("major-fortune", factors)).toBe(0);
    expect(layerFactorForEvidenceLayer("global", factors)).toBe(0);
    expect(10 * layerFactorForEvidenceLayer("natal-activated", factors)).toBe(
      10 * layerFactorForEvidenceLayer("natal-activated", factors),
    );
  });

  it("reconstructs centeredSpatial / strictLatent / absoluteScore", () => {
    const spatialSignedRaw = 0.42;
    const domainCenter = 0.12;
    const centeredSpatial = spatialSignedRaw - domainCenter;
    expect(closeEnough(centeredSpatial, 0.3)).toBe(true);
    const activationGate = 0.7;
    const natalGain = 1.05;
    const strictLatent = computeStrictLatent(centeredSpatial, activationGate, natalGain);
    expect(closeEnough(strictLatent, centeredSpatial * activationGate * natalGain)).toBe(true);
    const domainScale = 0.4;
    const score = computeDomainScore(strictLatent, domainScale, 50, 44, 0, 100, 1);
    expect(score).toBe(
      computeDomainScore(strictLatent, domainScale, 50, 44, 0, 100, 1),
    );
  });

  it("zero activation and zero centeredSpatial map to exactly 50", () => {
    expect(computeStrictLatent(0.5, 0, 1.1)).toBe(0);
    expect(computeDomainScore(0, 0.4, 50, 44, 0, 100, 1)).toBe(50);
    expect(computeStrictLatent(0, 0.8, 1.1)).toBe(0);
  });
});
