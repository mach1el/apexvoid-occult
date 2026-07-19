import type { NatalPalaceName } from "./types";

/**
 * V0.2 — absolute-date gold corpus. Does not mutate V0.1's `types.ts`.
 *
 * IMPORTANT (see `research/huyen-khi/v0.2/source-access-review.md`):
 * detail/result pages render via client-side JS and cannot be scraped with
 * the tools available this pass — `HuyenKhiPublicOutputRecordV02.palaceScores`
 * can therefore only be populated for records that already have
 * human-transcribed palace data (i.e. the 18 V0.1 seeds), once an absolute
 * date is confirmed for them. New twelve-palace records cannot be built
 * from scratch via automated fetch in V0.2.
 */

export type AbsoluteDateEvidence =
  | "calendar-page-url-and-heading"
  | "explicit-detail-metadata"
  | "manual-source-locator"
  | "v01-numeric-cross-match";

export interface HuyenKhiCalendarEntry {
  hourBranch: string;
  yinYangSexLabel: string;
  displayedMenhScore: number | null;
  displayedWholeChartTotal: number | null;
  detailLinks: {
    popular?: string;
    namPhai?: string;
    bacPhai?: string;
    phiTinh?: string;
    combined?: string;
  };
  sourceLid: string | null;
}

export interface HuyenKhiCalendarDayRecord {
  calendarPageUrl: string;
  solarDate: string;
  lunarDate: {
    year: number;
    /** null when text-label extraction was unreliable this session — see
     * `research/huyen-khi/v0.2/source-access-review.md`'s "lunar-date edge
     * case" finding. The numeric month/day fields remain the load-bearing
     * evidence for recovery, not this label. */
    yearStemBranch: string | null;
    month: number;
    day: number;
    isLeapMonth: boolean | null;
  };
  sexShown: "male" | "female";
  entries: HuyenKhiCalendarEntry[];
  capturedAt: string;
  /** Which of the two independent extraction passes agreed on the key
   * numeric fields (Mệnh score, whole-chart total, lunar month/day) for
   * at least one entry — see `verification`. */
  verification: ManualVerification;
}

export interface ManualVerification {
  firstEntryBy: string;
  firstEntryAt: string;
  secondEntryBy: string | null;
  secondEntryAt: string | null;
  /** `"exact"` here means two *independent WebFetch passes* agreed
   * exactly — not two independent humans. This tier is `"machine-diff-
   * verified"` in `HuyenKhiPublicOutputRecordV02.verificationTier`, never
   * labeled `"gold"` under the spec's stricter human-verified definition. */
  agreement: "pending" | "exact" | "disputed";
  disputeNotes: string[];
}

export interface HuyenKhiPublicOutputRecordV02 {
  sampleId: string;
  metricNamespace: "huyen-khi";

  sourceIdentity: {
    calendarPageUrl: string | null;
    detailPageUrl: string | null;
    sourceLid: string | null;
    absoluteSolarDate: string;
    absoluteDateEvidence: AbsoluteDateEvidence;
    lunarDate: {
      absoluteYear: number;
      yearStemBranch: string | null;
      month: number;
      day: number;
      isLeapMonth: boolean | null;
    };
    sex: "male" | "female";
    yinYangSexLabel: string;
    hourBranch: string;
  };

  displayedMenhScore: number | null;
  displayedTotal: number;
  /** Only populated when sourced from a V0.1 seed record with
   * human-transcribed palace data — see the class-level note above. */
  palaceScores: Partial<Record<NatalPalaceName, number>>;
  palacesExplicitlyListed: NatalPalaceName[];
  omittedPalacesAssumedZeroForValidation: NatalPalaceName[];
  totalValidation: "exact" | "rounded" | "failed";
  totalDelta: number;

  sourceCapture: {
    captureMethod: "manual-text" | "manual-form" | "approved-limited-fetch";
    capturedAt: string;
    numericLocatorNotes: string[];
    longProseStored: false;
  };

  /** `"gold"` requires human double-entry (not yet performed this pass).
   * `"machine-diff-verified"` means two independent automated extraction
   * passes agreed exactly — a real but weaker guarantee, disclosed as
   * such in `limitations.md`. */
  verificationTier: "gold" | "machine-diff-verified" | "single-pass-unverified";
  verification: ManualVerification;
}
