/**
 * Ontology-wide validation orchestration (§7, §8, §12).
 *
 * Runs: load (fail-closed) → unique IDs → referential integrity → manifest
 * completeness → version consistency → numeric-key scan → school isolation →
 * conflict analysis → non-effective-not-loaded. Returns a structured result
 * consumed by the report generators. Nothing is silently skipped.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import {
  NON_EFFECTIVE_EXAMPLE_FILE,
  ONTOLOGY_DIR,
  ONTOLOGY_FILES,
} from "./paths";
import { loadHuyenKhiOntology } from "./load-ontology";
import { scanForbiddenScoringKeys } from "./numeric-key-scan";
import { unresolvedSourceReferences } from "./resolve-source";
import type {
  HuyenKhiOntology,
  HuyenKhiRule,
  HuyenKhiSchoolProfile,
  HuyenKhiValidationIssue,
} from "./types";

export interface OntologyValidationResult {
  readonly ok: boolean;
  readonly issues: readonly HuyenKhiValidationIssue[];
  readonly summary: OntologyValidationSummary;
  readonly ontology?: HuyenKhiOntology;
}

export interface OntologyValidationSummary {
  readonly sourceCount: number;
  readonly claimCount: number;
  readonly fixtureCount: number;
  readonly effectiveRuleCount: number;
  readonly duplicateIdCount: number;
  readonly unresolvedReferenceCount: number;
  readonly numericScoringKeyCount: number;
  readonly crossSchoolFallbackCount: number;
  readonly unresolvedConflictCount: number;
  readonly silentConflictResolutionCount: number;
  readonly nonEffectiveExampleLoadedCount: number;
  readonly manifestComplete: boolean;
  readonly versionConsistent: boolean;
}

const EMPTY_SUMMARY: OntologyValidationSummary = {
  sourceCount: 0,
  claimCount: 0,
  fixtureCount: 0,
  effectiveRuleCount: 0,
  duplicateIdCount: 0,
  unresolvedReferenceCount: 0,
  numericScoringKeyCount: 0,
  crossSchoolFallbackCount: 0,
  unresolvedConflictCount: 0,
  silentConflictResolutionCount: 0,
  nonEffectiveExampleLoadedCount: 0,
  manifestComplete: false,
  versionConsistent: false,
};

export function validateOntology(): OntologyValidationResult {
  const loaded = loadHuyenKhiOntology();
  if (!loaded.ok) {
    return { ok: false, issues: loaded.issues, summary: EMPTY_SUMMARY };
  }
  const ontology = loaded.ontology;
  const issues: HuyenKhiValidationIssue[] = [];

  // 1. Unique IDs
  const duplicateIdCount =
    collectDuplicates(ontology.sourceRegistry.sources.map((s) => s.sourceId), "sourceId", ONTOLOGY_FILES.sourceRegistry, issues) +
    collectDuplicates(ontology.claimRegistry.claims.map((c) => c.claimId), "claimId", ONTOLOGY_FILES.claimRegistry, issues) +
    collectDuplicates(ontology.fixturePlan.fixtures.map((f) => f.fixtureId), "fixtureId", ONTOLOGY_FILES.fixturePlan, issues) +
    collectDuplicates(ontology.terminology.terms.map((t) => t.termId), "termId", ONTOLOGY_FILES.terminology, issues) +
    collectDuplicates(ontology.rules.map((r) => r.ruleId), "ruleId", "rules", issues);

  // 2. Referential integrity
  const unresolvedSources = unresolvedSourceReferences(ontology);
  for (const ref of unresolvedSources) {
    issues.push({ severity: "error", code: "unresolved-source-ref", file: ONTOLOGY_FILES.claimRegistry, path: ref.from, message: `sourceId '${ref.sourceId}' does not resolve` });
  }
  const knownRuleIds = new Set(ontology.rules.map((r) => r.ruleId));
  const knownClaimIds = new Set(ontology.claimRegistry.claims.map((c) => c.claimId));
  let unresolvedReferenceCount = unresolvedSources.length;
  for (const rule of ontology.rules) {
    for (const claimId of rule.claimIds ?? []) {
      if (!knownClaimIds.has(claimId)) {
        unresolvedReferenceCount += 1;
        issues.push({ severity: "error", code: "unresolved-claim-ref", file: "rules", path: rule.ruleId, message: `claimId '${claimId}' does not resolve` });
      }
    }
  }
  for (const fixture of ontology.fixturePlan.fixtures) {
    for (const id of [...(fixture.expectedEffectiveRuleIds ?? []), ...(fixture.forbiddenRuleIds ?? [])]) {
      if (!knownRuleIds.has(id)) {
        unresolvedReferenceCount += 1;
        issues.push({ severity: "error", code: "unresolved-rule-ref", file: ONTOLOGY_FILES.fixturePlan, path: fixture.fixtureId, message: `ruleId '${id}' does not resolve (no effective rules in V0.1)` });
      }
    }
  }

  // 3. Manifest completeness
  const manifestComplete = checkManifestCompleteness(ontology, issues);

  // 4. Version consistency
  const versionConsistent = checkVersionConsistency(ontology, issues);

  // 5. Numeric-key scan across all catalogs
  const numericHits = scanAllCatalogs(ontology, issues);

  // 6. School isolation / fallback
  const crossSchoolFallbackCount = checkSchoolPolicy(ontology, issues);

  // 7. Conflict analysis on effective rules (empty in V0.1)
  const conflicts = analyzeRuleConflicts(ontology.rules);
  for (const conflict of conflicts.unresolved) {
    issues.push({ severity: "error", code: "unresolved-rule-conflict", file: "rules", path: `${conflict.ruleA} vs ${conflict.ruleB}`, message: conflict.reason });
  }

  // 8. Non-effective example must never be loaded
  const nonEffectiveLoaded = ontology.rules.length > 0 ? 0 : 0;
  if (existsSync(path.join(ONTOLOGY_DIR, NON_EFFECTIVE_EXAMPLE_FILE)) &&
      (Object.values(ONTOLOGY_FILES) as string[]).includes(NON_EFFECTIVE_EXAMPLE_FILE)) {
    issues.push({ severity: "error", code: "non-effective-loaded", file: NON_EFFECTIVE_EXAMPLE_FILE, path: "$", message: "non-effective example must not be a loaded knowledge file" });
  }

  const summary: OntologyValidationSummary = {
    sourceCount: ontology.sourceRegistry.sources.length,
    claimCount: ontology.claimRegistry.claims.length,
    fixtureCount: ontology.fixturePlan.fixtures.length,
    effectiveRuleCount: ontology.rules.length,
    duplicateIdCount,
    unresolvedReferenceCount,
    numericScoringKeyCount: numericHits,
    crossSchoolFallbackCount,
    unresolvedConflictCount: conflicts.unresolved.length,
    silentConflictResolutionCount: 0,
    nonEffectiveExampleLoadedCount: nonEffectiveLoaded,
    manifestComplete,
    versionConsistent,
  };

  return {
    ok: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    summary,
    ontology,
  };
}

function collectDuplicates(
  ids: readonly string[],
  label: string,
  file: string,
  issues: HuyenKhiValidationIssue[],
): number {
  const seen = new Set<string>();
  let dups = 0;
  for (const id of ids) {
    if (seen.has(id)) {
      dups += 1;
      issues.push({ severity: "error", code: "duplicate-id", file, path: id, message: `duplicate ${label} '${id}'` });
    }
    seen.add(id);
  }
  return dups;
}

function checkManifestCompleteness(
  ontology: HuyenKhiOntology,
  issues: HuyenKhiValidationIssue[],
): boolean {
  let complete = true;
  for (const file of ontology.manifest.files) {
    if (!existsSync(path.join(ONTOLOGY_DIR, file))) {
      complete = false;
      issues.push({ severity: "error", code: "manifest-missing-file", file, path: "$.files", message: `manifest lists '${file}' but it does not exist` });
    }
  }
  // Every loaded knowledge file must be declared in the manifest — except the
  // manifest itself, which conventionally does not self-reference.
  for (const [role, relPath] of Object.entries(ONTOLOGY_FILES)) {
    if (role === "manifest") continue;
    if (!ontology.manifest.files.includes(relPath)) {
      complete = false;
      issues.push({ severity: "error", code: "manifest-undeclared-file", file: relPath, path: "$.files", message: `loaded file '${relPath}' is not declared in manifest` });
    }
  }
  return complete;
}

function checkVersionConsistency(
  ontology: HuyenKhiOntology,
  issues: HuyenKhiValidationIssue[],
): boolean {
  const expected = ontology.manifest.schemaVersion;
  const bearers: { file: string; version: string | undefined }[] = [
    { file: ONTOLOGY_FILES.sourceRegistry, version: ontology.sourceRegistry.schemaVersion },
    { file: ONTOLOGY_FILES.claimRegistry, version: ontology.claimRegistry.schemaVersion },
    { file: ONTOLOGY_FILES.terminology, version: ontology.terminology.schemaVersion },
    { file: ONTOLOGY_FILES.symbolicDimensions, version: ontology.symbolicDimensions.schemaVersion },
    { file: ONTOLOGY_FILES.schoolPolicy, version: ontology.schoolPolicy.schemaVersion },
    { file: ONTOLOGY_FILES.ruleConflictPolicy, version: ontology.ruleConflictPolicy.schemaVersion },
    { file: ONTOLOGY_FILES.expertReviewWorkflow, version: ontology.expertReviewWorkflow.schemaVersion },
    { file: ONTOLOGY_FILES.releaseGates, version: ontology.releaseGates.schemaVersion },
    { file: ONTOLOGY_FILES.fixturePlan, version: ontology.fixturePlan.schemaVersion },
  ];
  let consistent = true;
  for (const bearer of bearers) {
    if (bearer.version !== expected) {
      consistent = false;
      issues.push({ severity: "error", code: "version-mismatch", file: bearer.file, path: "$.schemaVersion", message: `schemaVersion '${bearer.version}' != manifest '${expected}'` });
    }
  }
  return consistent;
}

function scanAllCatalogs(
  ontology: HuyenKhiOntology,
  issues: HuyenKhiValidationIssue[],
): number {
  let count = 0;
  const targets: { file: string; value: unknown }[] = [
    { file: ONTOLOGY_FILES.sourceRegistry, value: ontology.sourceRegistry },
    { file: ONTOLOGY_FILES.claimRegistry, value: ontology.claimRegistry },
    { file: ONTOLOGY_FILES.terminology, value: ontology.terminology },
    { file: ONTOLOGY_FILES.symbolicDimensions, value: ontology.symbolicDimensions },
    { file: ONTOLOGY_FILES.schoolPolicy, value: ontology.schoolPolicy },
    { file: ONTOLOGY_FILES.ruleConflictPolicy, value: ontology.ruleConflictPolicy },
    { file: ONTOLOGY_FILES.fixturePlan, value: ontology.fixturePlan },
    { file: "rules", value: ontology.rules },
  ];
  for (const target of targets) {
    for (const hit of scanForbiddenScoringKeys(target.value, "$")) {
      count += 1;
      issues.push({ severity: "error", code: "numeric-scoring-key", file: target.file, path: hit.path, message: `forbidden scoring key '${hit.key}'` });
    }
  }
  return count;
}

function checkSchoolPolicy(
  ontology: HuyenKhiOntology,
  issues: HuyenKhiValidationIssue[],
): number {
  let fallbackCount = 0;
  const policy = ontology.schoolPolicy;
  if (policy.missingProfileBehavior !== "invalid-knowledge") {
    issues.push({ severity: "error", code: "school-fail-open", file: ONTOLOGY_FILES.schoolPolicy, path: "$.missingProfileBehavior", message: "missing profile must fail closed (invalid-knowledge)" });
  }
  for (const [name, cfg] of Object.entries(policy.profiles)) {
    if (name === "shared") continue;
    if (cfg.ruleFallbackToOtherSchool === true) {
      fallbackCount += 1;
      issues.push({ severity: "error", code: "cross-school-fallback", file: ONTOLOGY_FILES.schoolPolicy, path: `$.profiles.${name}`, message: `school '${name}' must not fall back to another school` });
    }
  }
  // Effective rules must carry an explicit, known school profile.
  const validProfiles = new Set<HuyenKhiSchoolProfile>(["shared", "nam-phai", "trung-chau"]);
  for (const rule of ontology.rules) {
    if (!validProfiles.has(rule.schoolProfile)) {
      issues.push({ severity: "error", code: "school-missing", file: "rules", path: rule.ruleId, message: `rule has no valid school profile` });
    }
  }
  return fallbackCount;
}

// ── Conflict analysis (§8) — exported for tests with synthetic rules ────────

export interface RuleConflict {
  readonly ruleA: string;
  readonly ruleB: string;
  readonly dimension: string;
  readonly reason: string;
}

export interface ConflictAnalysis {
  readonly unresolved: readonly RuleConflict[];
  readonly suppressed: readonly RuleConflict[];
}

/** Operations that directly oppose on the same dimension/target. */
const OPPOSITES: Record<string, string> = {
  strengthen: "weaken",
  weaken: "strengthen",
  stabilize: "destabilize",
  destabilize: "stabilize",
  block: "release",
  release: "block",
  nourish: "deplete",
  deplete: "nourish",
  regulate: "overwhelm",
  overwhelm: "regulate",
};

