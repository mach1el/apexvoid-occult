/**
 * Re-emit summary/report views from the latest adapter audit metrics by re-running write.
 * Deterministic: identical inputs → identical tracked files.
 */
import { writeMajorFortuneV03AdapterAudit } from "../write-reports";

function main(): void {
  const { decision, metrics } = writeMajorFortuneV03AdapterAudit();
  console.log(
    JSON.stringify(
      {
        ok: true,
        readinessDecision: decision.readinessDecision,
        summaryPath: "research/major-fortune/v0.3-evidence-adapter-audit/reports/summary-report.json",
        cycleObservationCount: metrics.cycleObservationCount,
      },
      null,
      2,
    ),
  );
}

main();
