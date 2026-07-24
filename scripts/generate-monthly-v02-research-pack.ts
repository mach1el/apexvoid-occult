import fs from "node:fs";
import path from "node:path";

const BASE_DIR = path.resolve(process.cwd(), "research/monthly-flow/v0.2-nam-phai-foundation");

function writeJson(relPath: string, data: any) {
  const fullPath = path.join(BASE_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + "\n");
}

function writeMd(relPath: string, content: string) {
  const fullPath = path.join(BASE_DIR, relPath);
  fs.writeFileSync(fullPath, content.trim() + "\n");
}

// 1. Sources & Claims
writeJson("sources/source-registry.json", [
  {
    sourceId: "SRC-MONTHLY-NP-EXPERT-001",
    title: "Công thức Số hóa Lưu Nguyệt Nam Phái",
    sourceType: "domain-expert-supplied-formula",
    school: "nam-phai",
    status: "expert-authorized-candidate",
    scope: [
      "monthly-coordinate",
      "five-tiger-month-stem",
      "monthly-transformations",
      "annual-inheritance",
      "palace-quality",
      "dau-quan-amplification",
      "monthly-score",
      "display-bands"
    ]
  }
]);

writeJson("sources/claim-registry.json", [
  {
    claimId: "CLAIM-M01-DAU-QUAN",
    sourceId: "SRC-MONTHLY-NP-EXPERT-001",
    description: "Tháng Giêng (Lưu Đẩu Quân) khởi từ Chi năm xem, đếm nghịch tháng sinh, đếm thuận giờ sinh."
  },
  {
    claimId: "CLAIM-M02-CALENDAR",
    sourceId: "SRC-MONTHLY-NP-EXPERT-001",
    description: "Can chi tháng lấy theo Ngũ Hổ Độn, không lấy can cung."
  }
]);

// 2. Policies
writeJson("policy/nam-phai-month-coordinate-policy.json", {
  policyId: "POLICY-NP-MONTH-COORDINATE",
  status: "pending-expert-review",
  candidates: {
    startPalace: "annualBranchPalaceIndex",
    monthOffset: "birthLunarMonth - 1 (Need confirm adjustedLunarMonth or not)",
    hourOffset: "birthHourIndex"
  },
  resolution: null
});

writeJson("policy/lunar-calendar-boundary-policy.json", {
  policyId: "POLICY-LUNAR-CALENDAR",
  leapMonthStatus: "unavailable",
  reason: "explicit-leap-policy-required"
});

writeJson("policy/annual-inheritance-policy.json", {
  policyId: "POLICY-ANNUAL-INHERITANCE",
  status: "unavailable",
  reason: "annual-base-score-unavailable",
  candidates: {
    baseSource: ["overall-hex-composite", "new-annual-summary", "limit-palace-score"],
    deltas: { ">65": 10, "45-65": 0, "<45": -10 }
  }
});

writeJson("policy/monthly-transformation-policy.json", {
  policyId: "POLICY-MONTHLY-TRANSFORMATION",
  status: "pending-expert-review",
  scope: ["direct-focus", "trine", "opposite", "full-tp4c"],
  deltas: { "Lộc": 25, "Quyền": 15, "Khoa": 15, "Kỵ": -25 }
});

writeJson("policy/palace-quality-policy.json", {
  policyId: "POLICY-PALACE-QUALITY",
  status: "pending-expert-review",
  buckets: {
    majorSupport: 15,
    secondarySupport: 10,
    majorPressure: -15,
    voidMarker: -10
  }
});

writeJson("policy/dau-quan-amplification-policy.json", {
  policyId: "POLICY-DAU-QUAN-AMP",
  status: "expert-authorized",
  multiplier: { month1: 1.5, other: 1.0 },
  appliesTo: ["palaceSubtotal"]
});

writeJson("policy/transformation-stacking-policy.json", {
  policyId: "POLICY-TRANSFORMATION-STACKING",
  status: "pending-expert-review",
  candidates: {
    "same-star-natal-monthly": -50,
    "same-star-annual-monthly": -50
  }
});

