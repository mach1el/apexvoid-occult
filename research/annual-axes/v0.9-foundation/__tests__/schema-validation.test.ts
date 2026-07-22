import Ajv from "ajv";
import * as fs from "fs";
import * as path from "path";
import { describe, it, expect } from "vitest";

const ajv = new Ajv({ allErrors: true });
const ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(ROOT, "../../..");

function readJson(relPath: string): any {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf-8"));
}

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

const sourceRegistrySchema = readJson("schema/source-registry.schema.json");
const claimRegistrySchema = readJson("schema/claim-registry.schema.json");
const policyMatrixSchema = readJson("schema/policy-matrix.schema.json");
const auditContractSchema = readJson("schema/audit-contract.schema.json");

const TWELVE = [
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

const DOCTRINE_TYPES = new Set(["classical-text", "school-manual", "published-reference"]);
const READINESS_STATES = [
  "READY_FOR_V0_9_CANDIDATE",
  "RESEARCH_INCOMPLETE",
  "V0_8_SHOULD_REMAIN_UNCHANGED",
  "CALCULATION_CORE_BLOCKED",
] as const;

describe("Annual Axes V0.9 research pack — schema conformance", () => {
  it("validates source-registry.v0.9.json against its schema", () => {
    const validate = ajv.compile(sourceRegistrySchema);
    const valid = validate(sourceRegistry);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("validates claim-registry.v0.9.json against its schema", () => {
    const validate = ajv.compile(claimRegistrySchema);
    const valid = validate(claimRegistry);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("validates school-policy-matrix.v0.9.json against its schema", () => {
    const validate = ajv.compile(policyMatrixSchema);
    const valid = validate(schoolPolicyMatrix);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("validates audit-contract.v0.9.json against its schema", () => {
    const validate = ajv.compile(auditContractSchema);
    const valid = validate(auditContract);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });
});

describe("Annual Axes V0.9 research pack — source registry", () => {
  const sources: any[] = sourceRegistry.sources;
  const sourceById = new Map(sources.map((s) => [s.sourceId, s]));

  it("source IDs are unique", () => {
    expect(new Set(sources.map((s) => s.sourceId)).size).toBe(sources.length);
  });

  it("verified/partial sources require locator", () => {
    for (const source of sources) {
      if (source.accessStatus === "verified" || source.accessStatus === "partial") {
        expect(String(source.locator).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("source type and school scope are valid schema enums", () => {
    const validate = ajv.compile(sourceRegistrySchema);
    expect(validate(sourceRegistry)).toBe(true);
  });

  it("unverified source alone cannot authorize candidate eligibility", () => {
    const entries = starDomainPolicy.unreferencedButEmittedStars.entries;
    for (const entry of entries) {
      if (!entry.candidateEligible) continue;
      const types = entry.sourceIds.map((id: string) => sourceById.get(id)?.sourceType);
      expect(types.some((t: string) => DOCTRINE_TYPES.has(t))).toBe(true);
      expect(types.every((t: string) => t === "unverified-summary")).toBe(false);
    }
  });

  it("internal engineering source alone cannot support classical claim", () => {
    for (const claim of claimRegistry.claims) {
      if (claim.status !== "classical") continue;
      const types = claim.sourceIds.map((id: string) => sourceById.get(id)?.sourceType);
      expect(types.some((t: string) => DOCTRINE_TYPES.has(t))).toBe(true);
    }
  });
});

describe("Annual Axes V0.9 research pack — claim registry", () => {
  const claims: any[] = claimRegistry.claims;
  const claimIds = new Set(claims.map((c) => c.claimId));
  const sourceIds = new Set(sourceRegistry.sources.map((s: any) => s.sourceId));

  it("claim IDs are unique", () => {
    expect(claimIds.size).toBe(claims.length);
  });

  it("all source references resolve", () => {
    for (const claim of claims) {
      for (const sourceId of claim.sourceIds) {
        expect(sourceIds.has(sourceId), `${claim.claimId} -> ${sourceId}`).toBe(true);
      }
    }
  });

  it("classical and derived claims have locators", () => {
    for (const claim of claims) {
      if (claim.status === "classical" || claim.status === "derived") {
        expect(claim.locators.length, claim.claimId).toBeGreaterThan(0);
      }
    }
  });

  it("disputed claims link to contradictions and resolve", () => {
    for (const claim of claims) {
      if (claim.status !== "disputed") continue;
      expect(claim.contradictingClaimIds.length).toBeGreaterThan(0);
      for (const otherId of claim.contradictingClaimIds) {
        expect(claimIds.has(otherId)).toBe(true);
      }
    }
  });

  it("unsupported claims cannot enable production", () => {
    for (const claim of claims) {
      if (claim.status !== "unsupported") continue;
      const implication = claim.runtimeImplication.toLowerCase();
      expect(
        implication.includes("must not enable") || implication.includes("no production"),
      ).toBe(true);
    }
  });

  it("classical claims use compatible source types", () => {
    const sourceById = new Map(sourceRegistry.sources.map((s: any) => [s.sourceId, s]));
    for (const claim of claims) {
      if (claim.status !== "classical") continue;
      const ok = claim.sourceIds.some((id: string) => DOCTRINE_TYPES.has(sourceById.get(id)?.sourceType));
      expect(ok, claim.claimId).toBe(true);
    }
  });
});

describe("Annual Axes V0.9 research pack — twelve-star adjudication", () => {
  const entries: any[] = starDomainPolicy.unreferencedButEmittedStars.entries;

  it("contains each of the 12 identities exactly once", () => {
    const names = entries.map((e) => e.exactStarName);
    expect(names.sort()).toEqual([...TWELVE].sort());
    expect(new Set(names).size).toBe(12);
  });

  it("each star has decision, confidence, sources or insufficient rationale, eligibility, producer status", () => {
    for (const entry of entries) {
      expect(entry.decision).toBeTruthy();
      expect(entry.confidence).toBeTruthy();
      expect(typeof entry.candidateEligible).toBe("boolean");
      expect(entry.calculationCoreProducerStatus).toBeTruthy();
      if (entry.decision === "insufficient-evidence") {
        expect(String(entry.rationale || "").length).toBeGreaterThan(0);
      } else {
        expect(entry.sourceIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("only Lưu Thiên Mã is candidate-eligible in this foundation pass", () => {
    const eligible = entries.filter((e) => e.candidateEligible).map((e) => e.exactStarName);
    expect(eligible).toEqual(["Lưu Thiên Mã"]);
  });
});

describe("Annual Axes V0.9 research pack — contradictions", () => {
  it("Lưu Đào Hoa contradiction remains with adjudication", () => {
    const contra = contradictionRegistry.contradictions.find((c: any) => c.contradictionId === "CONTRA-AAV09-001");
    expect(contra).toBeTruthy();
    expect(contra.adjudication).toBeTruthy();
    expect(contra.claimIds).toEqual(expect.arrayContaining(["CLM-AAV09-005", "CLM-AAV09-006"]));
  });

  it("remain-disputed / context-dependent adjudications are allowed", () => {
    const contra = contradictionRegistry.contradictions.find((c: any) => c.contradictionId === "CONTRA-AAV09-001");
    expect(["remain-disputed", "context-dependent", "school-specific", "insufficient-evidence", "prefer-claim-a", "prefer-claim-b"]).toContain(
      contra.adjudication,
    );
  });

  it("candidate shapes do not depend on unresolved disputed polarity", () => {
    const claimById = new Map(claimRegistry.claims.map((c: any) => [c.claimId, c]));
    for (const shape of readiness.candidateShapes) {
      for (const claimId of shape.claimIds) {
        expect(claimById.get(claimId)?.status).not.toBe("disputed");
      }
      expect(shape.includedStars).not.toContain("Lưu Đào Hoa");
    }
  });
});

describe("Annual Axes V0.9 research pack — policy consistency", () => {
  it("school-policy records agree with claim school scope for nam-phai entries", () => {
    const claimById = new Map(claimRegistry.claims.map((c: any) => [c.claimId, c]));
    for (const topic of schoolPolicyMatrix.topics) {
      for (const claimId of topic.namPhai.claimIds) {
        const claim = claimById.get(claimId);
        expect(claim, claimId).toBeTruthy();
        expect(["nam-phai", "mixed"]).toContain(claim.school);
      }
    }
  });

  it("domain-palace policy references valid claims and has Tiểu Hạn decision", () => {
    const claimIds = new Set(claimRegistry.claims.map((c: any) => c.claimId));
    expect(domainPalacePolicy.tieuHanPolicy.decision).toBe("general annual context supported");
    for (const claimId of domainPalacePolicy.tieuHanPolicy.claimIds) {
      expect(claimIds.has(claimId)).toBe(true);
    }
  });

  it("star-domain policy references valid sources", () => {
    const sourceIds = new Set(sourceRegistry.sources.map((s: any) => s.sourceId));
    for (const entry of starDomainPolicy.unreferencedButEmittedStars.entries) {
      for (const sourceId of entry.sourceIds) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }
    }
  });

  it("dignity policy has explicit category decisions", () => {
    expect(dignityPolicy.starCategoryDecisions.length).toBeGreaterThan(0);
    expect(dignityPolicy.numericMultipliersIntroduced).toBe(false);
  });

  it("unsupported-star policy remains fail-closed for five Core-blocked stars", () => {
    const names = unsupportedStarPolicy.stars.map((s: any) => s.exactStarName);
    for (const blocked of CORE_BLOCKED) {
      expect(names).toContain(blocked);
    }
    for (const star of unsupportedStarPolicy.stars) {
      if (CORE_BLOCKED.includes(star.exactStarName)) {
        expect(star.decision).toBe("unsupported");
      }
    }
  });
});

describe("Annual Axes V0.9 research pack — readiness", () => {
  it("readiness state is exactly one recognized value", () => {
    expect(READINESS_STATES).toContain(readiness.readinessState);
  });

  it("READY requires coherent candidate shape and doctrine source", () => {
    if (readiness.readinessState !== "READY_FOR_V0_9_CANDIDATE") return;
    expect(readiness.candidateShapes.length).toBeGreaterThan(0);
    const hasDoctrine = sourceRegistry.sources.some(
      (s: any) => DOCTRINE_TYPES.has(s.sourceType) && (s.accessStatus === "verified" || s.accessStatus === "partial"),
    );
    expect(hasDoctrine).toBe(true);
    for (const shape of readiness.candidateShapes) {
      expect(shape.blockingContradictionsResolved).toBe(true);
      for (const star of shape.includedStars) {
        expect(CORE_BLOCKED).not.toContain(star);
      }
    }
  });

  it("documents all four readiness states as the contract vocabulary", () => {
    expect(READINESS_STATES).toHaveLength(4);
  });
});

describe("Annual Axes V0.9 research pack — production non-regression guards", () => {
  it("default Nam Phái remains engine 0.8.0 and Trung Châu 0.2.0 in readiness contract", () => {
    expect(readiness.productionNonRegression.namPhaiEngineVersion).toBe("0.8.0");
    expect(readiness.productionNonRegression.trungChauEngineVersion).toBe("0.2.0");
  });

  it("historical V0.9 candidate decision snapshot files still exist and are not rewritten by this pack's readiness JSON", () => {
    const candidateDecision = path.join(
      REPO_ROOT,
      "research/annual-axes/v0.9-candidates/V0.9-CANDIDATE-DECISION.md",
    );
    expect(fs.existsSync(candidateDecision)).toBe(true);
    expect(readiness.productionNonRegression.v09CandidateSnapshotImmutable).toBe(true);
  });
});
