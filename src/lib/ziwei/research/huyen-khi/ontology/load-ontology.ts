/**
 * Deterministic, fail-closed loader for the Huyền Khí ontology V0.1.
 *
 * Reads every manifest-declared file, validates registry WRAPPERS before
 * dereferencing arrays (malformed shapes produce deterministic `schema-invalid`
 * issues — never a TypeError), schema-validates the record collections, deep
 * freezes the result and returns a structured report. Invalid knowledge fails
 * closed — no file or record is silently skipped. It NEVER loads the
 * `example-rules.NON-EFFECTIVE` catalog as knowledge.
 *
 * V0.1 loads NO effective rules (no evaluator, no scorer).
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  NON_EFFECTIVE_EXAMPLE_FILE,
  ONTOLOGY_DIR,
  ONTOLOGY_FILES,
  ONTOLOGY_SCHEMAS_DIR,
} from "./paths";
import { validateAgainstSchema, type JsonSchema } from "./schema-validator";
import type {
  HuyenKhiClaimProvenancePolicy,
  HuyenKhiClaimRegistry,
  HuyenKhiDimensionOperationCompatibility,
  HuyenKhiExpertFixturePlan,
  HuyenKhiExpertReviewWorkflow,
  HuyenKhiFixtureMaturityPolicy,
  HuyenKhiLoadResult,
  HuyenKhiOntology,
  HuyenKhiOntologyManifest,
  HuyenKhiReleaseGates,
  HuyenKhiResearchTopicCoverage,
  HuyenKhiRuleConflictPolicy,
  HuyenKhiSchoolPolicy,
  HuyenKhiSourceExtractionQueue,
  HuyenKhiSourceRegistry,
  HuyenKhiSourceWitnessMatrix,
  HuyenKhiSymbolicDimensions,
  HuyenKhiTerminology,
  HuyenKhiValidationIssue,
} from "./types";

function readJson(
  relPath: string,
): { ok: true; value: unknown } | { ok: false; issue: HuyenKhiValidationIssue } {
  const abs = path.join(ONTOLOGY_DIR, relPath);
  try {
    return { ok: true, value: JSON.parse(readFileSync(abs, "utf-8")) };
  } catch (error) {
    return {
      ok: false,
      issue: {
        severity: "error",
        code: "file-unreadable",
        file: relPath,
        path: "$",
        message: `cannot read/parse: ${(error as Error).message}`,
      },
    };
  }
}

function readSchema(name: string): JsonSchema {
  return JSON.parse(
    readFileSync(path.join(ONTOLOGY_SCHEMAS_DIR, name), "utf-8"),
  ) as JsonSchema;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Fail-closed wrapper check: object wrapper with an array collection. */
function requireCollection(
  raw: Record<string, unknown>,
  role: keyof typeof ONTOLOGY_FILES,
  collectionKey: string,
  issues: HuyenKhiValidationIssue[],
): boolean {
  const file = ONTOLOGY_FILES[role];
  const wrapper = raw[role];
  if (!isPlainObject(wrapper)) {
    issues.push({ severity: "error", code: "schema-invalid", file, path: "$", message: `top-level must be an object` });
    return false;
  }
  if (!Array.isArray((wrapper as Record<string, unknown>)[collectionKey])) {
    issues.push({ severity: "error", code: "schema-invalid", file, path: `$.${collectionKey}`, message: `'${collectionKey}' must be an array` });
    return false;
  }
  return true;
}

