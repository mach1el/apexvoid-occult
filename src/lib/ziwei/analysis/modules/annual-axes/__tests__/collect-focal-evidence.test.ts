import { describe, expect, it } from "vitest";
import type { ChartData, ChartPalace } from "@/types/chart";
import { loadAnnualAxesKnowledgeV0 } from "../../../knowledge/annual-axes";
import { collectFocalEvidence } from "../collect-focal-evidence";
import { emptyAnnualAxesDiagnostics } from "../types";
import type { AnnualDomainAnchorFrame } from "../collect-domain-frames";

// Direct unit tests of the focal-marker collector using a synthetic
// single-anchor frame. Real Nam Phái charts never populate
// `annualPalaceName` (so domain frames never resolve) and real Trung Châu
// charts never populate `isSmallLimitPalace` (Tiểu Hạn is a Nam Phái-only
// concept) — no chart produced by either engine today can exercise both
// "resolvable frame" and "small-limit flag set" simultaneously, so the
// school-filtering branches here are covered directly against the
// collector rather than through the full analyze() + engine path.
function buildFrame(taiTue: boolean, smallLimit: boolean, lndv: boolean): {
  chart: ChartData;
  frames: AnnualDomainAnchorFrame[];
} {
  const palace: ChartPalace = {
    index: 7,
    branch: "Mùi",
    name: "Tật Ách",
    isTaiTuePalace: taiTue,
    isSmallLimitPalace: smallLimit,
    isLuuNienDaiVan: lndv,
  };
  const chart = { palaces: [palace] } as unknown as ChartData;
  const frames: AnnualDomainAnchorFrame[] = [
    {
      anchorPalaceName: "Tật Ách",
      domainAnchorWeight: 0.7,
      nodes: [{ palaceIndex: 7, palaceName: "Tật Ách", palaceBranch: "Mùi", role: "focus" }],
    },
  ];
  return { chart, frames };
}

describe("collectFocalEvidence — school profiles", () => {
  const loaded = loadAnnualAxesKnowledgeV0();
  if (!loaded.ok) throw new Error("annual axes knowledge failed to load");
  const { knowledge } = loaded;

  it("Nam Phái includes small-limit evidence when the palace flag is set", () => {
    const { chart, frames } = buildFrame(false, true, false);
    const diagnostics = emptyAnnualAxesDiagnostics();

    const evidence = collectFocalEvidence({
      chart,
      domain: "health",
      frames,
      school: "nam-phai",
      annualKnowledge: knowledge,
      diagnostics,
    });

    expect(evidence.some((e) => e.physicalFactId.includes("small-limit"))).toBe(true);
    expect(diagnostics.forbiddenSchoolMarkers).toHaveLength(0);
  });

  it("Trung Châu excludes small-limit evidence and logs a forbidden-marker diagnostic", () => {
    const { chart, frames } = buildFrame(false, true, false);
    const diagnostics = emptyAnnualAxesDiagnostics();

    const evidence = collectFocalEvidence({
      chart,
      domain: "health",
      frames,
      school: "trung-chau",
      annualKnowledge: knowledge,
      diagnostics,
    });

    expect(evidence.some((e) => e.physicalFactId.includes("small-limit"))).toBe(false);
    expect(diagnostics.forbiddenSchoolMarkers).toHaveLength(1);
    expect(diagnostics.forbiddenSchoolMarkers[0]).toContain("small-limit");
  });

  it("both schools include annual-tai-tue evidence", () => {
    const { chart, frames } = buildFrame(true, false, false);
    for (const school of ["nam-phai", "trung-chau"] as const) {
      const diagnostics = emptyAnnualAxesDiagnostics();
      const evidence = collectFocalEvidence({
        chart,
        domain: "health",
        frames,
        school,
        annualKnowledge: knowledge,
        diagnostics,
      });
      expect(evidence.some((e) => e.physicalFactId.includes("annual-tai-tue"))).toBe(true);
    }
  });

  it("applies a convergence bonus only when ≥2 distinct markers land on the same palace", () => {
    const { chart, frames } = buildFrame(true, true, false);
    const diagnostics = emptyAnnualAxesDiagnostics();

    const evidence = collectFocalEvidence({
      chart,
      domain: "health",
      frames,
      school: "nam-phai",
      annualKnowledge: knowledge,
      diagnostics,
    });

    const individualMarkers = evidence.filter((e) => e.physicalFactId.startsWith("focal-marker:"));
    const convergence = evidence.filter((e) => e.physicalFactId.startsWith("focal-convergence:"));
    expect(individualMarkers).toHaveLength(2);
    expect(convergence).toHaveLength(1);
    expect(convergence[0]?.factIds).toHaveLength(2);
  });

  it("activation-only polarity — focal markers never carry support/pressure/stability", () => {
    const { chart, frames } = buildFrame(true, true, true);
    const diagnostics = emptyAnnualAxesDiagnostics();

    const evidence = collectFocalEvidence({
      chart,
      domain: "health",
      frames,
      school: "nam-phai",
      annualKnowledge: knowledge,
      diagnostics,
    });

    expect(evidence.length).toBeGreaterThan(0);
    for (const e of evidence) {
      expect(e.rawAxes.support).toBe(0);
      expect(e.rawAxes.pressure).toBe(0);
      expect(e.rawAxes.stability).toBe(0);
      expect(e.rawAxes.activation).toBeGreaterThan(0);
    }
  });
});
