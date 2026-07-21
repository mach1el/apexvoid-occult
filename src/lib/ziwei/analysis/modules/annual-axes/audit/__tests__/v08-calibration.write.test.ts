import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadAnnualAxesKnowledgeV08NamPhai,
  resetAnnualAxesKnowledgeV08NamPhaiCache,
} from "../../../../knowledge/annual-axes/v0.8";
import { runV08CandidateEvaluation } from "../run-v08-candidate-evaluation";
import { ANNUAL_AXIS_DOMAINS } from "../../../../contracts/annual-axes";
import type { AnnualAxisCalibrationV08 } from "../../../../knowledge/annual-axes/v0.8/schema";
import { deriveV08Calibration } from "../../../../knowledge/annual-axes/v0.8/derive-calibration";

const ENABLED = process.env.ANNUAL_AXES_V08_CALIBRATION_WRITE === "1";
const OUT_DIR = join(process.cwd(), "research/annual-axes/distribution/v0.8");
const KNOWLEDGE_CAL =
  "src/lib/ziwei/analysis/knowledge/annual-axes/v0.8/annual-axis-calibration.nam-phai.v0.8.json";

function renderDecision(report: ReturnType<typeof runV08CandidateEvaluation>): string {
  const lines = [
    "# Annual Axes V0.8 Decision",
    "",
    report.selectionStatus === "approved"
      ? "APPROVED FOR PRODUCTION"
      : "NO VARIANT APPROVED",
    "",
    `selectionStatus: ${report.selectionStatus}`,
    `selectedVariant: ${report.selectedVariant ?? "null"}`,
    `formulaVersion: ${report.formulaVersion}`,
    "",
    "## Selection rationale",
    ...report.selectionRationale.map((r) => `- ${r}`),
    "",
    "## Calibration",
    `- domainCenters: ${ANNUAL_AXIS_DOMAINS.map((d) => `${d}=${report.calibration.domainCenters[d]}`).join(", ")}`,
    `- robustScales: ${ANNUAL_AXIS_DOMAINS.map((d) => `${d}=${report.calibration.robustScales[d]}`).join(", ")}`,
    `- activationScales: ${ANNUAL_AXIS_DOMAINS.map((d) => `${d}=${report.calibration.activationScales[d]}`).join(", ")}`,
    "",
    "## Candidates",
  ];
  for (const c of report.candidates) {
    lines.push(`### ${c.candidateId}`);
    lines.push(`- passedAllGates: ${c.passedAllGates}`);
    lines.push(
      `- holdout median/mean: ${c.holdoutMetrics.globalMedianScore} / ${c.holdoutMetrics.globalMeanScore}`,
    );
    lines.push(
      `- effectiveZ +/-: ${c.holdoutMetrics.positiveEffectiveZRate} / ${c.holdoutMetrics.negativeEffectiveZRate}`,
    );
    lines.push(
      `- product: ${ANNUAL_AXIS_DOMAINS.map((d) => `${d}=${(c.productFixture as any)[d]}`).join(", ")} range=${c.productFixture.radarRange} L1v05=${c.productFixture.l1FromV05} L1v07=${c.productFixture.l1FromV07}`,
    );
    if (c.blockers.length) {
      lines.push(`- blockers (${c.blockers.length}):`);
      for (const b of c.blockers.slice(0, 25)) lines.push(`  - ${b}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

describe.runIf(ENABLED)("annual-axes v0.8 candidate evaluation write", () => {
  it("calibrates, evaluates candidates, writes artifacts", () => {
    resetAnnualAxesKnowledgeV08NamPhaiCache();
    const loaded = loadAnnualAxesKnowledgeV08NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const report = runV08CandidateEvaluation(loaded.knowledge);
    const report2 = runV08CandidateEvaluation(loaded.knowledge);
    expect(JSON.stringify(report)).toBe(JSON.stringify(report2));

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.8-calibration.json"),
      `${JSON.stringify(report.calibration, null, 2)}\n`,
    );
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.8-candidate-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.8-holdout-report.json"),
      `${JSON.stringify(
        {
          selectionStatus: report.selectionStatus,
          selectedVariant: report.selectedVariant,
          candidates: report.candidates.map((c) => ({
            candidateId: c.candidateId,
            passedAllGates: c.passedAllGates,
            blockers: c.blockers,
            holdoutMetrics: {
              globalMedianScore: c.holdoutMetrics.globalMedianScore,
              globalMeanScore: c.holdoutMetrics.globalMeanScore,
              positiveEffectiveZRate: c.holdoutMetrics.positiveEffectiveZRate,
              negativeEffectiveZRate: c.holdoutMetrics.negativeEffectiveZRate,
              tp4cSignedContributionMaxAbs: c.holdoutMetrics.tp4cSignedContributionMaxAbs,
            },
          })),
        },
        null,
        2,
      )}\n`,
    );
    const selected = report.candidates.find((c) => c.candidateId === report.selectedVariant);
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.8-product-fixture.json"),
      `${JSON.stringify(
        {
          birth: {
            solarDate: "1991-09-21",
            birthHour: "Dậu",
            gender: "female",
            timezone: "7",
            annualYear: "2026",
            flowBase: "luu-nien",
          },
          selectedVariant: report.selectedVariant,
          productFixture: selected?.productFixture ?? null,
          allCandidates: report.candidates.map((c) => ({
            candidateId: c.candidateId,
            productFixture: c.productFixture,
          })),
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(join(OUT_DIR, "ANNUAL-AXES-V0.8-DECISION.md"), renderDecision(report));

    const derived = deriveV08Calibration(loaded.knowledge);
    const baked: AnnualAxisCalibrationV08 = {
      ...derived,
      selectedVariant: report.selectedVariant,
      selectionStatus: report.selectionStatus,
    };
    writeFileSync(KNOWLEDGE_CAL, `${JSON.stringify(baked, null, 2)}\n`);
    resetAnnualAxesKnowledgeV08NamPhaiCache();

    const onDisk = JSON.parse(readFileSync(KNOWLEDGE_CAL, "utf8"));
    expect(onDisk.domainCenters).toEqual(baked.domainCenters);
    expect(onDisk.selectedVariant).toBe(report.selectedVariant);
  }, 900_000);
});