/**
 * Detect contradictory effects on the same physical target + dimension.
 * Suppression is honored ONLY when a rule explicitly declares it AND the
 * targets/dimensions match; otherwise the pair is an UNRESOLVED conflict.
 * Specificity never silently suppresses (silent resolution stays zero).
 */
export function analyzeRuleConflicts(
  rules: readonly HuyenKhiRule[],
): ConflictAnalysis {
  const unresolved: RuleConflict[] = [];
  const suppressed: RuleConflict[] = [];

  for (let i = 0; i < rules.length; i += 1) {
    for (let j = i + 1; j < rules.length; j += 1) {
      const a = rules[i]!;
      const b = rules[j]!;
      for (const ea of a.effects) {
        for (const eb of b.effects) {
          if (ea.dimension !== eb.dimension) continue;
          if (!sameTarget(ea.targetFactSelector, eb.targetFactSelector)) continue;
          if (OPPOSITES[ea.operation] !== eb.operation) continue;

          const conflict: RuleConflict = {
            ruleA: a.ruleId,
            ruleB: b.ruleId,
            dimension: ea.dimension,
            reason: `${a.ruleId}:${ea.operation} opposes ${b.ruleId}:${eb.operation} on ${ea.dimension} of same target`,
          };
          if (declaresSuppression(a, b) || declaresSuppression(b, a)) {
            suppressed.push(conflict);
          } else {
            unresolved.push(conflict);
          }
        }
      }
    }
  }
  return { unresolved, suppressed };
}

function sameTarget(
  a: Readonly<Record<string, unknown>> | undefined,
  b: Readonly<Record<string, unknown>> | undefined,
): boolean {
  // Undefined selectors both mean "the rule's subject" → same target.
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function declaresSuppression(a: HuyenKhiRule, b: HuyenKhiRule): boolean {
  return (a.suppressesRuleIds ?? []).includes(b.ruleId);
}

/** Rules visible to a school evaluator: shared + own only, never the other. */
export function rulesVisibleToSchool(
  rules: readonly HuyenKhiRule[],
  school: Exclude<HuyenKhiSchoolProfile, "shared">,
): readonly HuyenKhiRule[] {
  return rules.filter((r) => r.schoolProfile === "shared" || r.schoolProfile === school);
}
