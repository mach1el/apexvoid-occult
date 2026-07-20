import fs from "node:fs";
import path from "node:path";
import { REPORTS_DIR } from "./paths";

export function generateReports(data: any) {
  const write = (file: string, content: any) => fs.writeFileSync(path.join(REPORTS_DIR, file), JSON.stringify(content, null, 2) + "\n");
  
  write("topic-coverage-report.v0.2.json", {
    totalTopics: data.topics.topics.length,
    resolvedTopics: data.topics.topics.filter((t: any) => t.sourceIds?.length > 0).length,
    unresolvedTopics: data.topics.topics.filter((t: any) => !t.sourceIds?.length).length
  });
  
  write("source-extraction-report.v0.2.json", {
    candidateLocated: data.extractions.extractions.length,
    witnessVerified: 0,
    sourceReviewed: 0
  });
  
  write("candidate-rule-report.v0.2.json", {
    totalRules: data.rules.rules.length,
    effectiveRules: data.rules.rules.filter((r: any) => r.effective).length
  });
  
  const researchReady = data.fixtures.fixtures.filter((f: any) => f.maturity === "research-ready").length;
  write("fixture-readiness-report.v0.2.json", {
    planned: data.fixtures.fixtures.filter((f: any) => f.maturity === "planned").length,
    researchReady,
    reviewable: data.fixtures.fixtures.filter((f: any) => f.maturity === "reviewable").length
  });
  
  write("review-work-queue-report.v0.2.json", {
    batches: data.batches.batches.length
  });
  
  write("promotion-gate-snapshot.v0.2.json", {
    approvedExpertFixtureCount: 0,
    symbolicEvaluatorPhaseUnlocked: false
  });
}
