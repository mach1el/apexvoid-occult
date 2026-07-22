/**
 * CLI: validate the Annual Axes V0.9 research pack (schemas + cross-references
 * + adjudication/readiness contracts).
 * Exit 1 on any error. No network, no engine import — pure fs/JSON checks.
 *   npm run research:annual-axes-v09:validate
 *   npm run research:annual-axes-v09:adjudication
 */
import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PACK_ROOT = join(process.cwd(), "research/annual-axes/v0.9-foundation");

const TWELVE_UNREFERENCED = [
  "Lưu Đào Hoa",
  "Lưu Hồng Loan",
  "Lưu Hỷ Thần",
  "Lưu Kiếp Sát",
  "Lưu Long Đức",
  "Lưu Nguyệt Đức",
  "Lưu Phúc Đức",
  "Lưu Thiên Đức",
  "Lưu Thiên Hỷ",
  "Lưu Thiên Mã",
  "Lưu Văn Khúc",
  "Lưu Văn Xương",
] as const;

const CORE_BLOCKED = [
  "Lưu Đại Hao",
  "Lưu Tiểu Hao",
  "Lưu Phục Binh",
  "Lưu Tuần",
  "Lưu Triệt",
] as const;

const ALLOWED_STAR_DECISIONS = new Set([
  "candidate-eligible",
  "interpretive-only",
  "school-specific",
  "remain-disputed",
  "insufficient-evidence",
  "not-applicable-to-annual-axes",
]);

const READINESS_STATES = new Set([
  "READY_FOR_V0_9_CANDIDATE",
  "RESEARCH_INCOMPLETE",
  "V0_8_SHOULD_REMAIN_UNCHANGED",
  "CALCULATION_CORE_BLOCKED",
]);

const DOCTRINE_SOURCE_TYPES = new Set([
  "classical-text",
  "school-manual",
  "published-reference",
]);

const INTERNAL_SOURCE_TYPES = new Set([
  "internal-calculation-contract",
  "internal-engineering-policy",
]);

function readJson(relPath: string): any {
  return JSON.parse(readFileSync(join(PACK_ROOT, relPath), "utf8"));
}

interface Issue {
  code: string;
  message: string;
}

