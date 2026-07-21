import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import type { BirthInput } from "@/types/chart";
import { analyzeAnnualAxes } from "../analyze";
import { analyzeAnnualAxesNamPhaiV05 } from "../nam-phai-v05/analyze";
import { analyzeAnnualAxesNamPhaiV06 } from "../nam-phai-v06/analyze";
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

function scoresOf(result: ReturnType<typeof analyzeAnnualAxesNamPhaiV05>) {
  return Object.fromEntries(
    ANNUAL_AXIS_DOMAINS.map((d) => {
      const axis = result.axes[d];
      return [d, axis.status === "available" ? axis.score : null];
    }),
  );
}

describe("Annual Axes V0.6 UI proof (historical experimental)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("V0.6 is not publicly selectable even with query flag", () => {
    window.history.replaceState({}, "", "/?ziweiAnnualAxesV06=1");
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).not.toBe("0.6.0");
  });

  it("direct V0.6 analyzer still produces experimental scores and badge", () => {
    const chart = calculateNamPhai(REGRESSION);
    const v05 = analyzeAnnualAxesNamPhaiV05(chart);
    const v06 = analyzeAnnualAxesNamPhaiV06(chart);

    expect(v06.versions.engineVersion).toBe("0.6.0");
    const s05 = scoresOf(v05) as Record<string, number>;
    const s06 = scoresOf(v06) as Record<string, number>;
    expect(s06).not.toEqual(s05);

    render(<AnnualAxesSection chart={chart} school="nam-phai" result={v06} />);
    expect(screen.getByText("Nam Phái V0.6 · Experimental")).toBeTruthy();
    expect(screen.getByText("Engine 0.6.0")).toBeTruthy();
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
});
