import { describe, expect, it } from "vitest";
import type { ChartData, ChartPalace } from "@/types/chart";
import { analyzeAnnualAxes } from "../analyze";
import { buildAnnualFocusFrame } from "../build-annual-focus-frame";
import { collectAnnualFocusEvidence } from "../collect-annual-focus-evidence";
import { loadAnnualAxesKnowledgeV0 } from "../../../knowledge/annual-axes";
import { emptyAnnualAxesDiagnostics } from "../types";
import type { AnnualDomainAnchorFrame } from "../collect-domain-frames";
import type { ResolvedAnnualFocus } from "../resolvers/types";

const BRANCHES = [
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
  "Tý",
  "Sửu",
];

// Engineer a Nam Phái chart where index 1 (branch "Mão") is both the
// small-limit palace and carries natal name "Tài Bạch" — the wealth
// domain's primary anchor for Nam Phái's natal-name coordinate.
function buildNamPhaiMaoChart(): ChartData {
  // Natal names positioned so that "Tài Bạch" lands at index 1.
  const NAMES = [
    "Mệnh",
    "Tài Bạch",       // index 1, branch "Mão"
    "Phúc Đức",
    "Điền Trạch",
    "Quan Lộc",
    "Nô Bộc",
    "Thiên Di",
    "Tật Ách",
    "Phụ Mẫu",
    "Tử Tức",
    "Phu Thê",
    "Huynh Đệ",
  ];
  const palaces: ChartPalace[] = NAMES.map((name, index) => ({
    index,
    branch: BRANCHES[index]!,
    name,
    isSmallLimitPalace: index === 1,
  }));
  return {
    palaces,
    smallLimitPalace: palaces[1],
    annualYear: 2026,
    annualStars: [],
    natalMutagens: [],
    annualMutagens: [],
    majorMutagens: [],
  } as unknown as ChartData;
}

describe("annual-focus overlay — Nam Phái Mão fixture", () => {
  const loaded = loadAnnualAxesKnowledgeV0();
  if (!loaded.ok) throw new Error("annual axes knowledge failed to load");
  const knowledge = loaded.knowledge;

  it("builds a TP4C focus frame whose branches are Mão/Dậu/Mùi/Hợi", () => {
    const chart = buildNamPhaiMaoChart();
    const focus: ResolvedAnnualFocus = {
      mode: "small-limit",
      palaceIndex: 1,
      palaceName: "Tài Bạch",
      palaceBranch: "Mão",
      annualPalaceName: null,
    };
    const frame = buildAnnualFocusFrame(chart, focus);
    expect(frame).not.toBeNull();
    expect(frame!.frameBranches).toEqual(["Mão", "Dậu", "Mùi", "Hợi"]);
  });

  it("emits activation-only evidence on the wealth domain when the small-limit palace equals the wealth anchor", () => {
    const chart = buildNamPhaiMaoChart();
    const focus: ResolvedAnnualFocus = {
      mode: "small-limit",
      palaceIndex: 1,
      palaceName: "Tài Bạch",
      palaceBranch: "Mão",
      annualPalaceName: null,
    };
    const focusFrame = buildAnnualFocusFrame(chart, focus);
    expect(focusFrame).not.toBeNull();

    // Wealth's primary anchor for Nam Phái is natal name "Tài Bạch" at
    // index 1 with weight 0.75. Build the anchor frame by hand so the
    // overlay collector runs in isolation.
    const domainFrames: AnnualDomainAnchorFrame[] = [
      {
        anchorPalaceName: "Tài Bạch",
        anchorProvenance: "nam-phai-natal-domain-anchor",
        domainAnchorWeight: 0.75,
        nodes: [
          {
            palaceIndex: 1,
            palaceName: "Tài Bạch",
            palaceBranch: "Mão",
            annualPalaceName: null,
            role: "focus",
          },
          {
            palaceIndex: 7,
            palaceName: "Tật Ách",
            palaceBranch: "Dậu",
            annualPalaceName: null,
            role: "opposite",
          },
          {
            palaceIndex: 5,
            palaceName: "Nô Bộc",
            palaceBranch: "Mùi",
            annualPalaceName: null,
            role: "trine",
          },
          {
            palaceIndex: 9,
            palaceName: "Tử Tức",
            palaceBranch: "Hợi",
            annualPalaceName: null,
            role: "trine",
          },
        ],
      },
    ];

    const diagnostics = emptyAnnualAxesDiagnostics();
    const evidence = collectAnnualFocusEvidence({
      chart,
      domain: "wealth",
      domainFrames,
      focusFrame: focusFrame!,
      school: "nam-phai",
      annualKnowledge: knowledge,
      diagnostics,
    });

    expect(evidence.length).toBeGreaterThan(0);
    for (const e of evidence) {
      expect(e.category).toBe("annual-focus");
      // Activation-only: support/pressure/stability must be zero.
      expect(e.rawAxes.support).toBe(0);
      expect(e.rawAxes.pressure).toBe(0);
      expect(e.rawAxes.stability).toBe(0);
      expect(e.rawAxes.activation).toBeGreaterThan(0);
      expect(e.weightedAxes.support).toBe(0);
      expect(e.weightedAxes.pressure).toBe(0);
      expect(e.weightedAxes.stability).toBe(0);
    }
    // The focus palace itself (focus role) must be present in the
    // overlay evidence.
    expect(evidence.some((e) => e.targetPalaceIndex === 1 && e.frameRole === "focus")).toBe(true);
  });

  it("full analyzeAnnualAxes wire-up: wealth axis carries annual-focus evidence and reports supportsAnnualFocus", () => {
    const chart = buildNamPhaiMaoChart();
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });

    expect(result.capabilities.supportsAnnualFocus).toBe(true);
    expect(result.capabilities.primaryAnnualFocus).toBe("small-limit");
    expect(result.annualFocus).not.toBeNull();
    expect(result.annualFocus?.frameBranches).toEqual(["Mão", "Dậu", "Mùi", "Hợi"]);

    const wealth = result.axes.wealth;
    expect(wealth.status).toBe("available");
    if (wealth.status !== "available") throw new Error("unreachable");

    const focusEvidence = wealth.evidence.filter((e) => e.category === "annual-focus");
    expect(focusEvidence.length).toBeGreaterThan(0);
    for (const e of focusEvidence) {
      expect(e.rawAxes.support).toBe(0);
      expect(e.rawAxes.pressure).toBe(0);
      expect(e.rawAxes.stability).toBe(0);
      expect(e.rawAxes.activation).toBeGreaterThan(0);
    }
  });

  it("suppresses the small-limit focal-marker for Nam Phái so the focus overlay owns activation at that palace", () => {
    const chart = buildNamPhaiMaoChart();
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    const wealth = result.axes.wealth;
    if (wealth.status !== "available") throw new Error("unavailable");
    const smallLimitFocal = wealth.evidence.filter(
      (e) => e.category === "focal-marker" && e.physicalFactId.includes("small-limit"),
    );
    expect(smallLimitFocal).toHaveLength(0);
  });

  it("focus overlay is bounded by each domain's own TP4C frame (never leaks outside)", () => {
    const chart = buildNamPhaiMaoChart();
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    for (const domain of ["health", "family", "wealth", "career", "social", "romance"] as const) {
      const axis = result.axes[domain];
      if (axis.status !== "available") continue;
      const focusIndices = new Set(result.annualFocus?.frameBranches ?? []);
      for (const e of axis.evidence.filter((ev) => ev.category === "annual-focus")) {
        expect(focusIndices.has(chart.palaces[e.targetPalaceIndex]!.branch)).toBe(true);
      }
    }
  });
});
