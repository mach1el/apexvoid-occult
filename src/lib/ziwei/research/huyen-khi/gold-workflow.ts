import type { HuyenKhiCalendarDayRecord, ManualVerification } from "./types-v02";

export interface FieldDiff {
  field: string;
  firstValue: unknown;
  secondValue: unknown;
  agrees: boolean;
}

const REQUIRED_EXACT_FIELDS = [
  "solarDate",
  "lunarDate.month",
  "lunarDate.day",
  "sexShown",
] as const;

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/**
 * §5 blind double-entry — field-level diff between two independent
 * captures of the same calendar day. "Blind" here means the second
 * capture must be produced without consulting the first entry's values
 * (enforced procedurally when driving `WebFetch`, not by this pure
 * function) — this function only computes the diff and agreement.
 */
export function diffCalendarDayEntries(
  first: HuyenKhiCalendarDayRecord,
  second: HuyenKhiCalendarDayRecord,
): { diffs: FieldDiff[]; allExact: boolean } {
  const diffs: FieldDiff[] = [];

  for (const field of REQUIRED_EXACT_FIELDS) {
    const a = getPath(first as unknown as Record<string, unknown>, field);
    const b = getPath(second as unknown as Record<string, unknown>, field);
    diffs.push({ field, firstValue: a, secondValue: b, agrees: a === b });
  }

  const hourBranches = new Set([
    ...first.entries.map((e) => e.hourBranch),
    ...second.entries.map((e) => e.hourBranch),
  ]);
  for (const hourBranch of hourBranches) {
    const a = first.entries.find((e) => e.hourBranch === hourBranch);
    const b = second.entries.find((e) => e.hourBranch === hourBranch);
    diffs.push({
      field: `entries[${hourBranch}].displayedMenhScore`,
      firstValue: a?.displayedMenhScore ?? null,
      secondValue: b?.displayedMenhScore ?? null,
      agrees: (a?.displayedMenhScore ?? null) === (b?.displayedMenhScore ?? null),
    });
    diffs.push({
      field: `entries[${hourBranch}].displayedWholeChartTotal`,
      firstValue: a?.displayedWholeChartTotal ?? null,
      secondValue: b?.displayedWholeChartTotal ?? null,
      agrees: (a?.displayedWholeChartTotal ?? null) === (b?.displayedWholeChartTotal ?? null),
    });
  }

  return { diffs, allExact: diffs.every((d) => d.agrees) };
}

/**
 * Merges a second independent capture into `first`'s verification record.
 * §5 "do not average disputes" — a disagreement is recorded verbatim as
 * `"disputed"` with every mismatching field listed; nothing is averaged
 * or silently resolved.
 */
export function applySecondEntry(
  first: HuyenKhiCalendarDayRecord,
  second: HuyenKhiCalendarDayRecord,
  secondEntryBy: string,
): ManualVerification {
  const { diffs, allExact } = diffCalendarDayEntries(first, second);
  return {
    firstEntryBy: first.verification.firstEntryBy,
    firstEntryAt: first.verification.firstEntryAt,
    secondEntryBy,
    secondEntryAt: second.capturedAt,
    agreement: allExact ? "exact" : "disputed",
    disputeNotes: allExact
      ? []
      : diffs.filter((d) => !d.agrees).map((d) => `${d.field}: ${JSON.stringify(d.firstValue)} vs ${JSON.stringify(d.secondValue)}`),
  };
}

/**
 * §5/§9 promotion gate. Only `agreement === "exact"` may promote — a
 * disputed or pending record is refused, never averaged or force-passed.
 * `secondEntryBy` starting with `"claude-webfetch"` or
 * `"automated-re-extraction"` marks the result `"machine-diff-verified"`,
 * never `"gold"` (reserved for a human second entry) — see limitations.md.
 */
export function resolveVerificationTier(
  verification: ManualVerification,
): "gold" | "machine-diff-verified" | "single-pass-unverified" | "rejected" {
  if (verification.agreement === "disputed") return "rejected";
  if (verification.agreement === "pending") return "single-pass-unverified";
  const isAutomatedSecondEntry =
    verification.secondEntryBy != null &&
    /claude|automated|webfetch/i.test(verification.secondEntryBy);
  return isAutomatedSecondEntry ? "machine-diff-verified" : "gold";
}
