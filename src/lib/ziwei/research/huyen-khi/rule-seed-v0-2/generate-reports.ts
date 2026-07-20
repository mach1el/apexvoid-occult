import fs from "node:fs";
import path from "node:path";

import { loadHuyenKhiOntology } from "../ontology/load-ontology";
import {
  countFixtureMaturity,
  countFixtureStatuses,
  promotionContext,
} from "../ontology/validate-fixture";
import type { HuyenKhiExpertFixturePlan } from "../ontology/types";
import { REPORTS_DIR } from "./paths";

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function requiredGateNumber(
  gates: Readonly<Record<string, unknown>>,
  key: string,
): number {
  const value = gates[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Promotion gate '${key}' must be a finite number`);
  }
  return value;
}

function requiredGateBoolean(
  gates: Readonly<Record<string, unknown>>,
  key: string,
): boolean {
  const value = gates[key];
  if (typeof value !== "boolean") {
    throw new Error(`Promotion gate '${key}' must be a boolean`);
  }
  return value;
}

function requiredGateStrings(
  gates: Readonly<Record<string, unknown>>,
  key: string,
): string[] {
  const value = gates[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Promotion gate '${key}' must be a string array`);
  }
  return value;
}

export function generateReports(data: any) {
  const loaded = loadHuyenKhiOntology();
  if (!loaded.ok) {
    throw new Error("Cannot generate V0.2 reports: ontology V0.1 is invalid");
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const write = (file: string, content: unknown) =>
    fs.writeFileSync(
      path.join(REPORTS_DIR, file),
      `${JSON.stringify(content, null, 2)}\n`,
    );

  const topics = data.topics.topics as any[];
  const extractions = data.extractions.extractions as any[];
  const rules = data.rules.rules as any[];
  const fixtures = data.fixtures as HuyenKhiExpertFixturePlan;
  const batches = data.batches.batches as any[];
  const transformationDossiers = data.transformations.dossiers as any[];

  const candidateLocatedTopics = topics.filter(
    (topic) => topic.evidenceStatus === "candidate-located",
  ).length;
  const witnessVerifiedTopics = topics.filter(
    (topic) => topic.evidenceStatus === "witness-verified",
  ).length;
  const sourceReviewedTopics = topics.filter(
    (topic) => topic.evidenceStatus === "source-reviewed",
  ).length;
  const sourceReviewedMajorStars = topics.filter(
    (topic) =>
      topic.topicId.startsWith("major-star-") &&
      topic.evidenceStatus === "source-reviewed",
  ).length;
  const sourceReviewedTransformations = transformationDossiers.reduce(
    (count, dossier) =>
      dossier.witnessVerificationStatus === "source-reviewed"
        ? count + (dossier.subtopics?.length ?? 0)
        : count,
    0,
  );

  write("topic-coverage-report.v0.2.json", {
    schemaVersion: "0.2.0",
    totalTopics: topics.length,
    candidateLocatedTopics,
    witnessVerifiedTopics,
    sourceReviewedTopics,
    unresolvedTopics: topics.filter((topic) => topic.evidenceStatus === "unresolved")
      .length,
    canonicalTopicContractVersion: data.topics.ontologyTopicContractVersion,
  });

  write("source-extraction-report.v0.2.json", {
    schemaVersion: "0.2.0",
    totalExtractions: extractions.length,
    candidateLocated: extractions.filter((entry) =>
      entry.verificationFlags.includes("candidate-located"),
    ).length,
    witnessVerified: extractions.filter((entry) =>
      entry.verificationFlags.includes("witness-verified"),
    ).length,
    sourceReviewed: extractions.filter((entry) =>
      entry.verificationFlags.includes("source-reviewed"),
    ).length,
    sourceIds: unique(extractions.map((entry) => entry.sourceId)),
  });

  const extractedSources = new Set(extractions.map((entry) => entry.sourceId));
  const traceableRules = rules.filter(
    (rule) =>
      Array.isArray(rule.sourceIds) &&
      rule.sourceIds.length > 0 &&
      rule.sourceIds.every((sourceId: string) => extractedSources.has(sourceId)),
  ).length;
  const traceabilityRate = rules.length === 0 ? 0 : traceableRules / rules.length;
  write("candidate-rule-report.v0.2.json", {
    schemaVersion: "0.2.0",
    totalRules: rules.length,
    traceableRules,
    traceabilityRate,
    effectiveRules: 0,
    catalogEffective: data.rules.effective,
    note: "Candidate rules are research records only and are never loaded as effective ontology knowledge.",
  });

  const maturity = countFixtureMaturity(fixtures);
  const status = countFixtureStatuses(
    fixtures,
    promotionContext(loaded.ontology),
  );
  write("fixture-readiness-report.v0.2.json", {
    schemaVersion: "0.2.0",
    materializedFixtures: fixtures.fixtures.length,
    ...maturity,
    derivedStatus: status,
    canonicalPlannedTemplateCount: loaded.ontology.fixturePlan.fixtures.length,
    note: "V0.2 materializes only evidence-linked fixtures; planned templates remain canonical in ontology V0.1.",
  });

  write("review-work-queue-report.v0.2.json", {
    schemaVersion: "0.2.0",
    batchCount: batches.length,
    queuedFixtureIds: unique(
      batches.flatMap((batch) => batch.fixtureIds as string[]),
    ),
    requiredReviewerRoles: unique(
      batches.flatMap((batch) => batch.requiredReviewerRoles as string[]),
    ),
  });

  const gates = loaded.ontology.releaseGates.symbolicEvaluatorPhasePromotionGates;
  const approvedMinimum = requiredGateNumber(gates, "approvedExpertFixtureCountMin");
  const researchReadyMinimum = requiredGateNumber(gates, "researchReadyFixtureCountMin");
  const sourceReviewedMajorMinimum = requiredGateNumber(
    gates,
    "sourceReviewedMajorStarCoverageMin",
  );
  const sourceReviewedTransformationMinimum = requiredGateNumber(
    gates,
    "sourceReviewedTransformationCoverageMin",
  );
  const traceabilityMinimum = requiredGateNumber(gates, "ruleTraceabilityRateMin");
  const requiredVoidMechanisms = requiredGateStrings(
    gates,
    "voidMechanismCoverageRequired",
  );
  const requiresVoChinhDieu = requiredGateBoolean(
    gates,
    "voChinhDieuCoverageRequired",
  );

  const blockers: string[] = [];
  if (status.approvedForPromotion < approvedMinimum) {
    blockers.push(
      `approved expert fixtures ${status.approvedForPromotion}/${approvedMinimum}`,
    );
  }
  if (maturity.researchReady < researchReadyMinimum) {
    blockers.push(
      `research-ready fixtures ${maturity.researchReady}/${researchReadyMinimum}`,
    );
  }
  if (sourceReviewedMajorStars < sourceReviewedMajorMinimum) {
    blockers.push(
      `source-reviewed major-star topics ${sourceReviewedMajorStars}/${sourceReviewedMajorMinimum}`,
    );
  }
  if (sourceReviewedTransformations < sourceReviewedTransformationMinimum) {
    blockers.push(
      `source-reviewed transformations ${sourceReviewedTransformations}/${sourceReviewedTransformationMinimum}`,
    );
  }
  if (traceabilityRate < traceabilityMinimum) {
    blockers.push(`rule traceability rate ${traceabilityRate}/${traceabilityMinimum}`);
  }

  const voidTopicByLabel: Record<string, string> = {
    "Tuần": "void-tuan",
    "Triệt": "void-triet",
  };
  for (const mechanism of requiredVoidMechanisms) {
    const topicId = voidTopicByLabel[mechanism];
    const statusValue = topics.find((topic) => topic.topicId === topicId)?.evidenceStatus;
    if (statusValue !== "source-reviewed") {
      blockers.push(`${mechanism} mechanism is not source-reviewed`);
    }
  }
  if (
    requiresVoChinhDieu &&
    topics.find((topic) => topic.topicId === "vo-chinh-dieu")?.evidenceStatus !==
      "source-reviewed"
  ) {
    blockers.push("Vô Chính Diệu mechanism is not source-reviewed");
  }

  write("promotion-gate-snapshot.v0.2.json", {
    schemaVersion: "0.2.0",
    approvedExpertFixtureCount: status.approvedForPromotion,
    researchReadyFixtureCount: maturity.researchReady,
    witnessVerifiedExtractionCount: extractions.filter((entry) =>
      entry.verificationFlags.includes("witness-verified"),
    ).length,
    sourceReviewedTopicCount: sourceReviewedTopics,
    sourceReviewedTransformationCount: sourceReviewedTransformations,
    ruleTraceabilityRate: traceabilityRate,
    symbolicEvaluatorPhaseUnlocked: blockers.length === 0,
    blockers,
    productionRuntimeUnlocked: false,
  });
}
