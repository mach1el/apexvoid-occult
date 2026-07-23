import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import Ajv from "ajv";

const FOUNDATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(FOUNDATION, rel), "utf8"));
}

describe("Major Fortune V0.2 research pack — AJV + artifacts", () => {
  it("has required artifacts", () => {
    for (const rel of [
      "README.md",
      "V0.2-FOUNDATION-DECISION.md",
      "sources/source-registry.json",
      "claims/claim-registry.json",
      "contradictions/contradiction-log.json",
      "prompts/implementation-handoff-prompt.md",
      "policies/element-relation-policy.json",
      "policies/thai-tue-group-policy.json",
      "policies/natal-palace-group-policy.json",
      "policies/principal-star-dignity-policy.json",
      "policies/star-pattern-compatibility-policy.json",
      "policies/major-transformation-policy.json",
      "policies/benefic-malefic-policy.json",
      "policies/void-treatment-policy.json",
      "policies/natal-resilience-policy.json",
    ]) {
      expect(fs.existsSync(path.join(FOUNDATION, rel)), rel).toBe(true);
    }
  });

  it("validates registries and policies with AJV", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const pairs: Array<[string, string]> = [
      ["sources/source-registry.json", "schema/source-registry.schema.json"],
      ["claims/claim-registry.json", "schema/claim-registry.schema.json"],
      ["contradictions/contradiction-log.json", "schema/contradiction-log.schema.json"],
      ["audit/corpus-contract.json", "schema/audit-contract.schema.json"],
      ["audit/gate-contract.json", "schema/gate-contract.schema.json"],
    ];
    for (const file of fs.readdirSync(path.join(FOUNDATION, "policies"))) {
      if (file.endsWith(".json")) pairs.push([`policies/${file}`, "schema/policy-matrix.schema.json"]);
    }
    for (const [dataRel, schemaRel] of pairs) {
      const validate = ajv.compile(readJson(schemaRel) as object);
      const ok = validate(readJson(dataRel));
      expect(ok, `${dataRel}: ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  });

  it("rejects negative fixtures", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const claimSchema = readJson("schema/claim-registry.schema.json");
    const validateClaims = ajv.compile(claimSchema as object);
    expect(
      validateClaims({
        schemaVersion: "0.2.0",
        registryId: "x",
        claims: [
          {
            claimId: "BAD",
            topic: "formula",
            statement: "x",
            school: "nam-phai",
            status: "derived",
            sourceIds: ["SRC-MF-V02-INTAKE-001"],
            runtimeImplication: "x",
          },
        ],
      }),
    ).toBe(false);

    const contraSchema = readJson("schema/contradiction-log.schema.json");
    const validateContra = ajv.compile(contraSchema as object);
    expect(
      validateContra({
        schemaVersion: "0.2.0",
        logId: "x",
        contradictions: [
          {
            contradictionId: "bad",
            claimIds: [],
            summary: "",
            adjudication: "x",
            runtimeImplication: "x",
            sourceIds: [],
          },
        ],
      }),
    ).toBe(false);

    const bandValidate = ajv.compile({
      type: "object",
      required: ["bands"],
      properties: {
        bands: {
          type: "array",
          items: {
            type: "object",
            required: ["bandId", "minInclusive", "maxInclusive"],
            properties: {
              bandId: { type: "string" },
              minInclusive: { type: "number" },
              maxInclusive: { type: "number" },
            },
          },
        },
      },
    });
    expect(bandValidate({ bands: [{ bandId: "a", minInclusive: 0, maxInclusive: 10 }] })).toBe(true);
  });

  it("CLI validate exits 0 on current pack", () => {
    const out = execFileSync(
      "npx",
      ["tsx", "src/lib/ziwei/analysis/modules/major-fortune/audit/v0.2/cli/validate-research-pack.ts"],
      { cwd: path.resolve(FOUNDATION, "../../.."), encoding: "utf8" },
    );
    expect(out).toContain('"ok": true');
  });

  it("decision document remains RESEARCH_INCOMPLETE", () => {
    const md = fs.readFileSync(path.join(FOUNDATION, "V0.2-FOUNDATION-DECISION.md"), "utf8");
    expect(md).toContain("RESEARCH_INCOMPLETE");
    expect(md).not.toMatch(/PRODUCTION_READY/);
  });
});