/** Recursively freeze — asserts immutability of loaded knowledge. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

let cached: HuyenKhiLoadResult | null = null;

export function loadHuyenKhiOntology(): HuyenKhiLoadResult {
  if (cached) return cached;
  cached = buildOntology();
  return cached;
}

export function resetHuyenKhiOntologyCache(): void {
  cached = null;
}

function buildOntology(): HuyenKhiLoadResult {
  const issues: HuyenKhiValidationIssue[] = [];
  const raw: Record<string, unknown> = {};

  for (const [role, relPath] of Object.entries(ONTOLOGY_FILES)) {
    const result = readJson(relPath);
    if (!result.ok) {
      issues.push(result.issue);
      continue;
    }
    raw[role] = result.value;
  }
  if (issues.length > 0) return { ok: false, issues };

  // Fail-closed wrapper validation BEFORE any array dereference (A5).
  const wrappersOk =
    requireCollection(raw as Record<string, unknown>, "sourceRegistry", "sources", issues) &&
    requireCollection(raw as Record<string, unknown>, "claimRegistry", "claims", issues) &&
    requireCollection(raw as Record<string, unknown>, "fixturePlan", "fixtures", issues) &&
    requireCollection(raw as Record<string, unknown>, "researchTopicCoverage", "topics", issues) &&
    requireCollection(raw as Record<string, unknown>, "sourceWitnessMatrix", "witnesses", issues);
  if (!wrappersOk) return { ok: false, issues };

  // Per-record schema validation.
  const sourceSchema = readSchema("source.schema.v0.1.json");
  const claimSchema = readSchema("claim.schema.v0.1.json");
  const fixtureSchema = readSchema("expert-fixture.schema.v0.1.json");

  const sourceRegistry = raw.sourceRegistry as HuyenKhiSourceRegistry;
  sourceRegistry.sources.forEach((source, index) => {
    for (const v of validateAgainstSchema(source, sourceSchema, `$.sources[${index}]`)) {
      issues.push({ severity: "error", code: "schema-invalid", file: ONTOLOGY_FILES.sourceRegistry, path: v.path, message: v.message });
    }
  });

  const claimRegistry = raw.claimRegistry as HuyenKhiClaimRegistry;
  claimRegistry.claims.forEach((claim, index) => {
    for (const v of validateAgainstSchema(claim, claimSchema, `$.claims[${index}]`)) {
      issues.push({ severity: "error", code: "schema-invalid", file: ONTOLOGY_FILES.claimRegistry, path: v.path, message: v.message });
    }
  });

  const fixturePlan = raw.fixturePlan as HuyenKhiExpertFixturePlan;
  fixturePlan.fixtures.forEach((fixture, index) => {
    for (const v of validateAgainstSchema(fixture, fixtureSchema, `$.fixtures[${index}]`)) {
      issues.push({ severity: "error", code: "schema-invalid", file: ONTOLOGY_FILES.fixturePlan, path: v.path, message: v.message });
    }
  });

  if (issues.length > 0) return { ok: false, issues };

  const ontology: HuyenKhiOntology = {
    manifest: raw.manifest as HuyenKhiOntologyManifest,
    sourceRegistry,
    claimRegistry,
    terminology: raw.terminology as HuyenKhiTerminology,
    symbolicDimensions: raw.symbolicDimensions as HuyenKhiSymbolicDimensions,
    dimensionOperationCompatibility: raw.dimensionOperationCompatibility as HuyenKhiDimensionOperationCompatibility,
    claimProvenancePolicy: raw.claimProvenancePolicy as HuyenKhiClaimProvenancePolicy,
    sourceWitnessMatrix: raw.sourceWitnessMatrix as HuyenKhiSourceWitnessMatrix,
    fixtureMaturityPolicy: raw.fixtureMaturityPolicy as HuyenKhiFixtureMaturityPolicy,
    researchTopicCoverage: raw.researchTopicCoverage as HuyenKhiResearchTopicCoverage,
    schoolPolicy: raw.schoolPolicy as HuyenKhiSchoolPolicy,
    ruleConflictPolicy: raw.ruleConflictPolicy as HuyenKhiRuleConflictPolicy,
    sourceExtractionQueue: raw.sourceExtractionQueue as HuyenKhiSourceExtractionQueue,
    expertReviewWorkflow: raw.expertReviewWorkflow as HuyenKhiExpertReviewWorkflow,
    releaseGates: raw.releaseGates as HuyenKhiReleaseGates,
    fixturePlan,
    // V0.1 has NO effective rules — no evaluator, no scorer.
    rules: [],
  };

  return { ok: true, ontology: deepFreeze(ontology) };
}

export { NON_EFFECTIVE_EXAMPLE_FILE };
