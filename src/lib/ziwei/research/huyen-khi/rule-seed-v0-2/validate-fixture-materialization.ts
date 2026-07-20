import { loadHuyenKhiOntology } from "../ontology/load-ontology";
import { validateFixture } from "../ontology/validate-fixture";
import type { ValidationIssue, ValidationResult } from "./types";

function error(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message, severity: "error" };
}

export function validateFixtureMaterialization(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fixtures = data?.fixtures?.fixtures;
  const batches = data?.batches?.batches;

  if (!Array.isArray(fixtures)) {
    return {
      valid: false,
      issues: [error("FIX_ARRAY", "fixtures.fixtures", "fixtures must be an array")],
    };
  }
  if (!Array.isArray(batches)) {
    issues.push(error("BATCH_ARRAY", "batches.batches", "batches must be an array"));
  }

  const loaded = loadHuyenKhiOntology();
  if (!loaded.ok) {
    return {
      valid: false,
      issues: [
        ...issues,
        error(
          "ONTOLOGY_INVALID",
          "ontology",
          "canonical ontology V0.1 failed to load; fixture validation fails closed",
        ),
      ],
    };
  }

  const knownSourceIds = new Set(
    loaded.ontology.sourceRegistry.sources.map((source) => source.sourceId),
  );
  const knownRuleIds = new Set(
    (data?.rules?.rules ?? []).map((rule: any) => rule.ruleId),
  );
  const knownExtractionIds = new Set(
    (data?.extractions?.extractions ?? []).map((entry: any) => entry.extractionId),
  );
  const knownTopicIds = new Set(
    loaded.ontology.researchTopicCoverage.topics.map((topic) => topic.topicId),
  );
  const fixtureIds = new Set<string>();

  fixtures.forEach((fixture: unknown, index: number) => {
    const record = fixture as Record<string, unknown>;
    const fixtureId = typeof record?.fixtureId === "string" ? record.fixtureId : "";
    if (fixtureId && fixtureIds.has(fixtureId)) {
      issues.push(
        error(
          "FIX_DUPLICATE_ID",
          `fixtures[${index}].fixtureId`,
          `duplicate fixtureId ${fixtureId}`,
        ),
      );
    }
    if (fixtureId) fixtureIds.add(fixtureId);

    for (const canonicalIssue of validateFixture(
      fixture,
      "fixture-materialization-plan.v0.2.json",
      index,
    )) {
      issues.push({
        code: canonicalIssue.code,
        path: canonicalIssue.path.replace(/^\$\./, ""),
        message: canonicalIssue.message,
        severity: canonicalIssue.severity,
      });
    }

    for (const [sourceIndex, sourceId] of (
      Array.isArray(record?.candidateSourceIds) ? record.candidateSourceIds : []
    ).entries()) {
      if (typeof sourceId !== "string" || !knownSourceIds.has(sourceId)) {
        issues.push(
          error(
            "FIX_UNRESOLVED_SOURCE",
            `fixtures[${index}].candidateSourceIds[${sourceIndex}]`,
            `source '${String(sourceId)}' is not registered`,
          ),
        );
      }
    }
    for (const field of ["expectedEffectiveRuleIds", "forbiddenRuleIds"] as const) {
      for (const [ruleIndex, ruleId] of (
        Array.isArray(record?.[field]) ? record[field] : []
      ).entries()) {
        if (typeof ruleId !== "string" || !knownRuleIds.has(ruleId)) {
          issues.push(
            error(
              "FIX_UNRESOLVED_RULE",
              `fixtures[${index}].${field}[${ruleIndex}]`,
              `candidate rule '${String(ruleId)}' is not materialized`,
            ),
          );
        }
      }
    }
  });

  const batchIds = new Set<string>();
  (batches ?? []).forEach((batch: any, index: number) => {
    const base = `batches[${index}]`;
    if (typeof batch?.batchId !== "string" || !batch.batchId.startsWith("HK-BATCH-")) {
      issues.push(error("BATCH_INVALID_ID", `${base}.batchId`, "invalid batchId"));
    } else if (batchIds.has(batch.batchId)) {
      issues.push(
        error("BATCH_DUPLICATE_ID", `${base}.batchId`, `duplicate batchId ${batch.batchId}`),
      );
    } else {
      batchIds.add(batch.batchId);
    }

    for (const [refIndex, fixtureId] of (batch?.fixtureIds ?? []).entries()) {
      if (!fixtureIds.has(fixtureId)) {
        issues.push(
          error(
            "BATCH_UNRESOLVED_FIXTURE",
            `${base}.fixtureIds[${refIndex}]`,
            `fixture '${fixtureId}' is not materialized`,
          ),
        );
      }
    }
    for (const [refIndex, topicId] of (batch?.topicIds ?? []).entries()) {
      if (!knownTopicIds.has(topicId)) {
        issues.push(
          error(
            "BATCH_UNRESOLVED_TOPIC",
            `${base}.topicIds[${refIndex}]`,
            `topic '${topicId}' is not canonical`,
          ),
        );
      }
    }
    for (const [refIndex, extractionId] of (batch?.extractionIds ?? []).entries()) {
      if (!knownExtractionIds.has(extractionId)) {
        issues.push(
          error(
            "BATCH_UNRESOLVED_EXTRACTION",
            `${base}.extractionIds[${refIndex}]`,
            `extraction '${extractionId}' is not materialized`,
          ),
        );
      }
    }
    for (const [refIndex, sourceId] of (batch?.sourceIds ?? []).entries()) {
      if (!knownSourceIds.has(sourceId)) {
        issues.push(
          error(
            "BATCH_UNRESOLVED_SOURCE",
            `${base}.sourceIds[${refIndex}]`,
            `source '${sourceId}' is not registered`,
          ),
        );
      }
    }
    for (const [refIndex, ruleId] of (batch?.candidateRuleIds ?? []).entries()) {
      if (!knownRuleIds.has(ruleId)) {
        issues.push(
          error(
            "BATCH_UNRESOLVED_RULE",
            `${base}.candidateRuleIds[${refIndex}]`,
            `candidate rule '${ruleId}' is not materialized`,
          ),
        );
      }
    }
  });

  return { valid: !issues.some((entry) => entry.severity === "error"), issues };
}
