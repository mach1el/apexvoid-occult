import { writeMonthlyFlowV01ProductionPack } from "../write-pack";

function main(): void {
  const { decision, metrics } = writeMonthlyFlowV01ProductionPack();
  console.log(
    JSON.stringify(
      {
        readinessDecision: decision.readinessDecision,
        chartMonthObservations: metrics.chartMonthObservations,
        domainObservations: metrics.domainObservations,
        monthStatus: metrics.monthStatus,
        hardGateFailures: decision.hardGateFailures,
      },
      null,
      2,
    ),
  );
}

main();
