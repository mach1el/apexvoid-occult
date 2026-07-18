import Ajv from "ajv";
import * as fs from "fs";
import * as path from "path";
import { describe, it, expect } from "vitest";

const ajv = new Ajv({ allErrors: true });

describe("Major Fortune Research Pack V0 Schemas", () => {
  const sourcesPath = path.join(__dirname, "../sources/source-registry.json");
  const sourcesSchemaPath = path.join(__dirname, "../sources/source-registry.schema.json");
  const policiesPath = path.join(__dirname, "../policies/school-policy-matrix.json");
  const policiesSchemaPath = path.join(__dirname, "../policies/school-policy-matrix.schema.json");
  const defaultProfilePath = path.join(__dirname, "../policies/default-profile.v0.json");

  const sourcesData = JSON.parse(fs.readFileSync(sourcesPath, "utf-8"));
  const sourcesSchema = JSON.parse(fs.readFileSync(sourcesSchemaPath, "utf-8"));
  const policiesData = JSON.parse(fs.readFileSync(policiesPath, "utf-8"));
  const policiesSchema = JSON.parse(fs.readFileSync(policiesSchemaPath, "utf-8"));
  const defaultProfileData = JSON.parse(fs.readFileSync(defaultProfilePath, "utf-8"));

  it("validates source-registry.json against its schema", () => {
    const validate = ajv.compile(sourcesSchema);
    const valid = validate(sourcesData);
    if (!valid) {
      console.error(validate.errors);
    }
    expect(valid).toBe(true);
  });

  it("validates school-policy-matrix.json against its schema", () => {
    const validate = ajv.compile(policiesSchema);
    const valid = validate(policiesData);
    if (!valid) {
      console.error(validate.errors);
    }
    expect(valid).toBe(true);
  });

  it("ensures default-profile.v0.json only uses registered policy IDs", () => {
    const registeredPolicyIds = new Set(policiesData.policies.map((p: any) => p.policyId));
    
    for (const [topic, policyId] of Object.entries(defaultProfileData.policies)) {
      expect(registeredPolicyIds.has(policyId as string)).toBe(true);
    }
  });

  it("ensures all source IDs, claim IDs, and policy IDs are unique", () => {
    const sourceIds = new Set();
    const claimIds = new Set();
    const policyIds = new Set();

    for (const source of sourcesData.sources) {
      expect(sourceIds.has(source.sourceId)).toBe(false);
      sourceIds.add(source.sourceId);

      for (const claim of source.claims) {
        expect(claimIds.has(claim.claimId)).toBe(false);
        claimIds.add(claim.claimId);
      }
    }

    for (const policy of policiesData.policies) {
      expect(policyIds.has(policy.policyId)).toBe(false);
      policyIds.add(policy.policyId);
    }
  });

  it("validates all cross-references (claims point to policies, policies point to sources)", () => {
    const validSourceIds = new Set(sourcesData.sources.map((s: any) => s.sourceId));
    const validPolicyIds = new Set(policiesData.policies.map((p: any) => p.policyId));

    for (const source of sourcesData.sources) {
      for (const claim of source.claims) {
        if (claim.policyLink) {
          expect(validPolicyIds.has(claim.policyLink)).toBe(true);
        }
      }
    }

    for (const policy of policiesData.policies) {
      for (const srcRef of policy.sourceRefs) {
        expect(validSourceIds.has(srcRef)).toBe(true);
      }
      for (const conflictRef of policy.conflictsWith) {
        expect(validPolicyIds.has(conflictRef)).toBe(true);
      }
    }
  });
});
