import { describe, expect, it } from "vitest";
import { buildCorpusManifestV02 } from "../build-controlled-corpus-v02";

describe("buildCorpusManifestV02", () => {
  it("reports the real, honest current-vs-target composition — no fabricated records", () => {
    const manifest = buildCorpusManifestV02();
    expect(manifest.goldTarget).toBe(60);
    expect(manifest.goldRecordCount).toBeLessThan(manifest.goldTarget);
    expect(manifest.calendarDaysCaptured).toBe(2);
    // HK-PUB-002's calendar day has an automated (Claude WebFetch) second
    // entry — machine-diff-verified, not human-verified gold.
    expect(manifest.machineDiffVerifiedRecordCount).toBeGreaterThanOrEqual(1);
    expect(manifest.v01RecordsRecovered).toBe(1);
    expect(manifest.v01RecordsTotal).toBe(18);
  });
});
