import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MF_V02_FULL_CORPUS } from "./corpus";
import { runMajorFortuneV02Audit } from "./run-audit";

const ENABLED = process.env.MAJOR_FORTUNE_V02_FULL_AUDIT === "1";

export function writeFullAuditReport(): { reportPath: string; metrics: ReturnType<typeof runMajorFortuneV02Audit> } {
  if (!ENABLED) {
    throw new Error("MAJOR_FORTUNE_V02_FULL_AUDIT=1 required to write audit artifacts");
  }
  const metrics = runMajorFortuneV02Audit(MF_V02_FULL_CORPUS);
  const dir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../../../../../research/major-fortune/v0.2-foundation/audit",
  );
  fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, "full-audit-report.v0.2.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(metrics, null, 2)}\n`);
  return { reportPath, metrics };
}
