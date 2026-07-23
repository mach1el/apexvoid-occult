/**
 * Run Major Fortune V0.3 evidence-adapter corpus audit and write research pack.
 */
import { writeMajorFortuneV03AdapterAudit } from "../write-reports";

function main(): void {
  const { decision, metrics } = writeMajorFortuneV03AdapterAudit();
  console.log(
    JSON.stringify(
      {
        readinessDecision: decision.readinessDecision,
        hardGateFailures: decision.hardGateFailures,
        chartCount: metrics.chartCount,
        cycleObservationCount: metrics.cycleObservationCount,
        bySchool: Object.fromEntries(
          Object.entries(metrics.schools).map(([k, s]) => [
            k,
            {
              observations: s.cycleObservationCount,
              score: s.score,
              familyActivation: s.familyActivation,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
  if (decision.hardGateFailures.length > 0) process.exit(1);
}

main();
