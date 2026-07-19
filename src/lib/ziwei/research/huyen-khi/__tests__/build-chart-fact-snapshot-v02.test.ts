import { describe, expect, it } from "vitest";
import { buildHuyenKhiChartFactSnapshotsForConfirmedDate } from "../build-chart-fact-snapshot";

/**
 * The first real, non-null chart-fact snapshot this research program has
 * produced — HK-PUB-002's absolute date (1997-02-01, hour Dần, male) was
 * confirmed via live cross-match (see recover-v01-dates.test.ts and
 * research/huyen-khi/v0.2/reports/v01-date-recovery-report.json), not
 * `resolveSolarDateForLunar`'s own ambiguous search.
 */
describe("buildHuyenKhiChartFactSnapshotsForConfirmedDate", () => {
  it("builds a full 12-palace snapshot for both schools for the recovered HK-PUB-002 date", () => {
    const result = buildHuyenKhiChartFactSnapshotsForConfirmedDate("1997-02-01", {
      hourBranch: "Dần",
      gender: "male",
    });
    expect(result.namPhai.palaces).toHaveLength(12);
    expect(result.trungChau.palaces).toHaveLength(12);
    expect(result.namPhai.menhPalaceIndex).toBeGreaterThanOrEqual(0);
    expect(result.namPhai.cuc.length).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const a = buildHuyenKhiChartFactSnapshotsForConfirmedDate("1997-02-01", { hourBranch: "Dần", gender: "male" });
    const b = buildHuyenKhiChartFactSnapshotsForConfirmedDate("1997-02-01", { hourBranch: "Dần", gender: "male" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
