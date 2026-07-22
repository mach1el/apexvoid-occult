import { describe, expect, it } from "vitest";
import {
  buildAuditBirthInputs,
  FAST_CORPUS_CONTRACT,
  FULL_CORPUS_CONTRACT,
} from "../build-audit-corpus";
import { computeDistributionReport } from "../compute-distribution-report";
import { runAudit } from "../run-distribution-audit";
import type { AnnualAxesAuditObservation } from "../types";
import { ANNUAL_AXIS_DOMAINS } from "../../../../contracts/annual-axes";

describe("annual-axes audit corpus", () => {
  it("builds a deterministic fast corpus of the contracted size", () => {
    const a = buildAuditBirthInputs(FAST_CORPUS_CONTRACT);
    const b = buildAuditBirthInputs(FAST_CORPUS_CONTRACT);
    expect(a).toHaveLength(FAST_CORPUS_CONTRACT.chartCount);
    expect(a).toEqual(b);
    expect(new Set(a.map((x) => x.birthHour)).size).toBeGreaterThan(1);
    expect(new Set(a.map((x) => x.gender)).size).toBe(2);
  });

  it("full corpus contract matches the minimum (100×12)", () => {
    expect(FULL_CORPUS_CONTRACT.chartCount).toBe(100);
    expect(FULL_CORPUS_CONTRACT.yearsPerChart).toBe(12);
  });
});

describe("annual-axes distribution report — fast Nam Phái baseline", () => {
  it("produces a well-formed report and is deterministic", () => {
    const reportA = runAudit("nam-phai", FAST_CORPUS_CONTRACT, "annual-axes-current");
    const reportB = runAudit("nam-phai", FAST_CORPUS_CONTRACT, "annual-axes-current");
    expect(reportA).toEqual(reportB);
    expect(reportA.chartCount).toBe(FAST_CORPUS_CONTRACT.chartCount);
    expect(reportA.yearsPerChart).toBe(FAST_CORPUS_CONTRACT.yearsPerChart);
    expect(reportA.resultCount).toBe(
      FAST_CORPUS_CONTRACT.chartCount * FAST_CORPUS_CONTRACT.yearsPerChart,
    );
    for (const domain of ANNUAL_AXIS_DOMAINS) {
      expect(reportA.scoreSummaryByDomain[domain].min).toBeLessThanOrEqual(
        reportA.scoreSummaryByDomain[domain].max,
      );
    }
    expect(reportA.allSixAbove50Rate).toBeGreaterThanOrEqual(0);
    expect(reportA.allSixAbove50Rate).toBeLessThanOrEqual(1);
  });

  it("exposes distribution metrics for V0.8 measurement", () => {
    const report = runAudit("nam-phai", FAST_CORPUS_CONTRACT, "annual-axes-v0.8");
    expect(typeof report.allSixAbove60Rate).toBe("number");
    expect(typeof report.intraYearAxisSpread.meanStandardDeviation).toBe("number");
    expect(typeof report.longitudinalChange.annualHeadMoveSensitivityRate).toBe("number");
    expect(report.allSixAbove60Rate).toBeLessThan(1);
  });
});

describe("computeDistributionReport — synthetic vectors", () => {
  it("detects exact duplicate six-axis vectors", () => {
    const mk = (chartId: string, year: number, scores: number[]): AnnualAxesAuditObservation => ({
      chartId,
      school: "nam-phai",
      annualYear: year,
      annualHeadPalaceIndex: 0,
      status: "available",
      scores: {
        health: scores[0]!,
        family: scores[1]!,
        wealth: scores[2]!,
        career: scores[3]!,
        social: scores[4]!,
        romance: scores[5]!,
      },
    });
    const observations = [
      mk("c0", 2020, [40, 45, 50, 55, 60, 65]),
      mk("c0", 2021, [40, 45, 50, 55, 60, 65]),
      mk("c1", 2020, [10, 20, 30, 40, 50, 60]),
    ];
    const report = computeDistributionReport("annual-axes-current", observations);
    expect(report.exactDuplicateVectorRate).toBeGreaterThan(0);
  });
});
