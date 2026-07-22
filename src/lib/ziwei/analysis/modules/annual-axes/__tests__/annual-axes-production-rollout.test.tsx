import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { calculate as calculateTrungChau } from "@/lib/ziwei/engine-trung-chau";
import type { BirthInput } from "@/types/chart";
import { getAnalysisStatus } from "../../../contracts/common";
import { analyzeAnnualAxes } from "../analyze";
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

function resetSession() {
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
}

function scoresFor(result: ReturnType<typeof analyzeAnnualAxes>): number[] {
  return ANNUAL_AXIS_DOMAINS.flatMap((domain) => {
    const axis = result.axes[domain];
    return axis.status === "available" ? [axis.score] : [];
  });
}

describe("Annual Axes Nam Phái production routing", () => {
  beforeEach(resetSession);

  it("Nam Phái default → engine 0.8.0", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.8.0");
  });

  it("legacy version query flags do not change Nam Phái engine", () => {
    window.history.replaceState(
      {},
      "",
      "/?ziweiAnnualAxesV08=0&ziweiAnnualAxesV07=0&ziweiAnnualAxesV05=0",
    );
    const chart = calculateNamPhai(REGRESSION);
    expect(analyzeAnnualAxes(chart, { school: "nam-phai" }).versions.engineVersion).toBe(
      "0.8.0",
    );
  });

  it("Trung Châu default → engine 0.2.0", () => {
    const chart = calculateTrungChau(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "trung-chau" });
    expect(result.versions.engineVersion).toBe("0.2.0");
  });

  it("Trung Châu ignores legacy Nam Phái flags", () => {
    window.history.replaceState({}, "", "/?ziweiAnnualAxesV08=0&ziweiAnnualAxesV05=0");
    const chart = calculateTrungChau(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "trung-chau" });
    expect(result.versions.engineVersion).toBe("0.2.0");
  });
});

describe("Annual Axes school-aware analysis status", () => {
  beforeEach(resetSession);

  it("Nam Phái default status version matches analyzer", () => {
    const status = getAnalysisStatus("annual-axes", { school: "nam-phai" });
    expect(status).toEqual({
      status: "available",
      module: "annual-axes",
      version: "0.8.0",
    });
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.8.0");
  });

  it("Trung Châu status remains 0.2.0", () => {
    const status = getAnalysisStatus("annual-axes", { school: "trung-chau" });
    expect(status).toEqual({
      status: "available",
      module: "annual-axes",
      version: "0.2.0",
    });
  });
});

describe("Annual Axes V0.8 UI score equality", () => {
  beforeEach(resetSession);

  it("radar ARIA labels match Calculation Core scores", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    expect(result.versions.engineVersion).toBe("0.8.0");
    const { container } = render(
      <AnnualAxesSection chart={chart} school="nam-phai" result={result} />,
    );
    expect(container.textContent ?? "").toContain(`Năm ${result.annualYear}`);
    expect(container.textContent ?? "").not.toContain("Nam Phái V0.8");
    expect(container.textContent ?? "").not.toContain("Engine 0.8.0");
    for (const domain of ANNUAL_AXIS_DOMAINS) {
      const axis = result.axes[domain];
      if (axis.status !== "available") continue;
      const point = container.querySelector(`[data-domain="${domain}"]`);
      expect(point?.getAttribute("aria-label") ?? "").toContain(`điểm ${axis.score}`);
    }
    expect(scoresFor(result).length).toBe(6);
  });

  it("clicking a point opens detail with exact score", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = analyzeAnnualAxes(chart, { school: "nam-phai" });
    const { container } = render(
      <AnnualAxesSection chart={chart} school="nam-phai" result={result} />,
    );
    const health = container.querySelector('[data-domain="health"]');
    expect(health).toBeTruthy();
    fireEvent.click(health!);
    const axis = result.axes.health;
    expect(axis.status).toBe("available");
    if (axis.status !== "available") return;
    expect(container.textContent ?? "").toContain(`Điểm ${axis.score.toFixed(1)}`);
    if (axis.engine === "v0.8") {
      expect(container.textContent ?? "").toContain(axis.scoreTrace.primary.palaceName);
      expect(container.textContent ?? "").not.toMatch(/Độ tin cậy\s+\d+%/);
    }
  });
});
