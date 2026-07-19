import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { HUYEN_KHI_DATA_DIR } from "./load-dataset";
import { resolveVerificationTier } from "./gold-workflow";
import type { HuyenKhiCalendarDayRecord } from "./types-v02";

const V02_DIR = path.resolve(HUYEN_KHI_DATA_DIR, "../v0.2");

export interface CorpusManifestV02 {
  goldRecordCount: number;
  machineDiffVerifiedRecordCount: number;
  singlePassUnverifiedRecordCount: number;
  calendarDaysCaptured: number;
  calendarEntriesCaptured: number;
  v01RecordsRecovered: number;
  v01RecordsAttempted: number;
  v01RecordsTotal: number;
  goldTarget: number;
  goldTargetCompletionRate: number;
}

function loadCalendarDays(): HuyenKhiCalendarDayRecord[] {
  const files = readdirSync(V02_DIR).filter(
    (f) => f.startsWith("calendar-day-") && f.endsWith(".json"),
  );
  return files.map(
    (f) => JSON.parse(readFileSync(path.join(V02_DIR, f), "utf-8")) as HuyenKhiCalendarDayRecord,
  );
}

/**
 * §6/§14 corpus manifest — reports real current-vs-target composition.
 * Never fabricates records to approach the 60-gold target; see
 * `research/huyen-khi/v0.2/source-access-review.md` for why that target
 * was not reachable this pass (detail pages require client-side
 * rendering this program's tools cannot execute).
 */
export function buildCorpusManifestV02(): CorpusManifestV02 {
  const calendarDays = loadCalendarDays();
  const entriesCaptured = calendarDays.reduce((sum, d) => sum + d.entries.length, 0);

  let gold = 0;
  let machineDiffVerified = 0;
  let singlePass = 0;
  for (const day of calendarDays) {
    const tier = resolveVerificationTier(day.verification);
    if (tier === "gold") gold += 1;
    else if (tier === "machine-diff-verified") machineDiffVerified += 1;
    else if (tier === "single-pass-unverified") singlePass += 1;
  }

  const recoveryReport = JSON.parse(
    readFileSync(path.join(V02_DIR, "reports/v01-date-recovery-report.json"), "utf-8"),
  ) as { totalV01Records: number; attempted: number; recovered: unknown[] };

  const goldTarget = 60;
  return {
    goldRecordCount: gold,
    machineDiffVerifiedRecordCount: machineDiffVerified,
    singlePassUnverifiedRecordCount: singlePass,
    calendarDaysCaptured: calendarDays.length,
    calendarEntriesCaptured: entriesCaptured,
    v01RecordsRecovered: recoveryReport.recovered.length,
    v01RecordsAttempted: recoveryReport.attempted,
    v01RecordsTotal: recoveryReport.totalV01Records,
    goldTarget,
    goldTargetCompletionRate: Math.round((gold / goldTarget) * 1000) / 1000,
  };
}
