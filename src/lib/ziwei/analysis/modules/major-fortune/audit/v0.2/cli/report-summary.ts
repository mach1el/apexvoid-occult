/**
 * CLI: summarize the generated full-audit-report.v0.2.json.
 * Run `npm run research:major-fortune-v02:audit-full` first if missing/stale.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPORT_PATH = join(
  process.cwd(),
  "research/major-fortune/v0.2-foundation/audit/full-audit-report.v0.2.json",
);

function main(): void {
  if (!existsSync(REPORT_PATH)) {
    process.stderr.write(
      `Missing ${REPORT_PATH}. Run \`npm run research:major-fortune-v02:audit-full\` first.\n`,
    );
    process.exit(1);
  }
  const metrics = JSON.parse(readFileSync(REPORT_PATH, "utf8")) as {
    hardGateFailures?: string[];
    [key: string]: unknown;
  };
  console.log(JSON.stringify(metrics, null, 2));
  if ((metrics.hardGateFailures ?? []).length > 0) {
    console.error("hard gate failures:", metrics.hardGateFailures);
    process.exit(1);
  }
}

main();
