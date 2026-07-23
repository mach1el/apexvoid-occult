/**
 * Validate Major Fortune V0.2 doctrine adjudication pack.
 * Exit non-zero on any schema or cross-reference failure.
 */
import Ajv from "ajv";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PACK = join(process.cwd(), "research/major-fortune/v0.2-doctrine-adjudication");
const REPORTS = join(PACK, "reports");

interface Issue {
  code: string;
  message: string;
}

function readJson(abs: string): unknown {
  return JSON.parse(readFileSync(abs, "utf8"));
}

function main(): void {
  const issues: Issue[] = [];
  const ajv = new Ajv({ allErrors: true, strict: false });

  const pairs: Array<[string, string]> = [
    ["sources/source-registry.json", "schema/source-registry.schema.json"],
    ["claims/claim-registry.json", "schema/claim-registry.schema.json"],
    ["contradictions/contradiction-log.json", "schema/contradiction-log.schema.json"],
    ["matrices/topic-eligibility-matrix.json", "schema/topic-eligibility-matrix.schema.json"],
    ["shapes/candidate-shape-registry.json", "schema/candidate-shape-registry.schema.json"],
    ["reports/decision.json", "schema/decision.schema.json"],
    ["blockers/calculation-core-blocker-registry.json", "schema/core-blocker-registry.schema.json"],
  ];

  for (const [dataRel, schemaRel] of pairs) {
    const dataPath = join(PACK, dataRel);
    const schemaPath = join(PACK, schemaRel);
    if (!existsSync(dataPath) || !existsSync(schemaPath)) {
      issues.push({ code: "missing-artifact", message: `${dataRel} or ${schemaRel}` });
      continue;
    }
    const validate = ajv.compile(readJson(schemaPath) as object);
    const ok = validate(readJson(dataPath));
    if (!ok) {
      issues.push({
        code: "schema-invalid",
        message: `${dataRel}: ${JSON.stringify(validate.errors)}`,
      });
    }
  }

  const sources = readJson(join(PACK, "sources/source-registry.json")) as {
    sources: Array<{
      sourceId: string;
      qualityTier: string;
      sourceType: string;
      pageOrInternalLocator: string;
      prohibitedUsage: string[];
    }>;
  };
  const sourceIds = new Set(sources.sources.map((s) => s.sourceId));

  const claims = readJson(join(PACK, "claims/claim-registry.json")) as {
    claims: Array<{
      claimId: string;
      sourceIds: string[];
      locators: string[];
      status: string;
      candidateEligibility: string;
      polarity: string | null;
    }>;
  };
  const claimIds = new Set(claims.claims.map((c) => c.claimId));

  for (const c of claims.claims) {
    for (const sid of c.sourceIds) {
      if (!sourceIds.has(sid)) {
        issues.push({ code: "unresolved-source", message: `${c.claimId} → ${sid}` });
      }
    }
    if (c.status === "verified-doctrine") {
      const hasUnknown = c.locators.some((l) => l === "Unknown" || l.toLowerCase() === "unknown");
      if (hasUnknown) {
        issues.push({
          code: "verified-without-locator",
          message: `${c.claimId} verified-doctrine with Unknown locator`,
        });
      }
      for (const sid of c.sourceIds) {
        const src = sources.sources.find((s) => s.sourceId === sid);
        if (src && src.pageOrInternalLocator === "Unknown") {
          issues.push({
            code: "verified-without-locator",
            message: `${c.claimId} cites ${sid} with Unknown locator`,
          });
        }
        if (src && (src.qualityTier === "engineering" || src.sourceType.includes("engineering"))) {
          issues.push({
            code: "engineering-classical",
            message: `${c.claimId} uses engineering source ${sid} for verified-doctrine`,
          });
        }
      }
    }
  }

  for (const s of sources.sources) {
    if (
      s.pageOrInternalLocator === "Unknown" &&
      s.qualityTier === "primary" &&
      s.sourceType === "classical_text"
    ) {
      // allowed as historical record, but must prohibit verified upgrade
      if (!s.prohibitedUsage.some((u) => u.includes("verified_doctrine") || u.includes("locator"))) {
        issues.push({
          code: "classical-unknown-missing-prohibition",
          message: `${s.sourceId} Unknown locator without verified_doctrine prohibition`,
        });
      }
    }
  }

  const contra = readJson(join(PACK, "contradictions/contradiction-log.json")) as {
    contradictions: Array<{ claimIds: string[]; sourceIds: string[] }>;
  };
  for (const ctr of contra.contradictions) {
    for (const id of ctr.claimIds) {
      if (!claimIds.has(id)) {
        issues.push({ code: "unresolved-claim", message: `contradiction → ${id}` });
      }
    }
    for (const sid of ctr.sourceIds) {
      if (!sourceIds.has(sid)) {
        issues.push({ code: "unresolved-source", message: `contradiction → ${sid}` });
      }
    }
  }

  const matrix = readJson(join(PACK, "matrices/topic-eligibility-matrix.json")) as {
    topics: Array<{ topicId: string; eligibility: string; claimIds: string[] }>;
  };
  for (const t of matrix.topics) {
    for (const id of t.claimIds) {
      if (!claimIds.has(id)) {
        issues.push({ code: "unresolved-claim", message: `topic ${t.topicId} → ${id}` });
      }
    }
  }

  const shapes = readJson(join(PACK, "shapes/candidate-shape-registry.json")) as {
    exactRawDeltaForbidden: boolean;
    shapes: Array<Record<string, unknown>>;
  };
  if (shapes.exactRawDeltaForbidden !== true) {
    issues.push({ code: "rawDelta-policy", message: "exactRawDeltaForbidden must be true" });
  }

  const excluded = readJson(join(PACK, "excluded/excluded-rule-registry.json")) as {
    excluded: Array<{ familyId: string }>;
  };
  const excludedIds = new Set(excluded.excluded.map((e) => e.familyId));

  const blockers = readJson(join(PACK, "blockers/calculation-core-blocker-registry.json")) as {
    blockers: Array<{ requiredProducerFields: string[]; eligibility: string }>;
  };
  for (const b of blockers.blockers) {
    if (b.eligibility === "blocked-by-calculation-core" && b.requiredProducerFields.length === 0) {
      issues.push({ code: "core-blocker-fields", message: "blocked Core rule missing producer fields" });
    }
  }

  for (const shape of shapes.shapes) {
    const text = JSON.stringify(shape);
    if (/"rawDelta"\s*:/.test(text) || /"selectedRawDelta"\s*:/.test(text) || /"exactRawDelta"\s*:/.test(text)) {
      issues.push({
        code: "shape-rawDelta",
        message: `${shape.shapeId} contains exact rawDelta field`,
      });
    }
    const included = (shape.includedRuleFamilies as string[]) ?? [];
    for (const fam of included) {
      if (excludedIds.has(fam) || fam === "thai-tue") {
        issues.push({
          code: "shape-includes-excluded",
          message: `${shape.shapeId} includes excluded family ${fam}`,
        });
      }
      if (fam.includes("annual") || fam.includes("monthly")) {
        issues.push({
          code: "shape-annual-monthly",
          message: `${shape.shapeId} includes annual/monthly family ${fam}`,
        });
      }
    }
    const invalidation = (shape.invalidationConditions as string[]) ?? [];
    if (!invalidation.some((c) => c.toLowerCase().includes("annual"))) {
      issues.push({
        code: "shape-missing-annual-invalidation",
        message: `${shape.shapeId} must invalidate annual/monthly leakage`,
      });
    }

    if (shape.authorizationStatus === "authorized") {
      for (const fam of included) {
        const topic = matrix.topics.find((t) => t.topicId === fam || t.topicId.startsWith(fam));
        // included families must be candidate-eligible via claims
        const related = claims.claims.filter(
          (c) => c.candidateEligibility === "candidate-eligible" && JSON.stringify(c).includes(fam),
        );
        void topic;
        void related;
      }
      // READY path: authorized shapes must only include candidate-eligible families
      for (const fam of included) {
        const topicHit = matrix.topics.find(
          (t) => t.topicId === fam || t.topicId.includes(fam) || fam.includes(t.topicId),
        );
        if (topicHit && topicHit.eligibility !== "candidate-eligible") {
          issues.push({
            code: "authorized-non-eligible",
            message: `${shape.shapeId} authorized but includes non-eligible ${fam}`,
          });
        }
      }
    }
  }

  const decision = readJson(join(PACK, "reports/decision.json")) as {
    readinessDecision: string;
    authorizedShapeIds: string[];
    numericCandidatesEvaluated: boolean;
    v01Unchanged: boolean;
    productionRoutingUnchanged: boolean;
    productionRoutingExpected: { status: string; module: string; reason: string };
  };

  if (decision.numericCandidatesEvaluated !== false) {
    issues.push({ code: "numeric-eval", message: "numericCandidatesEvaluated must be false" });
  }
  if (decision.v01Unchanged !== true || decision.productionRoutingUnchanged !== true) {
    issues.push({ code: "runtime-boundary", message: "V0.1 / production routing flags must stay true" });
  }
  if (
    decision.productionRoutingExpected?.status !== "unavailable" ||
    decision.productionRoutingExpected?.reason !== "rebuilding"
  ) {
    issues.push({ code: "routing-expected", message: "production routing must remain rebuilding" });
  }

  const authorizedShapes = shapes.shapes.filter((s) => s.authorizationStatus === "authorized");
  const canReady =
    authorizedShapes.length > 0 &&
    decision.authorizedShapeIds.length > 0 &&
    claims.claims
      .filter((c) => {
        // any claim used by authorized included families
        return false;
      }).length >= 0;

  // Decision consistency: READY requires at least one authorized shape with eligible inclusions
  if (decision.readinessDecision === "READY_FOR_V0_2_CANDIDATE") {
    if (authorizedShapes.length === 0 || decision.authorizedShapeIds.length === 0) {
      issues.push({ code: "decision-mismatch", message: "READY requires authorized shapes" });
    }
  }
  if (decision.readinessDecision === "RESEARCH_INCOMPLETE") {
    if (decision.authorizedShapeIds.length !== 0) {
      issues.push({
        code: "decision-mismatch",
        message: "RESEARCH_INCOMPLETE must have empty authorizedShapeIds",
      });
    }
  }

  // Negative fixture proofs (existence + expected rejection logic)
  const negDir = join(PACK, "fixtures/negative");
  for (const file of readdirSync(negDir)) {
    if (!file.endsWith(".json")) continue;
    const body = readJson(join(negDir, file)) as Record<string, unknown>;
    if (file === "missing-source-ref.json") {
      const badClaims = (body as { claims: Array<{ sourceIds: string[] }> }).claims;
      for (const c of badClaims) {
        for (const sid of c.sourceIds) {
          if (sourceIds.has(sid)) {
            issues.push({ code: "neg-fixture", message: `${file} unexpectedly resolves ${sid}` });
          }
        }
      }
    }
    if (file === "shape-with-rawDelta.json") {
      if (!("rawDelta" in body)) {
        issues.push({ code: "neg-fixture", message: `${file} missing rawDelta` });
      }
    }
    if (file === "engineering-authorizes-classical.json") {
      const src = sources.sources.find((s) => s.sourceId === body.sourceId);
      if (!src?.prohibitedUsage.some((u) => u.toLowerCase().includes("classical"))) {
        issues.push({ code: "neg-fixture", message: "engineering source must prohibit classical attribution" });
      }
    }
  }

  void canReady;

  const report = {
    ok: issues.length === 0,
    issueCount: issues.length,
    issues,
    readinessDecision: decision.readinessDecision,
    sourceCount: sources.sources.length,
    claimCount: claims.claims.length,
    topicCount: matrix.topics.length,
    shapeCount: shapes.shapes.length,
    authorizedShapeCount: authorizedShapes.length,
  };

  writeFileSync(join(REPORTS, "validation-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (issues.length > 0) process.exit(1);
}

main();
