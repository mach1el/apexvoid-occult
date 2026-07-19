import { describe, expect, it } from "vitest";
import { applySecondEntry, diffCalendarDayEntries, resolveVerificationTier } from "../gold-workflow";
import type { HuyenKhiCalendarDayRecord } from "../types-v02";

function makeDay(overrides: Partial<HuyenKhiCalendarDayRecord> = {}): HuyenKhiCalendarDayRecord {
  return {
    calendarPageUrl: "https://tuvi.cohoc.net/lich-la-so-tu-vi-ngay-1-2-1997.html",
    solarDate: "1997-02-01",
    lunarDate: { year: 1996, yearStemBranch: null, month: 12, day: 24, isLeapMonth: false },
    sexShown: "male",
    entries: [
      { hourBranch: "Dần", yinYangSexLabel: "Dương Nam", displayedMenhScore: 0.25, displayedWholeChartTotal: 7.09, detailLinks: {}, sourceLid: null },
    ],
    capturedAt: "2026-07-19T15:52:00Z",
    verification: {
      firstEntryBy: "claude-webfetch-pass-1",
      firstEntryAt: "2026-07-19T15:52:00Z",
      secondEntryBy: null,
      secondEntryAt: null,
      agreement: "pending",
      disputeNotes: [],
    },
    ...overrides,
  };
}

describe("gold-workflow", () => {
  it("real HK-PUB-002 double-pass data diffs as fully exact", () => {
    const first = makeDay();
    const second = makeDay({ capturedAt: "2026-07-19T15:53:00Z" });
    const { allExact, diffs } = diffCalendarDayEntries(first, second);
    expect(allExact).toBe(true);
    expect(diffs.every((d) => d.agrees)).toBe(true);
  });

  it("never averages a genuine disagreement — reports it verbatim as disputed", () => {
    const first = makeDay();
    const second = makeDay({
      entries: [{ hourBranch: "Dần", yinYangSexLabel: "Dương Nam", displayedMenhScore: 0.35, displayedWholeChartTotal: 7.09, detailLinks: {}, sourceLid: null }],
    });
    const verification = applySecondEntry(first, second, "claude-webfetch-pass-2-independent");
    expect(verification.agreement).toBe("disputed");
    expect(verification.disputeNotes.length).toBeGreaterThan(0);
    expect(verification.disputeNotes[0]).toContain("0.25");
    expect(verification.disputeNotes[0]).toContain("0.35");
  });

  it("promotion tiers: exact automated second entry -> machine-diff-verified, never gold", () => {
    const first = makeDay();
    const second = makeDay({ capturedAt: "2026-07-19T15:53:00Z" });
    const verification = applySecondEntry(first, second, "claude-webfetch-pass-2-independent");
    expect(resolveVerificationTier(verification)).toBe("machine-diff-verified");
  });

  it("promotion tiers: disputed record is rejected, not force-promoted", () => {
    const disputed = { ...makeDay().verification, agreement: "disputed" as const };
    expect(resolveVerificationTier(disputed)).toBe("rejected");
  });

  it("promotion tiers: pending (no second entry) is single-pass-unverified", () => {
    expect(resolveVerificationTier(makeDay().verification)).toBe("single-pass-unverified");
  });

  it("promotion tiers: a genuine human second entry (not matching the automated-tool regex) resolves to gold", () => {
    const first = makeDay();
    const second = makeDay({ capturedAt: "2026-07-19T15:53:00Z" });
    const verification = applySecondEntry(first, second, "thay-manual-review");
    expect(resolveVerificationTier(verification)).toBe("gold");
  });
});
