/**
 * Emit doctrine adjudication summary report (deterministic JSON).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PACK = join(process.cwd(), "research/major-fortune/v0.2-doctrine-adjudication");

function readJson(rel: string): unknown {
  return JSON.parse(readFileSync(join(PACK, rel), "utf8"));
}

function main(): void {
  const decision = readJson("reports/decision.json") as Record<string, unknown>;
  const matrix = readJson("matrices/topic-eligibility-matrix.json") as {
    topics: Array<{ topicId: string; eligibility: string }>;
  };
  const shapes = readJson("shapes/candidate-shape-registry.json") as {
    shapes: Array<{ shapeId: string; authorizationStatus: string }>;
  };
  const sources = readJson("sources/source-registry.json") as {
    sources: Array<{ sourceId: string; qualityTier: string; pageOrInternalLocator: string }>;
  };
  const contra = readJson("contradictions/contradiction-log.json") as {
    contradictions: Array<{ contradictionId: string; status: string }>;
  };

  const locatorCoverage = {
    known: sources.sources.filter((s) => s.pageOrInternalLocator !== "Unknown").length,
    unknown: sources.sources.filter((s) => s.pageOrInternalLocator === "Unknown").length,
    byTier: sources.sources.reduce<Record<string, number>>((acc, s) => {
      acc[s.qualityTier] = (acc[s.qualityTier] ?? 0) + 1;
      return acc;
    }, {}),
  };

  const report = {
    reportId: "major-fortune-v0.2-doctrine-summary",
    readinessDecision: decision.readinessDecision,
    topics: Object.fromEntries(matrix.topics.map((t) => [t.topicId, t.eligibility])),
    shapes: shapes.shapes.map((s) => ({
      shapeId: s.shapeId,
      authorizationStatus: s.authorizationStatus,
    })),
    authorizedShapeFrozen: (decision.authorizedShapeIds as string[]).length > 0,
    numericCandidatesEvaluated: decision.numericCandidatesEvaluated,
    locatorCoverage,
    openContradictions: contra.contradictions.filter((c) => c.status === "open").map((c) => c.contradictionId),
    candidateEligibleRuleFamilies: decision.candidateEligibleRuleFamilies,
    researchBlockedRuleFamilies: decision.researchBlockedRuleFamilies,
    excludedRuleFamilies: decision.excludedRuleFamilies,
    blockedByCalculationCoreFamilies: decision.blockedByCalculationCoreFamilies,
    metadataOnlyFamilies: decision.metadataOnlyFamilies,
    v01Unchanged: decision.v01Unchanged,
    productionRoutingUnchanged: decision.productionRoutingUnchanged,
  };

  const out = join(PACK, "reports/summary-report.json");
  const body = JSON.stringify(report, null, 2) + "\n";
  writeFileSync(out, body);
  console.log(body);
}

main();
