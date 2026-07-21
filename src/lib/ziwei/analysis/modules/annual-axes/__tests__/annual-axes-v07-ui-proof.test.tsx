import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import type { BirthInput } from "@/types/chart";
import { analyzeAnnualAxes } from "../analyze";
import { analyzeAnnualAxesNamPhaiV05 } from "../nam-phai-v05/analyze";
import { analyzeAnnualAxesNamPhaiV07 } from "../nam-phai-v07/analyze";
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

const OUT_DIR = join(process.cwd(), "research/annual-axes/distribution/v0.7");

function scoresOf(result: ReturnType<typeof analyzeAnnualAxesNamPhaiV05>) {
  return Object.fromEntries(
    ANNUAL_AXIS_DOMAINS.map((d) => {
      const axis = result.axes[d];
      return [d, axis.status === "available" ? axis.score : null];
    }),
  );
}

describe("Annual Axes V0.7 UI proof (product fixture)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("default production remains V0.5 when V0.7 is not approved", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.5.0");
    expect(scoresOf(result)).toEqual({
      health: 41.9,
      family: 59.2,
      wealth: 47.5,
      career: 50,
      social: 53.7,
      romance: 58.9,
    });
    render(<AnnualAxesSection chart={chart} school="nam-phai" result={result} />);
    expect(screen.getByText("Nam Phái V0.5 · Fallback")).toBeTruthy();
    expect(screen.getByText("Engine 0.5.0")).toBeTruthy();
  });

  it("opt-in V0.7 changes Calculation Core scores; radar uses exact core scores", () => {
    window.history.replaceState({}, "", "/?ziweiAnnualAxesV07=1");
    const chart = calculateNamPhai(REGRESSION);
    const v05 = analyzeAnnualAxesNamPhaiV05(chart);
    const v07 = analyzeAnnualAxesNamPhaiV07(chart);
    const routed = analyzeAnnualAxes(chart, { school: "nam-phai" });

    expect(routed.versions.engineVersion).toBe("0.7.0");
    expect(v07.versions.engineVersion).toBe("0.7.0");

    const s05 = scoresOf(v05) as Record<string, number>;
    const s07 = scoresOf(v07) as Record<string, number>;
    const vals07 = ANNUAL_AXIS_DOMAINS.map((d) => s07[d]!);
    const range = Math.max(...vals07) - Math.min(...vals07);
    const l1 = ANNUAL_AXIS_DOMAINS.reduce((s, d) => s + Math.abs(s07[d]! - s05[d]!), 0);

    expect(s07).not.toEqual(s05);
    expect(l1).toBeGreaterThan(0);
    expect(range).toBeGreaterThan(0);

    const { container } = render(
      <AnnualAxesSection chart={chart} school="nam-phai" result={v07} />,
    );
    expect(screen.getByText("Nam Phái V0.7 · Experimental")).toBeTruthy();
    expect(screen.getByText("Engine 0.7.0")).toBeTruthy();

    for (const domain of ANNUAL_AXIS_DOMAINS) {
      const axis = v07.axes[domain];
      if (axis.status !== "available") continue;
      expect(axis.scoreTrace?.absoluteScore).toBe(axis.score);
      expect(axis.scoreTrace?.formulaVersion).toBe("v0.7-robust-centered-annual-score");
      expect(String(container.innerHTML)).toContain(String(axis.score));
    }

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    mkdirSync(OUT_DIR, { recursive: true });
    const proof = {
      proof: "annual-axes-v07-ui-dom",
      badge: "Nam Phái V0.7 · Experimental",
      engine: "0.7.0",
      scores: s07,
      radarRange: range,
      l1FromV05: l1,
      v05Rollback: {
        badge: "Nam Phái V0.5 · Fallback",
        engine: "0.5.0",
        scores: s05,
      },
      svgSnapshot: svg?.outerHTML?.slice(0, 4000) ?? null,
      selectionStatus: "no-variant-approved",
      note: "V0.7 remains opt-in; hard holdout/product gates did not all pass.",
    };
    writeFileSync(join(OUT_DIR, "annual-axes-v0.7-ui-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  });

  it("V07=0 keeps exact V0.5 rollback vector", () => {
    window.history.replaceState({}, "", "/?ziweiAnnualAxesV07=0");
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.5.0");
    expect(scoresOf(result)).toEqual({
      health: 41.9,
      family: 59.2,
      wealth: 47.5,
      career: 50,
      social: 53.7,
      romance: 58.9,
    });
  });

  it("V07=0 and V05=0 runs Engine 0.4.2", () => {
    window.history.replaceState({}, "", "/?ziweiAnnualAxesV07=0&ziweiAnnualAxesV05=0");
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.4.2");
  });

  it("V0.6 flag cannot publicly select V0.6", () => {
    window.history.replaceState({}, "", "/?ziweiAnnualAxesV06=1");
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).not.toBe("0.6.0");
    expect(result.versions.engineVersion).toBe("0.5.0");
  });
});
