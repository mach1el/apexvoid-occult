/**
 * CLI: validate Major Fortune V0.2 research pack + runtime knowledge with AJV.
 * Exit non-zero on any schema or cross-reference failure.
 */
import Ajv from "ajv";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadMajorFortuneKnowledgeV02,
  validateMajorFortuneKnowledgeV02,
} from "../../../../../knowledge/major-fortune-scoring/v0.2";

const PACK = join(process.cwd(), "research/major-fortune/v0.2-foundation");
const KNOWLEDGE = join(
  process.cwd(),
  "src/lib/ziwei/analysis/knowledge/major-fortune-scoring/v0.2",
);

function readJson(abs: string): unknown {
  return JSON.parse(readFileSync(abs, "utf8"));
}

interface Issue {
  code: string;
  message: string;
}

function main(): void {
  const issues: Issue[] = [];
  const ajv = new Ajv({ allErrors: true, strict: false });

  const sourceRegistry = readJson(join(PACK, "sources/source-registry.json"));
  const claimRegistry = readJson(join(PACK, "claims/claim-registry.json"));
  const contradictionLog = readJson(join(PACK, "contradictions/contradiction-log.json"));
  const corpusContract = readJson(join(PACK, "audit/corpus-contract.json"));
  const gateContract = readJson(join(PACK, "audit/gate-contract.json"));

  const schemaChecks: Array<[string, string, unknown]> = [
    [
      "sources/source-registry.json",
      "schema/source-registry.schema.json",
      sourceRegistry,
    ],
    ["claims/claim-registry.json", "schema/claim-registry.schema.json", claimRegistry],
    [
      "contradictions/contradiction-log.json",
      "schema/contradiction-log.schema.json",
      contradictionLog,
    ],
    ["audit/corpus-contract.json", "schema/audit-contract.schema.json", corpusContract],
    ["audit/gate-contract.json", "schema/gate-contract.schema.json", gateContract],
  ];

  for (const file of readdirSync(join(PACK, "policies")).filter((f) => f.endsWith(".json"))) {
    schemaChecks.push([
      `policies/${file}`,
      "schema/policy-matrix.schema.json",
      readJson(join(PACK, "policies", file)),
    ]);
  }

  for (const [dataPath, schemaPath, data] of schemaChecks) {
    const schema = readJson(join(PACK, schemaPath));
    const validate = ajv.compile(schema as object);
    if (!validate(data)) {
      for (const err of validate.errors ?? []) {
        issues.push({
          code: "schema",
          message: `${dataPath}: ${err.instancePath} ${err.message}`,
        });
      }
    }
  }

  const sources = sourceRegistry as { sources: Array<{ sourceId: string }> };
  const claims = claimRegistry as {
    claims: Array<{ claimId: string; sourceIds: string[]; school: string }>
  };
  const sourceIds = new Set(sources.sources.map((s) => s.sourceId));
  const claimIds = new Set(claims.claims.map((c) => c.claimId));

  for (const claim of claims.claims) {
    for (const sid of claim.sourceIds) {
      if (!sourceIds.has(sid)) {
        issues.push({
          code: "xref",
          message: `claim ${claim.claimId} refs missing source ${sid}`,
        });
      }
    }
    if (!["nam-phai", "trung-chau", "mixed", "unspecified"].includes(claim.school)) {
      issues.push({ code: "school", message: `invalid school on ${claim.claimId}` });
    }
  }

  const contradictions = contradictionLog as {
    contradictions: Array<{ claimIds: string[]; sourceIds: string[] }>
  };
  for (const c of contradictions.contradictions) {
    for (const id of c.claimIds) {
      if (!claimIds.has(id)) {
        issues.push({ code: "xref", message: `contradiction refs missing claim ${id}` });
      }
    }
    for (const sid of c.sourceIds) {
      if (!sourceIds.has(sid)) {
        issues.push({ code: "xref", message: `contradiction refs missing source ${sid}` });
      }
    }
  }

  // Runtime knowledge files — structural AJV via existing validator + JSON parse
  for (const file of [
    "formula.v0.2.json",
    "bands.v0.2.json",
    "branch-element-map.v0.2.json",
    "school-capabilities.v0.2.json",
    "rules.v0.2.json",
    "natal-palace-groups.v0.2.json",
    "manifest.v0.2.json",
  ]) {
    try {
      readJson(join(KNOWLEDGE, file));
    } catch (e) {
      issues.push({ code: "knowledge-json", message: `${file}: ${String(e)}` });
    }
  }

  const loaded = loadMajorFortuneKnowledgeV02();
  if (!loaded.ok) {
    for (const i of loaded.issues) {
      issues.push({ code: "knowledge", message: `${i.path}: ${i.message}` });
    }
  } else {
    const v = validateMajorFortuneKnowledgeV02(loaded.knowledge as never);
    if (!v.ok) {
      for (const i of v.issues) {
        issues.push({ code: "knowledge", message: `${i.path}: ${i.message}` });
      }
    }
    const ruleIds = new Set<string>();
    for (const rule of loaded.knowledge.rules.rules) {
      if (ruleIds.has(rule.ruleId)) {
        issues.push({ code: "duplicate-rule", message: rule.ruleId });
      }
      ruleIds.add(rule.ruleId);
      if (rule.status === "executable" && rule.rawDelta == null) {
        issues.push({
          code: "executable-null-delta",
          message: rule.ruleId,
        });
      }
      for (const sid of rule.sourceIds) {
        if (!sourceIds.has(sid)) {
          issues.push({
            code: "xref",
            message: `rule ${rule.ruleId} missing source ${sid}`,
          });
        }
      }
      for (const cid of rule.claimIds) {
        if (!claimIds.has(cid)) {
          issues.push({
            code: "xref",
            message: `rule ${rule.ruleId} missing claim ${cid}`,
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    console.error(JSON.stringify({ ok: false, issues }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceCount: sources.sources.length,
        claimCount: claims.claims.length,
        policyCount: readdirSync(join(PACK, "policies")).filter((f) => f.endsWith(".json"))
          .length,
        ruleCount: loaded.ok ? loaded.knowledge.rules.rules.length : 0,
      },
      null,
      2,
    ),
  );
}

main();
