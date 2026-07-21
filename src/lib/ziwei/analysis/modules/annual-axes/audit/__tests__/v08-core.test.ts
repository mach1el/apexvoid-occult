import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import type { BirthInput } from "@/types/chart";
import {
  loadAnnualAxesKnowledgeV08NamPhai,
  resetAnnualAxesKnowledgeV08NamPhaiCache,
} from "../../../../knowledge/annual-axes/v0.8";
import {
  computeDirectSigned,
  computeActivationModulator,
} from "../../nam-phai-v08/bucket-formula";
import {
  classifyRelativeToDomainRoot,
  partitionDirectAnchorEligibility,
} from "../../nam-phai-v08/eligibility";
import { resolveDomainRootV08 } from "../../nam-phai-v08/resolve-domain-root";
import { analyzeAnnualAxesNamPhaiV08 } from "../../nam-phai-v08/analyze";
import { ANNUAL_AXIS_DOMAINS } from "../../../../contracts/annual-axes";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

describe("annual-axes v0.8 core", () => {
  it("loads V0.8 knowledge with direct-only geometry policy", () => {
    resetAnnualAxesKnowledgeV08NamPhaiCache();
    const loaded = loadAnnualAxesKnowledgeV08NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const geo = loaded.knowledge.bucketFormula.signedGeometryPolicy;
    expect(geo.direct).toBe(1);
    expect(geo.tp4c).toBe(0);
    expect(geo.opposite).toBe(0);
    expect(geo.contextOnly).toBe(0);
    expect(geo.adjacent).toBe(0);
    expect(loaded.knowledge.scoreProfile.scoreProfiles).toHaveLength(3);
    expect(loaded.knowledge.calibration.selectedVariant).toBe("DIRECT-STRICT-18");
    expect(loaded.knowledge.calibration.selectionStatus).toBe("approved");
  });

  it("classifies geometry relative to domain root", () => {
    expect(classifyRelativeToDomainRoot(3, 3)).toBe("direct");
    expect(classifyRelativeToDomainRoot(9, 3)).toBe("opposite");
    expect(classifyRelativeToDomainRoot(7, 3)).toBe("tp4c");
    expect(classifyRelativeToDomainRoot(4, 3)).toBe("adjacent");
  });

  it("reconstructs directSigned and activation modulator", () => {
    const signed = computeDirectSigned(2, 1, 1, 1e-9);
    expect(signed.total).toBe(3);
    expect(signed.signed).toBeCloseTo(signed.intensity * signed.polarity, 10);
    expect(computeActivationModulator(0)).toBe(0);
    expect(computeActivationModulator(0.49)).toBeCloseTo(Math.sqrt(0.49), 10);
  });

  it("resolves exactly one configured root anchor per domain", () => {
    resetAnnualAxesKnowledgeV08NamPhaiCache();
    const loaded = loadAnnualAxesKnowledgeV08NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const chart = calculateNamPhai(REGRESSION);
    for (const domain of ANNUAL_AXIS_DOMAINS) {
      const root = resolveDomainRootV08(chart, domain, loaded.knowledge);
      expect(root.ok).toBe(true);
      if (!root.ok) continue;
      expect(root.anchor.domain).toBe(domain);
      expect(Number.isInteger(root.anchor.anchorPalaceIndex)).toBe(true);
      expect(root.anchor.anchorPalaceName.length).toBeGreaterThan(0);
      expect(root.anchor.anchorBranch.length).toBeGreaterThan(0);
      expect(root.anchor.provenance.length).toBeGreaterThan(0);
    }
  });

  it("scorer source has no hardcoded palace-name switch", () => {
    const scoreDomain = readFileSync(
      join(process.cwd(), "src/lib/ziwei/analysis/modules/annual-axes/nam-phai-v08/score-domain.ts"),
      "utf8",
    );
    const aggregate = readFileSync(
      join(process.cwd(), "src/lib/ziwei/analysis/modules/annual-axes/nam-phai-v08/aggregate-direct.ts"),
      "utf8",
    );
    for (const src of [scoreDomain, aggregate]) {
      expect(src).not.toMatch(/Tật Ách|Điền Trạch|Tài Bạch|Quan Lộc|Nô Bộc|Phu Thê/);
      expect(src).not.toMatch(/switch\s*\(\s*palace/);
    }
  });

  it("product fixture V0.8 has zero TP4C signed contribution and no natalGain on score", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxesNamPhaiV08(chart);
    expect(result.versions.engineVersion).toBe("0.8.0");
    for (const domain of ANNUAL_AXIS_DOMAINS) {
      const axis = result.axes[domain];
      if (axis.status !== "available") continue;
      const trace = axis.scoreTrace;
      expect(trace?.formulaVersion).toBe("v0.8-direct-anchor-robust-score");
      if (trace?.formulaVersion !== "v0.8-direct-anchor-robust-score") continue;
      expect(trace.tp4cSignedContribution).toBe(0);
      expect(trace.natalGainAppliedToScore).toBe(false);
      expect(trace.absoluteScore).toBe(axis.score);
      expect(Number.isFinite(trace.directSignedRaw)).toBe(true);
      expect(Number.isFinite(trace.effectiveZ)).toBe(true);
      expect(trace.directTotalRaw).toBeCloseTo(
        trace.directSupportRaw + trace.directPressureRaw,
        8,
      );
      expect(trace.directSignedRaw).toBeCloseTo(
        trace.directIntensity * trace.directPolarity,
        8,
      );
      if (trace.activationGate > 0) {
        expect(trace.activationModulator).toBeCloseTo(Math.sqrt(trace.activationGate), 8);
      }
      for (const driver of [...axis.topSupportDrivers, ...axis.topPressureDrivers]) {
        expect(driver.retainedForSignedScore).toBe(true);
      }
    }
  });

  it("rejects non-direct geometry before signed eligibility", () => {
    resetAnnualAxesKnowledgeV08NamPhaiCache();
    const loaded = loadAnnualAxesKnowledgeV08NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const chart = calculateNamPhai(REGRESSION);
    const root = resolveDomainRootV08(chart, "health", loaded.knowledge);
    expect(root.ok).toBe(true);
    if (!root.ok) return;
    const fakeTp4c = {
      id: "fake-tp4c",
      physicalFactId: "pf-tp4c",
      targetPalaceIndex: (root.anchor.anchorPalaceIndex + 4) % 12,
      targetPalaceName: "X",
      layer: "annual" as const,
      category: "star" as const,
      frameRole: "trine" as const,
      ownershipWeight: 1,
      confidenceWeight: 1,
      rawAxes: { support: 9, pressure: 0, stability: 0, activation: 1 },
      weightedAxes: { support: 9, pressure: 0, stability: 0, activation: 1 },
      annualTriggerIds: ["annual-moving-star-palace"],
      activationPaths: [
        {
          channel: "direct-domain" as const,
          triggerId: "annual-moving-star-palace",
          affinityWeight: 1,
        },
      ],
    };
    const partition = partitionDirectAnchorEligibility(
      [fakeTp4c as never],
      root.anchor,
      loaded.knowledge,
    );
    expect(partition.signedEligible).toHaveLength(0);
    expect(partition.counts.excludedTp4cFactCount).toBeGreaterThan(0);
  });
});