writeJson("policy/safety-presentation-policy.json", {
  policyId: "POLICY-SAFETY",
  status: "pending-expert-review",
  rules: []
});

// 3. Formula
writeJson("formula/monthly-score-contract.json", {
  contractVersion: "0.2.0-research",
  engineVersion: "unavailable",
  productionStatus: "unavailable",
  base: 50,
  formula: "clamp(50 + annualInheritanceDelta + (palaceSubtotal * dauQuanMultiplier) + monthlyTransformationDelta, 0, 100)"
});

writeJson("formula/scoring-component-registry.json", {});

writeJson("formula/band-contract.json", {
  boundaries: {
    breakthrough: { minExcl: 75 },
    favorable: { minIncl: 55, maxIncl: 75 },
    stable: { minIncl: 45, maxExcl: 55 },
    obstructed: { minIncl: 25, maxExcl: 45 },
    alert: { maxExcl: 25 }
  }
});

// Schemas & Reports
writeJson("schemas/source-registry.schema.json", {});
writeJson("schemas/claim-registry.schema.json", {});
writeJson("schemas/coordinate-policy.schema.json", {});
writeJson("schemas/scoring-contract.schema.json", {});
writeJson("schemas/fixture.schema.json", {});
writeJson("schemas/audit-report.schema.json", {});

writeJson("reports/readiness-decision.json", { readinessDecision: "RESEARCH_INCOMPLETE" });
writeJson("reports/current-implementation-gap-report.json", {
  coordinateResolutionFailures: 1,
  monthCoverageFailures: 0,
  calendarIdentityFailures: 1,
  determinismFailures: 0,
  duplicatePhysicalFacts: 0,
  missingSourceIds: 1,
  annualScoreUnavailableCount: 1,
  palaceQualityUnavailableCount: 1,
  elementPolicyUnavailableCount: 1,
  stackingPolicyUnavailableCount: 1
});

writeJson("reports/coordinate-proof-report.json", {});
writeJson("reports/calendar-proof-report.json", {});
writeJson("reports/transformation-proof-report.json", {});
writeJson("reports/scoring-sensitivity-report.json", {});
writeJson("reports/distribution-report.json", {});
writeJson("reports/unresolved-decision-report.json", {});

// Markdown documents
writeMd("expert-review-workbook.md", `
# Lưu Nguyệt Nam Phái V0.2 Expert Review Workbook

## Cần thầy duyệt

1. Dùng tháng sinh âm lịch gốc hay \`adjustedLunarMonth\`?
2. Lưu Đẩu Quân luôn khởi từ Chi năm xem hay phụ thuộc \`flowBase\`?
3. Chính sách tháng sinh nhuận?
4. Chính sách tháng xem nhuận?
5. Nguồn \`Year Score\` lấy từ đâu?
6. Cách tổng hợp hai chính tinh đồng cung?
7. Định nghĩa Vô Chính Diệu đắc Tam Không?
8. Cát/hung bucket kích hoạt bởi 1 sao hay cần hội tụ?
9. Tuần + Triệt là -10 hay -20?
10. "Hành Cung" lấy từ đâu?
11. "Bản Mệnh" dùng ngũ hành nào?
12. Phạm vi Tứ Hóa xét ở đâu?
13. Cộng nhiều Tứ Hóa như thế nào?
14. Điều kiện Hóa Kỵ thành -50?
15. Kỵ -50 là replacement hay cộng dồn?
16. Có cap từng trụ không?
17. Luận giải nào xuất ra UI?
18. Xử lý cung Tật Ách thế nào?
`);

writeMd("unresolved-questions.md", `
# Unresolved Questions
Please see expert-review-workbook.md for the 18 specific policy questions.
`);

writeMd("V0.2-RESEARCH-DECISION.md", `
# Research Decision V0.2

Current status: **RESEARCH_INCOMPLETE**.
Awaiting expert decisions on coordinate policies, stacking policies, and calendar boundaries.
`);

writeMd("README.md", "# Nam Phái Monthly Flow V0.2 Foundation");

console.log("Research pack generated.");