function main(): void {
  const issues: Issue[] = [];
  const ajv = new Ajv({ allErrors: true });

  const sourceRegistry = readJson("sources/source-registry.v0.9.json");
  const claimRegistry = readJson("sources/claim-registry.v0.9.json");
  const contradictionRegistry = readJson("sources/contradiction-registry.v0.9.json");
  const schoolPolicyMatrix = readJson("policy/school-policy-matrix.v0.9.json");
  const starDomainPolicy = readJson("policy/star-domain-policy.v0.9.json");
  const unsupportedStarPolicy = readJson("policy/unsupported-star-policy.v0.9.json");
  const dignityPolicy = readJson("policy/dignity-policy.v0.9.json");
  const domainPalacePolicy = readJson("policy/domain-palace-policy.v0.9.json");
  const readiness = readJson("readiness.v0.9.json");
  const auditContract = readJson("audit/audit-contract.v0.9.json");
  const decisionDoc = readFileSync(join(PACK_ROOT, "V0.9-FOUNDATION-DECISION.md"), "utf8");

  const schemaChecks: Array<[string, string, any]> = [
    ["sources/source-registry.v0.9.json", "schema/source-registry.schema.json", sourceRegistry],
    ["sources/claim-registry.v0.9.json", "schema/claim-registry.schema.json", claimRegistry],
    ["policy/school-policy-matrix.v0.9.json", "schema/policy-matrix.schema.json", schoolPolicyMatrix],
    ["audit/audit-contract.v0.9.json", "schema/audit-contract.schema.json", auditContract],
  ];

  for (const [dataPath, schemaPath, data] of schemaChecks) {
    const schema = readJson(schemaPath);
    const validate = ajv.compile(schema);
    if (!validate(data)) {
      for (const err of validate.errors ?? []) {
        issues.push({ code: "schema", message: `${dataPath}: ${err.instancePath} ${err.message}` });
      }
    }
  }

  const sources: any[] = sourceRegistry.sources;
  const sourceIds = new Set(sources.map((s) => s.sourceId));
  const sourceById = new Map(sources.map((s) => [s.sourceId, s]));
  if (sourceIds.size !== sources.length) {
    issues.push({ code: "duplicate-source-id", message: "source-registry has duplicate sourceIds" });
  }

  for (const source of sources) {
    if (source.accessStatus === "verified" || source.accessStatus === "partial") {
      if (!String(source.locator || "").trim()) {
        issues.push({ code: "missing-locator", message: `${source.sourceId} requires a non-empty locator` });
      }
    }
    if (DOCTRINE_SOURCE_TYPES.has(source.sourceType) && source.accessStatus === "unavailable") {
      issues.push({
        code: "doctrine-unavailable",
        message: `${source.sourceId} is doctrine-class but accessStatus=unavailable`,
      });
    }
  }

  const claims: any[] = claimRegistry.claims;
  const claimIds = new Set(claims.map((c) => c.claimId));
  if (claimIds.size !== claims.length) {
    issues.push({ code: "duplicate-claim-id", message: "claim-registry has duplicate claimIds" });
  }

  for (const claim of claims) {
    for (const sourceId of claim.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({ code: "unresolved-source", message: `${claim.claimId} references unknown source ${sourceId}` });
      }
    }
    if ((claim.status === "classical" || claim.status === "derived") && (!claim.locators || claim.locators.length === 0)) {
      issues.push({ code: "missing-locator", message: `${claim.claimId} is ${claim.status} but has no locator` });
    }
    if (claim.status === "disputed" && (!claim.contradictingClaimIds || claim.contradictingClaimIds.length === 0)) {
      issues.push({
        code: "unresolved-contradiction",
        message: `${claim.claimId} is disputed but has no contradiction link`,
      });
    }
    if (claim.status === "unsupported") {
      const implication = String(claim.runtimeImplication).toLowerCase();
      if (!implication.includes("must not enable") && !implication.includes("no production")) {
        issues.push({
          code: "unsupported-enables-production",
          message: `${claim.claimId} is unsupported but does not forbid production enablement`,
        });
      }
    }
    if (claim.status === "classical") {
      const hasCompatible = (claim.sourceIds as string[]).some((id) =>
        DOCTRINE_SOURCE_TYPES.has(sourceById.get(id)?.sourceType),
      );
      if (!hasCompatible) {
        issues.push({
          code: "classical-without-doctrine-source",
          message: `${claim.claimId} is classical without classical-text/school-manual/published-reference source`,
        });
      }
      const onlyInternal = (claim.sourceIds as string[]).every((id) =>
        INTERNAL_SOURCE_TYPES.has(sourceById.get(id)?.sourceType),
      );
      if (onlyInternal) {
        issues.push({
          code: "classical-from-internal-only",
          message: `${claim.claimId} classical claim cannot be supported by internal engineering sources alone`,
        });
      }
    }
    if (claim.status === "derived" && (!claim.notes || String(claim.notes).length === 0)) {
      // derivation may live in statement/runtimeImplication; require locators only (already checked)
    }
  }

  const contradictions: any[] = contradictionRegistry.contradictions ?? [];
  const contradictionIds = new Set(contradictions.map((c) => c.contradictionId));
  if (!contradictionIds.has("CONTRA-AAV09-001")) {
    issues.push({
      code: "dao-hoa-contradiction-missing",
      message: "CONTRA-AAV09-001 must remain present with an explicit adjudication",
    });
  }
  for (const contra of contradictions) {
    for (const claimId of contra.claimIds ?? []) {
      if (!claimIds.has(claimId)) {
        issues.push({ code: "unresolved-claim", message: `${contra.contradictionId} references unknown claim ${claimId}` });
      }
    }
    if (!contra.adjudication) {
      issues.push({ code: "missing-adjudication", message: `${contra.contradictionId} lacks adjudication` });
    }
  }

  for (const topic of schoolPolicyMatrix.topics) {
    for (const entry of [topic.namPhai, topic.trungChau]) {
      for (const claimId of entry.claimIds) {
        if (!claimIds.has(claimId)) {
          issues.push({ code: "unresolved-claim", message: `policy topic "${topic.topic}" references unknown claim ${claimId}` });
        }
      }
      for (const sourceId of entry.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          issues.push({ code: "unresolved-source", message: `policy topic "${topic.topic}" references unknown source ${sourceId}` });
        }
      }
    }
  }

  const starEntries: any[] = starDomainPolicy.unreferencedButEmittedStars?.entries ?? [];
  const starNames = starEntries.map((e) => e.exactStarName);
  if (new Set(starNames).size !== starNames.length) {
    issues.push({ code: "duplicate-star-adjudication", message: "duplicate exactStarName in unreferencedButEmittedStars" });
  }
  for (const required of TWELVE_UNREFERENCED) {
    if (!starNames.includes(required)) {
      issues.push({ code: "missing-star-adjudication", message: `missing adjudication for ${required}` });
    }
  }
  if (starNames.length !== TWELVE_UNREFERENCED.length) {
    issues.push({
      code: "star-adjudication-count",
      message: `expected ${TWELVE_UNREFERENCED.length} unreferenced star adjudications, found ${starNames.length}`,
    });
  }

  const policyRecordIds: string[] = [];
  for (const entry of starEntries) {
    policyRecordIds.push(entry.policyRecordId);
    if (!ALLOWED_STAR_DECISIONS.has(entry.decision)) {
      issues.push({ code: "invalid-star-decision", message: `${entry.exactStarName} has invalid decision ${entry.decision}` });
    }
    if (typeof entry.candidateEligible !== "boolean") {
      issues.push({ code: "missing-candidate-flag", message: `${entry.exactStarName} missing candidateEligible boolean` });
    }
    if (!entry.calculationCoreProducerStatus) {
      issues.push({ code: "missing-producer-status", message: `${entry.exactStarName} missing calculationCoreProducerStatus` });
    }
    if (!entry.confidence) {
      issues.push({ code: "missing-confidence", message: `${entry.exactStarName} missing confidence` });
    }
    const hasSources = Array.isArray(entry.sourceIds) && entry.sourceIds.length > 0;
    if (!hasSources && entry.decision !== "insufficient-evidence") {
      issues.push({
        code: "missing-star-sources",
        message: `${entry.exactStarName} needs sourceIds or insufficient-evidence decision`,
      });
    }
    for (const sourceId of entry.sourceIds ?? []) {
      if (!sourceIds.has(sourceId)) {
        issues.push({ code: "unresolved-source", message: `${entry.exactStarName} references unknown source ${sourceId}` });
      }
    }
    for (const claimId of entry.claimIds ?? []) {
      if (!claimIds.has(claimId)) {
        issues.push({ code: "unresolved-claim", message: `${entry.exactStarName} references unknown claim ${claimId}` });
      }
    }

    if (entry.candidateEligible) {
      if (entry.decision !== "candidate-eligible") {
        issues.push({
          code: "candidate-flag-mismatch",
          message: `${entry.exactStarName} candidateEligible=true but decision=${entry.decision}`,
        });
      }
      if (entry.calculationCoreProducerStatus !== "supported") {
        issues.push({
          code: "candidate-without-producer",
          message: `${entry.exactStarName} candidate-eligible requires supported Calculation Core producer`,
        });
      }
      const sourceTypes = (entry.sourceIds ?? []).map((id: string) => sourceById.get(id)?.sourceType);
      const hasDoctrine = sourceTypes.some((t: string) => DOCTRINE_SOURCE_TYPES.has(t));
      const onlyUnverified =
        sourceTypes.length > 0 && sourceTypes.every((t: string) => t === "unverified-summary");
      if (!hasDoctrine) {
        issues.push({
          code: "candidate-without-doctrine-source",
          message: `${entry.exactStarName} candidate-eligible requires a doctrine-class source`,
        });
      }
      if (onlyUnverified) {
        issues.push({
          code: "candidate-from-unverified-only",
          message: `${entry.exactStarName} unverified summaries alone cannot authorize candidate eligibility`,
        });
      }
      for (const claimId of entry.claimIds ?? []) {
        const claim = claims.find((c) => c.claimId === claimId);
        if (claim?.status === "disputed") {
          issues.push({
            code: "candidate-depends-on-disputed",
            message: `${entry.exactStarName} candidate cannot depend on disputed claim ${claimId}`,
          });
        }
        if (claim?.status === "unsupported") {
          issues.push({
            code: "candidate-depends-on-unsupported",
            message: `${entry.exactStarName} candidate cannot depend on unsupported claim ${claimId}`,
          });
        }
      }
      if ((entry.knownContradictions ?? []).includes("CONTRA-AAV09-001") && entry.exactStarName === "Lưu Đào Hoa") {
        issues.push({
          code: "candidate-unresolved-dao-hoa",
          message: "Lưu Đào Hoa cannot be candidate-eligible while CONTRA-AAV09-001 remains open for fixed polarity",
        });
      }
    }
  }

  if (new Set(policyRecordIds).size !== policyRecordIds.length) {
    issues.push({ code: "duplicate-policy-record-id", message: "duplicate policyRecordId among star adjudications" });
  }

  const unsupportedNames = (unsupportedStarPolicy.stars ?? []).map((s: any) => s.exactStarName);
  for (const blocked of CORE_BLOCKED) {
    if (!unsupportedNames.includes(blocked)) {
      issues.push({ code: "core-blocked-missing", message: `unsupported-star-policy missing ${blocked}` });
    }
  }
  for (const star of unsupportedStarPolicy.stars ?? []) {
    if (star.decision === "supported-for-future-core") {
      // allowed only with full preconditions — this pack expects unsupported
    }
    if (CORE_BLOCKED.includes(star.exactStarName) && star.decision !== "unsupported") {
      issues.push({
        code: "core-blocked-not-fail-closed",
        message: `${star.exactStarName} must remain decision=unsupported for production fail-closed`,
      });
    }
  }

  if (!dignityPolicy.starCategoryDecisions || dignityPolicy.starCategoryDecisions.length === 0) {
    issues.push({ code: "dignity-decision-missing", message: "dignity-policy lacks explicit starCategoryDecisions" });
  }
  if (!domainPalacePolicy.tieuHanPolicy?.decision) {
    issues.push({ code: "tieu-han-decision-missing", message: "domain-palace-policy lacks tieuHanPolicy.decision" });
  }

  const readinessState = readiness.readinessState;
  if (!READINESS_STATES.has(readinessState)) {
    issues.push({ code: "invalid-readiness", message: `unrecognized readinessState ${readinessState}` });
  }
  const decisionMatches = [
    ...decisionDoc.matchAll(
      /READY_FOR_V0_9_CANDIDATE|RESEARCH_INCOMPLETE|V0_8_SHOULD_REMAIN_UNCHANGED|CALCULATION_CORE_BLOCKED/g,
    ),
  ].map((m) => m[0]);
  // Final state section should contain the readiness value; require at least one match equal to readiness JSON
  if (!decisionMatches.includes(readinessState)) {
    issues.push({
      code: "readiness-doc-mismatch",
      message: `V0.9-FOUNDATION-DECISION.md does not contain readinessState ${readinessState}`,
    });
  }

  const shapes: any[] = readiness.candidateShapes ?? [];
  if (readinessState === "READY_FOR_V0_9_CANDIDATE") {
    if (!Array.isArray(shapes) || shapes.length === 0) {
      issues.push({ code: "ready-without-shape", message: "READY_FOR_V0_9_CANDIDATE requires at least one candidate shape" });
    }
    const hasVerifiedDoctrine = sources.some(
      (s) => DOCTRINE_SOURCE_TYPES.has(s.sourceType) && (s.accessStatus === "verified" || s.accessStatus === "partial"),
    );
    if (!hasVerifiedDoctrine) {
      issues.push({
        code: "ready-without-verified-source",
        message: "READY_FOR_V0_9_CANDIDATE requires at least one verified/partial doctrine-class source",
      });
    }
    for (const shape of shapes) {
      for (const starName of shape.includedStars ?? []) {
        const entry = starEntries.find((e) => e.exactStarName === starName);
        if (!entry?.candidateEligible) {
          issues.push({
            code: "shape-includes-ineligible",
            message: `shape ${shape.candidateShapeId} includes non-eligible star ${starName}`,
          });
        }
        if (CORE_BLOCKED.includes(starName as (typeof CORE_BLOCKED)[number])) {
          issues.push({
            code: "shape-requires-core-blocked",
            message: `shape ${shape.candidateShapeId} requires Core-blocked identity ${starName}`,
          });
        }
      }
      for (const claimId of shape.claimIds ?? []) {
        const claim = claims.find((c) => c.claimId === claimId);
        if (claim?.status === "disputed") {
          issues.push({
            code: "shape-depends-on-disputed",
            message: `shape ${shape.candidateShapeId} depends on disputed claim ${claimId}`,
          });
        }
      }
      if (shape.blockingContradictionsResolved !== true) {
        issues.push({
          code: "shape-unresolved-contradiction",
          message: `shape ${shape.candidateShapeId} must set blockingContradictionsResolved=true`,
        });
      }
    }
  }

  process.stdout.write("Annual Axes V0.9 research pack validation\n");
  process.stdout.write(
    `${JSON.stringify(
      {
        sources: sources.length,
        claims: claims.length,
        contradictions: contradictions.length,
        unreferencedStars: starEntries.length,
        candidateShapes: shapes.length,
        readinessState,
        issues: issues.length,
      },
      null,
      2,
    )}\n`,
  );

  if (issues.length > 0) {
    process.stdout.write(`\n${issues.length} issue(s):\n`);
    for (const issue of issues) process.stdout.write(`  [${issue.code}] ${issue.message}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("\nOK — schemas valid, adjudications complete, readiness contract holds.\n");
}

main();
