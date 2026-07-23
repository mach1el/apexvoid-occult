import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { calculate as calculateTrungChau } from "@/lib/ziwei/engine-trung-chau";
import { ANNUAL_AXIS_DOMAINS } from "../../../../contracts/annual-axes";
import {
  analyzeMonthlyFlowProduction,
  MONTHLY_FLOW_INTEGRATION_VERSION,
} from "../analyze-production";
import { REGRESSION_BIRTH } from "../../__tests__/test-providers";

describe("analyzeMonthlyFlowProduction", () => {
  it("scores 12 regular months with exact keys for Trung Châu", () => {
    const chart = calculateTrungChau(REGRESSION_BIRTH);
    const analysis = analyzeMonthlyFlowProduction(chart, { school: "trung-chau" });
    expect(analysis.version).toBe(MONTHLY_FLOW_INTEGRATION_VERSION);
    expect(analysis.module).toBe("monthly-flow");
    expect(analysis.result).not.toBeNull();
    const regular = analysis.monthSummaries.filter((m) => !m.isLeapMonth);
    expect(regular).toHaveLength(12);
    expect(regular.map((m) => m.lunarMonth)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(regular.map((m) => m.monthKey)).toEqual([
      "2026-M01",
      "2026-M02",
      "2026-M03",
      "2026-M04",
      "2026-M05",
      "2026-M06",
      "2026-M07",
      "2026-M08",
      "2026-M09",
      "2026-M10",
      "2026-M11",
      "2026-M12",
    ]);
    for (const month of regular) {
      for (const domain of ANNUAL_AXIS_DOMAINS) {
        expect(month.result.axes[domain]).toBeDefined();
      }
    }
  });

  it("scores Nam Phái via approved domain adapter", () => {
    const chart = calculateNamPhai(REGRESSION_BIRTH);
    const analysis = analyzeMonthlyFlowProduction(chart, { school: "nam-phai" });
    expect(analysis.domainAdapter?.ok).toBe(true);
    expect(analysis.domainAdapter?.coordinate).toBe("natal-palace-name");
    expect(analysis.monthSummaries.filter((m) => !m.isLeapMonth)).toHaveLength(12);
    expect(analysis.status).not.toBe("unavailable");
  });

  it("composite is mean of available axes rounded to 1 decimal; unavailable → null", () => {
    const chart = calculateTrungChau(REGRESSION_BIRTH);
    const analysis = analyzeMonthlyFlowProduction(chart, { school: "trung-chau" });
    for (const summary of analysis.monthSummaries) {
      if (summary.status === "unavailable") {
        expect(summary.compositeScore).toBeNull();
        continue;
      }
      const scores = ANNUAL_AXIS_DOMAINS.map((d) => summary.result.axes[d])
        .filter((a) => a.status === "available" && a.score != null)
        .map((a) => (a.status === "available" ? a.score : 0));
      if (scores.length === 0) {
        expect(summary.compositeScore).toBeNull();
      } else {
        const mean = scores.reduce((s, n) => s + n, 0) / scores.length;
        expect(summary.compositeScore).toBe(Math.round(mean * 10) / 10);
        expect(summary.axisCoverage).toBe(scores.length / 6);
      }
    }
  });

  it("is deterministic for identical inputs", () => {
    const chart = calculateTrungChau(REGRESSION_BIRTH);
    const a = analyzeMonthlyFlowProduction(chart, { school: "trung-chau" });
    const b = analyzeMonthlyFlowProduction(chart, { school: "trung-chau" });
    expect(JSON.stringify(a.monthSummaries.map((m) => m.compositeScore))).toBe(
      JSON.stringify(b.monthSummaries.map((m) => m.compositeScore)),
    );
    expect(a.status).toBe(b.status);
  });

  it("switches annual year", () => {
    const chart2026 = calculateTrungChau(REGRESSION_BIRTH);
    const chart2027 = calculateTrungChau({ ...REGRESSION_BIRTH, annualYear: "2027" });
    const a = analyzeMonthlyFlowProduction(chart2026, { school: "trung-chau" });
    const b = analyzeMonthlyFlowProduction(chart2027, { school: "trung-chau" });
    expect(a.annualYear).toBe(2026);
    expect(b.annualYear).toBe(2027);
    expect(a.monthSummaries[0]!.monthKey).toBe("2026-M01");
    expect(b.monthSummaries[0]!.monthKey).toBe("2027-M01");
  });

  it("switches school", () => {
    const np = analyzeMonthlyFlowProduction(calculateNamPhai(REGRESSION_BIRTH), {
      school: "nam-phai",
    });
    const tc = analyzeMonthlyFlowProduction(calculateTrungChau(REGRESSION_BIRTH), {
      school: "trung-chau",
    });
    expect(np.school).toBe("nam-phai");
    expect(tc.school).toBe("trung-chau");
    expect(np.domainAdapter?.provenance).toBe("nam-phai-natal-domain-anchor");
    expect(tc.domainAdapter?.provenance).toBe("trung-chau-annual-palace-name");
  });

  it("does not fabricate leap months", () => {
    const chart = calculateTrungChau(REGRESSION_BIRTH);
    const analysis = analyzeMonthlyFlowProduction(chart, { school: "trung-chau" });
    expect(analysis.monthSummaries.every((m) => !m.isLeapMonth)).toBe(true);
    expect(analysis.monthSummaries.filter((m) => m.isLeapMonth)).toHaveLength(0);
  });
});
