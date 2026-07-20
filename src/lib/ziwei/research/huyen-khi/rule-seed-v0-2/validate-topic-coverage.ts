import { loadHuyenKhiOntology } from "../ontology/load-ontology";
import type { ValidationIssue, ValidationResult } from "./types";

function error(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message, severity: "error" };
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateTopicCoverage(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const topics = data?.topics?.topics;

  if (!Array.isArray(topics)) {
    return {
      valid: false,
      issues: [error("TOPIC_ARRAY", "topics.topics", "topics must be an array")],
    };
  }

  const loaded = loadHuyenKhiOntology();
  if (!loaded.ok) {
    return {
      valid: false,
      issues: [
        error(
          "ONTOLOGY_INVALID",
          "ontology",
          "canonical ontology V0.1 failed to load; topic validation fails closed",
        ),
      ],
    };
  }

  const expectedIds = loaded.ontology.researchTopicCoverage.topics.map(
    (topic) => topic.topicId,
  );
  const expectedSet = new Set(expectedIds);
  const actualIds = topics.map((topic: any) => topic?.topicId);
  const actualSet = new Set(actualIds.filter((id: unknown): id is string => typeof id === "string"));

  if (topics.length !== expectedIds.length) {
    issues.push(
      error(
        "TOPIC_COUNT",
        "topics",
        `expected ${expectedIds.length} ontology topics, found ${topics.length}`,
      ),
    );
  }
  expectedIds.forEach((id) => {
    if (!actualSet.has(id)) {
      issues.push(error("TOPIC_MISSING_CANONICAL", "topics", `missing canonical topic ${id}`));
    }
  });
  actualSet.forEach((id) => {
    if (!expectedSet.has(id)) {
      issues.push(error("TOPIC_UNKNOWN", "topics", `unknown topic ${id}`));
    }
  });
  if (actualSet.size !== actualIds.length) {
    issues.push(error("TOPIC_DUPLICATE_ID", "topics", "topic IDs must be unique strings"));
  }

  const knownSourceIds = new Set(
    loaded.ontology.sourceRegistry.sources.map((source) => source.sourceId),
  );
  const knownExtractionIds = new Set(
    (data?.extractions?.extractions ?? []).map((entry: any) => entry.extractionId),
  );
  const knownRuleIds = new Set(
    (data?.rules?.rules ?? []).map((rule: any) => rule.ruleId),
  );
  const knownFixtureIds = new Set(
    (data?.fixtures?.fixtures ?? []).map((fixture: any) => fixture.fixtureId),
  );

  topics.forEach((topic: any, index: number) => {
    const base = `topics[${index}]`;
    for (const field of [
      "plannedSourceIds",
      "extractionIds",
      "candidateRuleIds",
      "fixtureIds",
      "unresolvedQuestions",
    ]) {
      if (!stringArray(topic?.[field])) {
        issues.push(
          error("TOPIC_INVALID_ARRAY", `${base}.${field}`, `${field} must be a string array`),
        );
      }
    }
    if (!new Set(["unresolved", "candidate-located", "witness-verified", "source-reviewed"]).has(topic?.evidenceStatus)) {
      issues.push(
        error(
          "TOPIC_INVALID_STATUS",
          `${base}.evidenceStatus`,
          `unsupported evidence status '${String(topic?.evidenceStatus)}'`,
        ),
      );
    }

    (topic?.plannedSourceIds ?? []).forEach((id: string, refIndex: number) => {
      if (!knownSourceIds.has(id)) {
        issues.push(
          error(
            "TOPIC_UNRESOLVED_SOURCE",
            `${base}.plannedSourceIds[${refIndex}]`,
            `source '${id}' is not registered`,
          ),
        );
      }
    });
    (topic?.extractionIds ?? []).forEach((id: string, refIndex: number) => {
      if (!knownExtractionIds.has(id)) {
        issues.push(
          error(
            "TOPIC_UNRESOLVED_EXTRACTION",
            `${base}.extractionIds[${refIndex}]`,
            `extraction '${id}' is not materialized`,
          ),
        );
      }
    });
    (topic?.candidateRuleIds ?? []).forEach((id: string, refIndex: number) => {
      if (!knownRuleIds.has(id)) {
        issues.push(
          error(
            "TOPIC_UNRESOLVED_RULE",
            `${base}.candidateRuleIds[${refIndex}]`,
            `candidate rule '${id}' is not materialized`,
          ),
        );
      }
    });
    (topic?.fixtureIds ?? []).forEach((id: string, refIndex: number) => {
      if (!knownFixtureIds.has(id)) {
        issues.push(
          error(
            "TOPIC_UNRESOLVED_FIXTURE",
            `${base}.fixtureIds[${refIndex}]`,
            `fixture '${id}' is not materialized in V0.2`,
          ),
        );
      }
    });

    if (topic?.evidenceStatus === "candidate-located" && !(topic?.extractionIds?.length > 0)) {
      issues.push(
        error(
          "TOPIC_STATUS_WITHOUT_EXTRACTION",
          `${base}.evidenceStatus`,
          "candidate-located requires at least one extractionId",
        ),
      );
    }
    if (topic?.evidenceStatus === "unresolved" && topic?.extractionIds?.length > 0) {
      issues.push(
        error(
          "TOPIC_UNRESOLVED_WITH_EXTRACTION",
          `${base}.evidenceStatus`,
          "unresolved topic cannot claim materialized extraction IDs",
        ),
      );
    }
  });

  return { valid: !issues.some((entry) => entry.severity === "error"), issues };
}
