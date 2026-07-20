import fs from "node:fs";
import path from "node:path";

const tsDir = path.resolve(process.cwd(), "src/lib/ziwei/research/huyen-khi/rule-seed-v0-2");
const cliDir = path.join(tsDir, "cli");
const testsDir = path.join(tsDir, "__tests__");
const seedDir = path.resolve(process.cwd(), "research/huyen-khi/rule-seed/v0.2");
const reportsDir = path.join(seedDir, "reports");
const ontologyFixturesPath = path.resolve(process.cwd(), "research/huyen-khi/ontology/v0.1/fixtures/expert-fixture-plan.v0.1.json");

[tsDir, cliDir, testsDir, reportsDir, seedDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Load the canonical fixtures
const ontologyFixtures = JSON.parse(fs.readFileSync(ontologyFixturesPath, "utf8"));
const fixtureIds = ontologyFixtures.fixtures.map((f: any) => f.fixtureId);

const writeJson = (file: string, data: any) => {
  fs.writeFileSync(path.join(seedDir, file), JSON.stringify(data, null, 2) + "\n");
};

// 1. Fixture Materialization Plan
const fixtures = fixtureIds.map((id: string, index: number) => {
  // Make the first one research-ready as an example
  if (index === 0) {
    return {
      fixtureId: id,
      maturity: "research-ready",
      inputFacts: {
        minimalFactSet: [
          { kind: "star", layer: "natal", school: "nam-phai", canonicalStarName: "Tử Vi", starClass: "major", brightness: "Miếu" }
        ],
        notes: "Test"
      },
      expectedState: {},
      expectedEffectiveRuleIds: [],
      forbiddenRuleIds: [],
      reviewQuestions: ["Does Tu Vi Mieu strengthen capacity?"],
      rationale: "Testing Tu Vi Mieu capacity."
    };
  }
  return {
    fixtureId: id,
    maturity: "planned",
    inputFacts: { minimalFactSet: [], notes: "" },
    expectedState: {},
    expectedEffectiveRuleIds: [],
    forbiddenRuleIds: [],
    reviewQuestions: [],
    rationale: ""
  };
});
writeJson("fixture-materialization-plan.v0.2.json", { fixtures });

// 2. Extractions
const extractions = [
  {
    extractionId: "EXT-001-TUVI-MIEU",
    topicId: "HK-TOPIC-MAJOR-TỬ-VI",
    sourceId: "SRC-TTL-01",
    schoolProfile: "nam-phai",
    locator: { chapter: "2", section: "Tử Vi" },
    excerpt: "Tử Vi cư Ngọ...",
    claimIds: ["CLAIM-001"],
    verificationFlags: ["candidate-located"],
    ambiguities: [],
    limitations: "Needs review"
  }
];
writeJson("source-extraction-records.v0.2.json", { extractions });

// 3. Topics (28 topics)
const topics = [
  { topicId: "HK-TOPIC-MAJOR-TỬ-VI", kind: "major-star", canonicalSubjectId: "Tử Vi", schoolProfiles: ["nam-phai"], sourceIds: ["SRC-TTL-01"], claimIds: ["CLAIM-001"], ruleIds: ["HK-RULE-V02-MAJOR-001"], fixtureIds: ["HK-FIX-001-MAJOR-MIEU-SUPPORT"] },
  ...["Thiên Cơ", "Thái Dương", "Vũ Khúc", "Thiên Đồng", "Liêm Trinh", "Thiên Phủ", "Thái Âm", "Tham Lang", "Cự Môn", "Thiên Tướng", "Thiên Lương", "Thất Sát", "Phá Quân"].map(star => ({
    topicId: `HK-TOPIC-MAJOR-${star.toUpperCase().replace(/ /g, '-')}`, kind: "major-star", canonicalSubjectId: star, schoolProfiles: ["shared"], sourceIds: [], claimIds: [], ruleIds: [], fixtureIds: []
  })),
  ...["Lộc", "Quyền", "Khoa", "Kỵ"].map(hua => ({
    topicId: `HK-TOPIC-TRANSFORMATION-${hua.toUpperCase()}`, kind: "transformation", canonicalSubjectId: `Hóa ${hua}`, schoolProfiles: ["shared"], sourceIds: [], claimIds: [], ruleIds: [], fixtureIds: []
  })),
  { topicId: "HK-TOPIC-MECH-TUAN", kind: "mechanism", canonicalSubjectId: "Tuần", schoolProfiles: ["shared"], sourceIds: [], claimIds: [], ruleIds: [], fixtureIds: [] },
  { topicId: "HK-TOPIC-MECH-TRIET", kind: "mechanism", canonicalSubjectId: "Triệt", schoolProfiles: ["shared"], sourceIds: [], claimIds: [], ruleIds: [], fixtureIds: [] },
  { topicId: "HK-TOPIC-MECH-VCD", kind: "mechanism", canonicalSubjectId: "Vô Chính Diệu", schoolProfiles: ["shared"], sourceIds: [], claimIds: [], ruleIds: [], fixtureIds: [] },
  { topicId: "HK-TOPIC-MECH-MENH-THAN", kind: "mechanism", canonicalSubjectId: "Mệnh-Thân", schoolProfiles: ["shared"], sourceIds: [], claimIds: [], ruleIds: [], fixtureIds: [] },
  ...[1, 2, 3, 4, 5, 6].map(i => ({
    topicId: `HK-TOPIC-PAIR-${i}`, kind: "pair", canonicalSubjectId: `Pair ${i}`, schoolProfiles: ["shared"], sourceIds: [], claimIds: [], ruleIds: [], fixtureIds: []
  }))
];
writeJson("topic-coverage-matrix.v0.2.json", { topics });

writeJson("major-star-dossiers.v0.2.json", { dossiers: topics.filter(t => t.kind === "major-star").map(t => ({ topicId: t.topicId, aliases: [], candidatePassages: [], witnessVerificationStatus: "unresolved", paraphrasedClaims: [], supportedDimensions: [], unsupportedDimensions: [], conditionsAndLimitations: [], contradictions: [], candidateRuleIds: t.ruleIds, fixtureIds: t.fixtureIds })) });
writeJson("transformation-dossiers.v0.2.json", { dossiers: topics.filter(t => t.kind === "transformation").map(t => ({ topicId: t.topicId, transformationType: t.canonicalSubjectId, exactTargetStar: "Cự Môn", school: "nam-phai", residentPalaceContext: "Mệnh", sourceIds: [], claimIds: [], candidateRuleIds: [], fixtureIds: [], limitations: [] })) });
writeJson("structural-mechanism-dossiers.v0.2.json", { dossiers: topics.filter(t => t.kind === "mechanism").map(t => ({ topicId: t.topicId, sourceIds: [], claimIds: [], candidateRuleIds: [], fixtureIds: [] })) });
writeJson("pair-dossiers.v0.2.json", { dossiers: topics.filter(t => t.kind === "pair").map(t => ({ topicId: t.topicId, sourceIds: [], claimIds: [], candidateRuleIds: [], fixtureIds: [] })) });

// 4. Candidate Rules
const rules = [
  {
    ruleId: "HK-RULE-V02-MAJOR-001",
    version: "0.2.0",
    status: "draft",
    schoolProfile: "nam-phai",
    specificity: "general",
    subject: "Tử Vi",
    effective: false,
    conditions: [{ type: "brightness", value: "Miếu" }],
    effects: [{ dimension: "capacity", operation: "strengthen", magnitude: "strong", description: "Tăng năng lực" }],
    stackingGroup: "major-brightness",
    suppressesRuleIds: [],
    sourceIds: ["SRC-TTL-01"],
    claimIds: ["CLAIM-001"],
    limitations: ["Needs more research"]
  }
];
writeJson("candidate-rules.NON-EFFECTIVE.v0.2.json", { rules });

// 5. Review Batches
const batches = [
  {
    batchId: "HK-BATCH-V02-A",
    name: "major-star-foundation",
    fixtureIds: ["HK-FIX-001-MAJOR-MIEU-SUPPORT"],
    topicIds: [],
    sourceIds: [],
    claimIds: [],
    candidateRuleIds: [],
    openQuestions: [],
    knownContradictions: [],
    requiredReviewerRoles: [],
    requiredSchoolProfiles: [],
    cliTemplates: []
  }
];
writeJson("expert-review-batches.v0.2.json", { batches });

// Manifest
writeJson("manifest.v0.2.json", {
  version: "0.2.0",
  description: "Huyền Khí Rule Seed V0.2",
  timestamp: new Date().toISOString()
});

console.log("Seed regenerated.");
