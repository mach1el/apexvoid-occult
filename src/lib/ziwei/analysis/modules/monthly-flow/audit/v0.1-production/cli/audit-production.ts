import { writeMonthlyFlowV01ProductionPack } from "../write-pack";

function main(): void {
  const { decision, metrics } = writeMonthlyFlowV01ProductionPack();
  console.log(
    JSON.stringify(
      {
        readinessDecision: decision.readinessDecision,
        hardGateFailures: decision.hardGateFailures,
        chartMonthObservations: metrics.chartMonthObservations,
        domainObservations: metrics.domainObservations,
        monthStatus: metrics.monthStatus,
      },
      null,
      2,
    ),
  );
  if (decision.hardGateFailures.length > 0) process.exit(1);
}

main();
