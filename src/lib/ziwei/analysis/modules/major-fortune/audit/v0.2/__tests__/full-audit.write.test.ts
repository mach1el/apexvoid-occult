import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { writeFullAuditReport } from "../write-full-audit";

const ENABLED = process.env.MAJOR_FORTUNE_V02_FULL_AUDIT === "1";

describe.runIf(ENABLED)("Major Fortune V0.2 full audit write", () => {
  it("writes deterministic report twice with zero diff", () => {
    const first = writeFullAuditReport();
    const firstBody = fs.readFileSync(first.reportPath, "utf8");
    const second = writeFullAuditReport();
    const secondBody = fs.readFileSync(second.reportPath, "utf8");
    expect(secondBody).toEqual(firstBody);
    expect(first.metrics.hardGateFailures).toEqual([]);
  });
});
