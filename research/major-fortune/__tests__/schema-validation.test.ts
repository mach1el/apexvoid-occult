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
  const defaultProfilePath = path.join(__dirname, "../policies/major-fortune-research-v0.json");
  const profileSchemaPath = path.join(__dirname, "../policies/profile.schema.json");

  const sourcesData = JSON.parse(fs.readFileSync(sourcesPath, "utf-8"));
  const sourcesSchema = JSON.parse(fs.readFileSync(sourcesSchemaPath, "utf-8"));
  const policiesData = JSON.parse(fs.readFileSync(policiesPath, "utf-8"));
  const policiesSchema = JSON.parse(fs.readFileSync(policiesSchemaPath, "utf-8"));
  const defaultProfileData = JSON.parse(fs.readFileSync(defaultProfilePath, "utf-8"));
  const profileSchema = JSON.parse(fs.readFileSync(profileSchemaPath, "utf-8"));

  it("13. validates source-registry.json against its schema", () => {
    const validate = ajv.compile(sourcesSchema);
    const valid = validate(sourcesData);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("13. validates school-policy-matrix.json against its schema", () => {
    const validate = ajv.compile(policiesSchema);
    const valid = validate(policiesData);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("13. validates profile against its strict schema", () => {
    const validate = ajv.compile(profileSchema);
    const valid = validate(defaultProfileData);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("1 & 2. profile keys match the selected policy topic, and contains exactly 20 topics", () => {
    const validTopics = new Set(policiesData.policies.map((p: any) => p.topic));
    const topicToValidPolicies = new Map();
    for (const p of policiesData.policies) {
      if (!topicToValidPolicies.has(p.topic)) topicToValidPolicies.set(p.topic, new Set());
      topicToValidPolicies.get(p.topic).add(p.policyId);
    }
    
    const profileTopics = Object.keys(defaultProfileData.policies);
    expect(profileTopics.length).toBe(20);

    for (const [topic, policyId] of Object.entries(defaultProfileData.policies)) {
      expect(validTopics.has(topic)).toBe(true);
      expect(topicToValidPolicies.get(topic).has(policyId)).toBe(true);
    }
  });

  it("3 & 4 & 5 & 6. supported policies must have valid claims and sources", () => {
    const validSourceIds = new Set(sourcesData.sources.map((s: any) => s.sourceId));
    const claimMap = new Map();
    const sourceClaimMap = new Map();

    for (const source of sourcesData.sources) {
      for (const claim of source.claims) {
        claimMap.set(claim.claimId, claim);
        sourceClaimMap.set(claim.claimId, source.sourceId);
      }
    }

    for (const policy of policiesData.policies) {
      if (policy.status === "supported" || policy.status === "default") {
        if (policy.calculationImpact) {
          expect(policy.sourceRefs.length).toBeGreaterThan(0);
          expect(policy.claimRefs.length).toBeGreaterThan(0);
        }
      }

      for (const claimId of policy.claimRefs) {
        expect(claimMap.has(claimId)).toBe(true); // 4. claim exists
        
        // 5. claim links back to the policy (or one of the policies if shared)
        const claim = claimMap.get(claimId);
        const policyLinks = Array.isArray(claim.policyLink) ? claim.policyLink : [claim.policyLink];
        expect(policyLinks).toContain(policy.policyId);

        // 6. source in policy
        expect(policy.sourceRefs).toContain(sourceClaimMap.get(claimId));
      }
    }
  });

  it("7. every policy has a unique ruleId", () => {
    const ruleIds = new Set();
    for (const policy of policiesData.policies) {
      expect(ruleIds.has(policy.ruleId)).toBe(false);
      ruleIds.add(policy.ruleId);
    }
  });

  it("8. every conflict relation is symmetric", () => {
    const conflictMap = new Map(policiesData.policies.map((p: any) => [p.policyId, p.conflictsWith]));

    for (const [policyId, conflicts] of conflictMap.entries()) {
      for (const conflictId of conflicts as string[]) {
        const opposingConflicts = conflictMap.get(conflictId) || [];
        expect(opposingConflicts).toContain(policyId);
      }
    }
  });

  it("9. profile containing unresolved policies must be research and non-executable", () => {
    const unresolvedPolicyIds = new Set(
      policiesData.policies.filter((p: any) => p.status === "unresolved").map((p: any) => p.policyId)
    );

    let hasUnresolved = false;
    for (const policyId of Object.values(defaultProfileData.policies)) {
      if (unresolvedPolicyIds.has(policyId as string)) {
        hasUnresolved = true;
        break;
      }
    }

    if (hasUnresolved) {
      expect(defaultProfileData.profileType).toBe("research");
      expect(defaultProfileData.executable).toBe(false);
    }
  });

  it("10. no supported policy uses unverified claims", () => {
    const claimStatusMap = new Map();
    for (const source of sourcesData.sources) {
      for (const claim of source.claims) {
        claimStatusMap.set(claim.claimId, claim.confidenceStatus);
      }
    }

    for (const policy of policiesData.policies) {
      if (policy.status === "supported" || policy.status === "default") {
        for (const claimId of policy.claimRefs) {
          expect(claimStatusMap.get(claimId)).not.toBe("unverified");
        }
      }
    }
  });

  it("11. no unresolved policy claims to be implemented", () => {
    for (const policy of policiesData.policies) {
      if (policy.status === "unresolved") {
        expect(policy.implementationStatus).toBe("not_started");
      }
    }
  });

  it("12. all IDs are unique globally", () => {
    const globalIds = new Set();
    
    for (const source of sourcesData.sources) {
      expect(globalIds.has(source.sourceId)).toBe(false);
      globalIds.add(source.sourceId);

      for (const claim of source.claims) {
        expect(globalIds.has(claim.claimId)).toBe(false);
        globalIds.add(claim.claimId);
      }
    }

    for (const policy of policiesData.policies) {
      expect(globalIds.has(policy.policyId)).toBe(false);
      globalIds.add(policy.policyId);

      expect(globalIds.has(policy.ruleId)).toBe(false);
      globalIds.add(policy.ruleId);
    }
  });
});
