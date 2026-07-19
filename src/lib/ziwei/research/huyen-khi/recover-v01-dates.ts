import type { ParsedBirthTitle, PublicHuyenKhiRecord } from "./types";
import type { HuyenKhiCalendarDayRecord } from "./types-v02";
import type { SolarDateCandidate } from "./types";

export interface V01RecoveryCheck {
  sampleId: string;
  candidateSolarDate: string;
  calendarPageUrl: string;
  matched: boolean;
  matchedFields: string[];
  mismatchedFields: string[];
  notes: string[];
}

/**
 * §10 V0.1 date recovery — checks one already-fetched calendar day page
 * (`calendarDay`, obtained via a rate-limited WebFetch call outside this
 * function — this module performs no network access itself, per the
 * source-access policy and the "no live network in tests" gate) against
 * one candidate absolute solar date for a V0.1 record. A match requires
 * agreement on lunar month/day AND the record's own numeric total (and
 * Mệnh score, when available) — never just the Can Chi label (§ "never
 * guess an absolute year from Can Chi... or nearest 60-year cycle").
 */
export function checkV01RecoveryCandidate(
  v01Record: PublicHuyenKhiRecord,
  parsed: ParsedBirthTitle,
  candidate: SolarDateCandidate,
  calendarDay: HuyenKhiCalendarDayRecord,
): V01RecoveryCheck {
  const matchedFields: string[] = [];
  const mismatchedFields: string[] = [];
  const notes: string[] = [];

  if (calendarDay.lunarDate.month === parsed.lunarMonth) matchedFields.push("lunarMonth");
  else mismatchedFields.push("lunarMonth");

  if (calendarDay.lunarDate.day === parsed.lunarDay) matchedFields.push("lunarDay");
  else {
    mismatchedFields.push("lunarDay");
    notes.push(
      `Engine-predicted lunar day ${parsed.lunarDay} vs. site-stated lunar day ${calendarDay.lunarDate.day} — possible new-moon-boundary edge case, see source-access-review.md.`,
    );
  }

  const entry = calendarDay.entries.find(
    (e) => e.hourBranch.localeCompare(parsed.hourBranch, "vi", { sensitivity: "base" }) === 0,
  );
  if (!entry) {
    notes.push(`No captured entry for hour ${parsed.hourBranch} on this calendar page.`);
    mismatchedFields.push("hourBranch:no-entry-captured");
  } else {
    const expectedYinYang = parsed.yinYang === "dương" ? "dương" : "âm";
    const shownYinYang = entry.yinYangSexLabel.toLocaleLowerCase("vi").includes("dương") ? "dương" : "âm";
    if (shownYinYang === expectedYinYang) matchedFields.push("yinYang");
    else mismatchedFields.push("yinYang");

    const expectedGender = parsed.gender === "male" ? "nam" : "nữ";
    const shownGender = entry.yinYangSexLabel.toLocaleLowerCase("vi").includes("nam") ? "nam" : "nữ";
    if (shownGender === expectedGender) matchedFields.push("gender");
    else mismatchedFields.push("gender");

    if (entry.displayedWholeChartTotal != null) {
      if (Math.abs(entry.displayedWholeChartTotal - v01Record.displayedTotal) < 0.005) {
        matchedFields.push("displayedWholeChartTotal");
      } else {
        mismatchedFields.push("displayedWholeChartTotal");
      }
    }

    const menh = v01Record.palaceScores.Mệnh;
    if (entry.displayedMenhScore != null && menh != null) {
      if (Math.abs(entry.displayedMenhScore - menh) < 0.005) matchedFields.push("displayedMenhScore");
      else mismatchedFields.push("displayedMenhScore");
    }
  }

  return {
    sampleId: v01Record.sampleId,
    candidateSolarDate: `${candidate.solarYear}-${String(candidate.solarMonth).padStart(2, "0")}-${String(candidate.solarDay).padStart(2, "0")}`,
    calendarPageUrl: calendarDay.calendarPageUrl,
    matched: mismatchedFields.length === 0 && matchedFields.length >= 3,
    matchedFields,
    mismatchedFields,
    notes,
  };
}
