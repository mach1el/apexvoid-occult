import fs from "node:fs";
import path from "node:path";

const tsDir = path.resolve(process.cwd(), "src/lib/ziwei/research/huyen-khi/rule-seed-v0-2");

const writeTs = (file: string, content: string) => {
  fs.writeFileSync(path.join(tsDir, file), content.trim() + "\n");
};

writeTs("types.ts", `
export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
`);

writeTs("validate-topic-coverage.ts", `
import type { ValidationResult, ValidationIssue } from "./types";

export function validateTopicCoverage(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const topics = data.topics || [];
  
  if (!Array.isArray(topics)) {
    return { valid: false, issues: [{ code: "TOPIC_ARRAY", path: "topics", message: "topics must be an array", severity: "error" }] };
  }
  
  if (topics.length !== 28) {
    issues.push({ code: "TOPIC_COUNT", path: "topics", message: \`Expected 28 topics, found \${topics.length}\`, severity: "error" });
  }

  const ids = new Set();
  topics.forEach((t: any, i: number) => {
    if (!t.topicId) issues.push({ code: "TOPIC_MISSING_ID", path: \`topics[\${i}]\`, message: "Topic missing topicId", severity: "error" });
    else if (ids.has(t.topicId)) issues.push({ code: "TOPIC_DUPLICATE_ID", path: \`topics[\${i}]\`, message: \`Duplicate topicId \${t.topicId}\`, severity: "error" });
    else ids.add(t.topicId);
  });

  return { valid: issues.length === 0, issues };
}
`);

writeTs("validate-extractions.ts", `
import type { ValidationResult, ValidationIssue } from "./types";

export function validateExtractions(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const extractions = data.extractions || [];
  
  const ids = new Set();
  extractions.forEach((e: any, i: number) => {
    if (!e.extractionId) issues.push({ code: "EXT_MISSING_ID", path: \`extractions[\${i}]\`, message: "Missing extractionId", severity: "error" });
    else if (ids.has(e.extractionId)) issues.push({ code: "EXT_DUPLICATE_ID", path: \`extractions[\${i}]\`, message: "Duplicate extractionId", severity: "error" });
    else ids.add(e.extractionId);
    
    if (!e.locator) issues.push({ code: "EXT_MISSING_LOCATOR", path: \`extractions[\${i}]\`, message: "Missing locator", severity: "error" });
  });

  return { valid: issues.length === 0, issues };
}
`);

writeTs("validate-candidate-rules.ts", `
import type { ValidationResult, ValidationIssue } from "./types";

export function validateCandidateRules(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rules = data.rules || [];
  
  const ids = new Set();
  rules.forEach((r: any, i: number) => {
    if (r.effective !== false) issues.push({ code: "RULE_MUST_BE_NON_EFFECTIVE", path: \`rules[\${i}]\`, message: "effective must be false", severity: "error" });
    
    if (!r.ruleId) issues.push({ code: "RULE_MISSING_ID", path: \`rules[\${i}]\`, message: "Missing ruleId", severity: "error" });
    else if (ids.has(r.ruleId)) issues.push({ code: "RULE_DUPLICATE_ID", path: \`rules[\${i}]\`, message: "Duplicate ruleId", severity: "error" });
    else ids.add(r.ruleId);
    
    if (!r.effects || r.effects.length === 0) {
      issues.push({ code: "RULE_NO_EFFECTS", path: \`rules[\${i}]\`, message: "Rule must have effects", severity: "error" });
    }
  });

  return { valid: issues.length === 0, issues };
}
`);

writeTs("validate-fixture-materialization.ts", `
import type { ValidationResult, ValidationIssue } from "./types";

export function validateFixtureMaterialization(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fixtures = data.fixtures || [];
  
  fixtures.forEach((f: any, i: number) => {
    if (!f.fixtureId) issues.push({ code: "FIX_MISSING_ID", path: \`fixtures[\${i}]\`, message: "Missing fixtureId", severity: "error" });
    else if (f.fixtureId.startsWith("FIX-")) issues.push({ code: "FIX_INVALID_ID", path: \`fixtures[\${i}]\`, message: "Cannot use FIX-* ids. Use HK-FIX-*", severity: "error" });
    
    if (f.approved !== undefined || f.reviewed !== undefined || f.researchReady === true || f.researchReady === false) {
      issues.push({ code: "FIX_DERIVED_STATUS", path: \`fixtures[\${i}]\`, message: "Cannot contain derived status booleans", severity: "error" });
    }
    
    if (f.inputFacts?.minimalFactSet?.includes("fact1")) {
      issues.push({ code: "FIX_PLACEHOLDER_FACT", path: \`fixtures[\${i}]\`, message: "Contains placeholder fact1", severity: "error" });
    }
    
    if (f.researchQuestion === "Test") {
      issues.push({ code: "FIX_PLACEHOLDER_QUESTION", path: \`fixtures[\${i}]\`, message: "Contains placeholder Test", severity: "error" });
    }
  });

  return { valid: issues.length === 0, issues };
}
`);

