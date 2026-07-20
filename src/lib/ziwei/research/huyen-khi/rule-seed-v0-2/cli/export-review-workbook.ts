import fs from "node:fs";
import path from "node:path";

import { RULE_SEED_DIR } from "../paths";
import { loadRuleSeed } from "../load-rule-seed";
import { validateCandidateRules } from "../validate-candidate-rules";
import { validateExtractions } from "../validate-extractions";
import { validateFixtureMaterialization } from "../validate-fixture-materialization";
import { validateTopicCoverage } from "../validate-topic-coverage";

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function run() {
  const data = loadRuleSeed();
  const results = [
    validateTopicCoverage(data),
    validateExtractions(data),
    validateCandidateRules(data),
    validateFixtureMaterialization(data),
  ];
  const errors = results.flatMap((result) => result.issues).filter(
    (issue) => issue.severity === "error",
  );
  if (errors.length > 0) {
    errors.forEach((issue) =>
      console.error(`[${issue.code}] ${issue.path}: ${issue.message}`),
    );
    console.error("Cannot export workbook: validation failed.");
    process.exit(1);
  }

  const fixturesById = new Map(
    data.fixtures.fixtures.map((fixture: any) => [fixture.fixtureId, fixture]),
  );
  const extractionsById = new Map(
    data.extractions.extractions.map((entry: any) => [entry.extractionId, entry]),
  );
  const rulesById = new Map(
    data.rules.rules.map((rule: any) => [rule.ruleId, rule]),
  );

  const lines: string[] = [
    "# Huyền Khí Expert Review Workbook V0.2",
    "",
    "> Generated from validated V0.2 data. Candidate evidence is not an approved doctrinal answer and does not authorize evaluation, scoring, or production use.",
    "",
  ];

  for (const batch of data.batches.batches) {
    lines.push(`## ${batch.name} (${batch.batchId})`, "");
    lines.push(`- Topics: ${batch.topicIds.join(", ") || "—"}`);
    lines.push(`- Required roles: ${batch.requiredReviewerRoles.join(", ") || "—"}`);
    lines.push(
      `- Required school profiles: ${batch.requiredSchoolProfiles.join(", ") || "—"}`,
    );
    lines.push("- Open questions:");
    for (const question of batch.openQuestions) lines.push(`  - ${question}`);
    lines.push("");

    for (const fixtureId of batch.fixtureIds) {
      const fixture = fixturesById.get(fixtureId) as any;
      if (!fixture) continue;
      lines.push(`### ${fixture.title} (${fixture.fixtureId})`, "");
      lines.push(`- Category: ${fixture.category}`);
      lines.push(`- School: ${fixture.schoolProfile}`);
      lines.push(`- Maturity: ${fixture.maturity}`);
      lines.push(`- Research question: ${fixture.researchQuestion ?? "—"}`);
      lines.push(`- Candidate sources: ${(fixture.candidateSourceIds ?? []).join(", ") || "—"}`);
      lines.push(`- Candidate rules: ${(batch.candidateRuleIds ?? []).join(", ") || "—"}`);
      lines.push("", "#### Canonical input facts", "", "```json", json(fixture.inputFacts), "```", "");

      lines.push("#### Candidate evidence", "");
      for (const extractionId of batch.extractionIds ?? []) {
        const extraction = extractionsById.get(extractionId) as any;
        if (!extraction) continue;
        lines.push(`**${extraction.extractionId}**`);
        lines.push(`- Source: ${extraction.sourceId}`);
        lines.push(`- Locator: ${extraction.locator.volume ?? ""} · ${extraction.locator.section ?? ""}`);
        lines.push(`- Verification: ${extraction.verificationFlags.join(", ")}`);
        lines.push(`- Excerpt: ${extraction.excerpt}`);
        lines.push(`- Paraphrase: ${extraction.paraphrase}`);
        lines.push("- Ambiguities:");
        for (const ambiguity of extraction.ambiguities) lines.push(`  - ${ambiguity}`);
        lines.push("- Limitations:");
        for (const limitation of extraction.limitations) lines.push(`  - ${limitation}`);
        lines.push("");
      }

      lines.push("#### Candidate rule records", "");
      for (const ruleId of batch.candidateRuleIds ?? []) {
        const rule = rulesById.get(ruleId);
        if (!rule) continue;
        lines.push("```json", json(rule), "```", "");
      }

      lines.push("#### Review questions", "");
      for (const question of fixture.reviewQuestions) lines.push(`- ${question}`);
      lines.push("", "#### Reviewer decision template", "");
      lines.push("```yaml");
      lines.push("reviewerId: \"\"");
      lines.push("role: source-reviewer | school-expert | adjudicator");
      lines.push(`schoolProfile: ${fixture.schoolProfile}`);
      lines.push("decision: reviewed | approved | disputed");
      lines.push("rationale: \"\"");
      lines.push("reviewedAt: YYYY-MM-DDTHH:mm:ssZ");
      lines.push("sourceIds: []");
      lines.push("claimIds: []");
      lines.push("expectedEffectiveRuleIds: []");
      lines.push("forbiddenRuleIds: []");
      lines.push("```", "");
      lines.push(
        "> Append reviews with `npm run research:huyen-khi:review-rule-seed-fixture-v02 -- --fixture <id> ...`. The CLI validates and atomically appends to the V0.2 ledger; never edit derived approval status by hand.",
        "",
      );
    }
  }

  fs.writeFileSync(
    path.join(RULE_SEED_DIR, "reviewer-workbook.md"),
    `${lines.join("\n").trim()}\n`,
  );
  console.log("Workbook exported");
}

run();
