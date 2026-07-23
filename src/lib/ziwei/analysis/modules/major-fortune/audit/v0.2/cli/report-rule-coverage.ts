/**
 * CLI: summarize rule coverage from full-audit-report.v0.2.json + runtime rules.
 * Run `npm run research:major-fortune-v02:audit-full` first if missing/stale.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPORT_PATH = join(
  process.cwd(),
  "research/major-fortune/v0.2-foundation/audit/full-audit-report.v0.2.json",
);
const RULES_PATH = join(
  process.cwd(),
  "src/lib/ziwei/analysis/knowledge/major-fortune-scoring/v0.2/rules.v0.2.json",
);

function main(): void {
  if (!existsSync(REPORT_PATH)) {
    process.stderr.write(
      `Missing ${REPORT_PATH}. Run \`npm run research:major-fortune-v02:audit-full\` first.\n`,
    );
    process.exit(1);
  }
  const metrics = JSON.parse(readFileSync(REPORT_PATH, "utf8")) as {
    ruleCoverage: {
      matchedStructuralRuleIds: string[];
      executableContributionRuleIds: string[];
      bySchool: Record<string, string[]>;
    };
  };
  const rulesDoc = JSON.parse(readFileSync(RULES_PATH, "utf8")) as {
    rules: Array<{ ruleId: string }>;
  };
  const report = {
    totalRules: rulesDoc.rules.length,
    matchedStructuralInFullAudit: metrics.ruleCoverage.matchedStructuralRuleIds.length,
    executableContributions: metrics.ruleCoverage.executableContributionRuleIds,
    matchedStructuralRuleIds: metrics.ruleCoverage.matchedStructuralRuleIds,
    bySchool: metrics.ruleCoverage.bySchool,
  };
  console.log(JSON.stringify(report, null, 2));
}

main();
