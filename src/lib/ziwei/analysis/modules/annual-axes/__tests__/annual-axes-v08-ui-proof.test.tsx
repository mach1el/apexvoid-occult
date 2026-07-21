import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import type { BirthInput } from "@/types/chart";
import { analyzeAnnualAxes } from "../analyze";
import { analyzeAnnualAxesNamPhaiV05 } from "../nam-phai-v05/analyze";
import { analyzeAnnualAxesNamPhaiV07 } from "../nam-phai-v07/analyze";
import { analyzeAnnualAxesNamPhaiV08 } from "../nam-phai-v08/analyze";
import { ANNUAL_AXIS_DOMAINS } from "../../../contracts/annual-axes";
import { AnnualAxesSection } from "@/components/ziwei/annual-axes/AnnualAxesSection";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

const OUT_DIR = join(process.cwd(), "research/annual-axes/distribution/v0.8");

function scoresOf(result: ReturnType<typeof analyzeAnnualAxesNamPhaiV05>) {
  return Object.fromEntries(
    ANNUAL_AXIS_DOMAINS.map((d) => {
      const axis = result.axes[d];
      return [d, axis.status === "available" ? axis.score : null];
    }),
  );
}

describe("Annual Axes V0.8 UI proof", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("default remains V0.5 when V0.8 is not approved", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.5.0");
  });

  it("opt-in V0.8 renders exact core scores and badge", () => {
    window.history.replaceState({}, "", "/?ziweiAnnualAxesV07=1&ziweiAnnualAxesV08=1");
    const chart = calculateNamPhai(REGRESSION);
    const v05 = analyzeAnnualAxesNamPhaiV05(chart);
    const v07 = analyzeAnnualAxesNamPhaiV07(chart);
    const v08 = analyzeAnnualAxesNamPhaiV08(chart);
    const routed = analyzeAnnualAxes(chart, { school: "nam-phai" });

    expect(routed.versions.engineVersion).toBe("0.8.0");
    const s05 = scoresOf(v05);
    const s07 = scoresOf(v07);
    const s08 = scoresOf(v08) as Record<string, number>;
    expect(s08).not.toEqual(s05);
    expect(s08).not.toEqual(s07);

    for (const domain of ANNUAL_AXIS_DOMAINS) {
      const axis = v08.axes[domain];
      if (axis.status !== "available") continue;
      const trace = axis.scoreTrace;
      expect(trace?.formulaVersion).toBe("v0.8-direct-anchor-robust-score");
      if (trace?.formulaVersion !== "v0.8-direct-anchor-robust-score") continue;
      expect(trace.absoluteScore).toBe(axis.score);
      expect(trace.tp4cSignedContribution).toBe(0);
      expect(trace.natalGainAppliedToScore).toBe(false);
    }

    const { container } = render(
      <AnnualAxesSection chart={chart} school="nam-phai" result={v08} />,
    );
    expect(screen.getByText("Nam Phái V0.8 · Experimental")).toBeTruthy();
    expect(screen.getByText("Engine 0.8.0")).toBeTruthy();
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.8-ui-proof.json"),
      `${JSON.stringify(
        {
          proof: "annual-axes-v08-ui-dom",
          v05: { engine: "0.5.0", scores: s05 },
          v07: { engine: "0.7.0", scores: s07 },
          v08: {
            badge: "Nam Phái V0.8 · Experimental",
            engine: "0.8.0",
            scores: s08,
            svgSnapshot: svg?.outerHTML?.slice(0, 4000) ?? null,
          },
        },
        null,
        2,
      )}\n`,
    );
  });

  it("V08=0 with V07=1 runs Engine 0.7.0", () => {
    window.history.replaceState({}, "", "/?ziweiAnnualAxesV07=1&ziweiAnnualAxesV08=0");
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.7.0");
  });

  it("V07=0 runs Engine 0.5.0", () => {
    window.history.replaceState({}, "", "/?ziweiAnnualAxesV07=0");
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.5.0");
  });
});
