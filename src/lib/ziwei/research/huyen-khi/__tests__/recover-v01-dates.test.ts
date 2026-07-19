import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HUYEN_KHI_DATA_DIR, loadPublicHuyenKhiDataset } from "../load-dataset";
import { parsePublicSummaryTitle } from "../parse-public-summary";
import { checkV01RecoveryCandidate } from "../recover-v01-dates";
import type { HuyenKhiCalendarDayRecord } from "../types-v02";

const V02_DIR = path.resolve(HUYEN_KHI_DATA_DIR, "../v0.2");

function loadCalendarDay(fileName: string): HuyenKhiCalendarDayRecord {
  return JSON.parse(readFileSync(path.join(V02_DIR, fileName), "utf-8")) as HuyenKhiCalendarDayRecord;
}

/**
 * Uses the two real calendar-day pages fetched live during V0.2 (see
 * `research/huyen-khi/v0.2/source-access-review.md`) as fixtures — this
 * is the actual recovery evidence found this session, not synthetic data.
 */
describe("checkV01RecoveryCandidate · real V0.1 recovery findings", () => {
  const dataset = loadPublicHuyenKhiDataset();

  it("HK-PUB-002 recovers to 1997-02-01 (three independent numeric fields match exactly)", () => {
    const record = dataset.records.find((r) => r.sampleId === "HK-PUB-002");
    expect(record).toBeDefined();
    if (!record) return;
    const parsed = parsePublicSummaryTitle(record.displayTitle);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    const calendarDay = loadCalendarDay("calendar-day-1997-02-01.json");
    const result = checkV01RecoveryCandidate(
      record,
      parsed,
      { solarYear: 1997, solarMonth: 2, solarDay: 1, lunarYear: 1996 },
      calendarDay,
    );

    expect(result.matched).toBe(true);
    expect(result.matchedFields).toEqual(
      expect.arrayContaining(["lunarMonth", "lunarDay", "yinYang", "gender", "displayedWholeChartTotal", "displayedMenhScore"]),
    );
    expect(result.mismatchedFields).toEqual([]);
  });

  it("HK-PUB-001 against the 1994-05-20 candidate does not match (real mismatch found this session)", () => {
    const record = dataset.records.find((r) => r.sampleId === "HK-PUB-001");
    expect(record).toBeDefined();
    if (!record) return;
    const parsed = parsePublicSummaryTitle(record.displayTitle);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    // The live calendar page for 1994-05-20 only exposed the "Dương Nam"
    // (male) row across all 12 hours, while HK-PUB-001 is "Dương Nữ"
    // (female) — and its own stated lunar day (10) differs from the
    // engine's candidate (11), a real edge case documented in
    // source-access-review.md. Construct the minimal fixture reflecting
    // what was actually observed live (single male row captured).
    const calendarDay: HuyenKhiCalendarDayRecord = {
      calendarPageUrl: "https://tuvi.cohoc.net/lich-la-so-tu-vi-ngay-20-5-1994.html",
      solarDate: "1994-05-20",
      lunarDate: { year: 1994, yearStemBranch: null, month: 4, day: 10, isLeapMonth: false },
      sexShown: "male",
      entries: [
        {
          hourBranch: "Mão",
          yinYangSexLabel: "Dương Nam",
          displayedMenhScore: 2.75,
          displayedWholeChartTotal: 11.02,
          detailLinks: {},
          sourceLid: null,
        },
      ],
      capturedAt: "2026-07-19T15:48:00Z",
      verification: {
        firstEntryBy: "claude-webfetch-pass-1",
        firstEntryAt: "2026-07-19T15:48:00Z",
        secondEntryBy: null,
        secondEntryAt: null,
        agreement: "pending",
        disputeNotes: [],
      },
    };

    const result = checkV01RecoveryCandidate(
      record,
      parsed,
      { solarYear: 1994, solarMonth: 5, solarDay: 20, lunarYear: 1994 },
      calendarDay,
    );

    expect(result.matched).toBe(false);
    expect(result.mismatchedFields).toEqual(
      expect.arrayContaining(["lunarDay", "gender", "displayedWholeChartTotal"]),
    );
  });
});