writeTs("generate-reports.ts", `
import fs from "node:fs";
import path from "node:path";
import { REPORTS_DIR } from "./paths";

export function generateReports(data: any) {
  const write = (file: string, content: any) => fs.writeFileSync(path.join(REPORTS_DIR, file), JSON.stringify(content, null, 2) + "\\n");
  
  write("topic-coverage-report.v0.2.json", {
    totalTopics: data.topics.length,
    resolvedTopics: data.topics.filter((t: any) => t.sourceIds?.length > 0).length,
    unresolvedTopics: data.topics.filter((t: any) => !t.sourceIds?.length).length
  });
  
  write("source-extraction-report.v0.2.json", {
    candidateLocated: data.extractions.length,
    witnessVerified: 0,
    sourceReviewed: 0
  });
  
  write("candidate-rule-report.v0.2.json", {
    totalRules: data.rules.length,
    effectiveRules: data.rules.filter((r: any) => r.effective).length
  });
  
  const researchReady = data.fixtures.filter((f: any) => f.maturity === "research-ready").length;
  write("fixture-readiness-report.v0.2.json", {
    planned: data.fixtures.filter((f: any) => f.maturity === "planned").length,
    researchReady,
    reviewable: data.fixtures.filter((f: any) => f.maturity === "reviewable").length
  });
  
  write("review-work-queue-report.v0.2.json", {
    batches: data.batches.length
  });
  
  write("promotion-gate-snapshot.v0.2.json", {
    approvedExpertFixtureCount: 0,
    symbolicEvaluatorPhaseUnlocked: false
  });
}
`);

writeTs("cli/validate-rule-seed.ts", `
import { loadRuleSeed } from "../load-rule-seed";
import { validateTopicCoverage } from "../validate-topic-coverage";
import { validateExtractions } from "../validate-extractions";
import { validateCandidateRules } from "../validate-candidate-rules";
import { validateFixtureMaterialization } from "../validate-fixture-materialization";

function run() {
  const data = loadRuleSeed();
  
  const results = [
    validateTopicCoverage(data),
    validateExtractions(data),
    validateCandidateRules(data),
    validateFixtureMaterialization(data)
  ];
  
  let hasErrors = false;
  results.forEach(r => {
    if (!r.valid) {
      hasErrors = true;
      r.issues.forEach(i => console.error(\`[\${i.code}] \${i.path}: \${i.message}\`));
    }
  });
  
  if (hasErrors) {
    console.error("Validation failed.");
    process.exit(1);
  } else {
    console.log("Validation passed");
    process.exit(0);
  }
}
run();
`);

writeTs("cli/export-review-workbook.ts", `
import fs from "node:fs";
import path from "node:path";
import { RULE_SEED_DIR } from "../paths";
import { loadRuleSeed } from "../load-rule-seed";
import { validateFixtureMaterialization } from "../validate-fixture-materialization";

function run() {
  const data = loadRuleSeed();
  if (!validateFixtureMaterialization(data).valid) {
    console.error("Cannot export workbook: validation failed.");
    process.exit(1);
  }
  
  let content = "# Huyền Khí Expert Review Workbook\\n\\n";
  
  data.batches.forEach((b: any) => {
    content += \`## Batch: \${b.name} (\${b.batchId})\\n\\n\`;
    b.fixtureIds.forEach((fid: string) => {
       const fixture = data.fixtures.find((f: any) => f.fixtureId === fid);
       content += \`### Fixture: \${fid}\\n\`;
       content += \`- Maturity: \${fixture?.maturity || "unknown"}\\n\`;
       content += \`- Rationale: \${fixture?.rationale || ""}\\n\\n\`;
    });
  });
  
  fs.writeFileSync(path.join(RULE_SEED_DIR, "reviewer-workbook.md"), content);
  console.log("Workbook exported");
}
run();
`);

console.log("Validators regenerated.");
