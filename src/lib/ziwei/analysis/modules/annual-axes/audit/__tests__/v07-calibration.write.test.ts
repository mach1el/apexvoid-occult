import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadAnnualAxesKnowledgeV07NamPhai,
  resetAnnualAxesKnowledgeV07NamPhaiCache,
} from "../../../../knowledge/annual-axes/v0.7";
import { runV07CalibrationEvaluation } from "../run-v07-calibration-evaluation";
import { ANNUAL_AXIS_DOMAINS } from "../../../../contracts/annual-axes";
import type { AnnualAxisCalibrationV07 } from "../../../../knowledge/annual-axes/v0.7/schema";

const ENABLED = process.env.ANNUAL_AXES_V07_CALIBRATION_WRITE === "1";
const OUT_DIR = join(process.cwd(), "research/annual-axes/distribution/v0.7");
const KNOWLEDGE_CAL =
  "src/lib/ziwei/analysis/knowledge/annual-axes/v0.7/annual-axis-calibration.nam-phai.v0.7.json";

function renderDecision(report: ReturnType<typeof runV07CalibrationEvaluation>): string {
  const lines: string[] = [
    "# Annual Axes V0.7 Decision",
    "",
    report.selectionStatus === "approved"
      ? "APPROVED FOR PRODUCTION"
      : "NO VARIANT APPROVED",
    "",
    `selectionStatus: ${report.selectionStatus}`,
    `formulaVersion: ${report.formulaVersion}`,
    `engineVersion: ${report.engineVersion}`,
    "",
    "## Selection rationale",
    ...report.selectionRationale.map((r) => `- ${r}`),
    "",
    "## Calibration",
    `- activationScale: ${report.calibration.activationScale}`,
    `- domainCenters: ${ANNUAL_AXIS_DOMAINS.map((d) => `${d}=${report.calibration.domainCenters[d]}`).join(", ")}`,
    `- domainScales: ${ANNUAL_AXIS_DOMAINS.map((d) => `${d}=${report.calibration.domainScales[d]}`).join(", ")}`,
    "",
    "## Holdout",
    `- passedAllHoldoutGates: ${report.passedAllHoldoutGates}`,
    `- globalMedian: ${report.holdoutMetrics.globalMedianScore}`,
    `- globalMean: ${report.holdoutMetrics.globalMeanScore}`,
    `- positive/negative strictLatent: ${report.holdoutMetrics.positiveStrictLatentRate} / ${report.holdoutMetrics.negativeStrictLatentRate}`,
    `- median radar range: ${report.holdoutMetrics.medianIntraYearRange}`,
    "",
  ];
  if (report.holdoutBlockers.length) {
    lines.push("## Holdout blockers");
    for (const b of report.holdoutBlockers) lines.push(`- ${b}`);
    lines.push("");
  }
  lines.push("## Product fixture");
  lines.push(
    `- scores: ${ANNUAL_AXIS_DOMAINS.map((d) => `${d}=${(report.productFixture as any)[d]}`).join(", ")}`,
  );
  lines.push(
    `- range=${report.productFixture.radarRange}, L1=${report.productFixture.l1FromV05}, min=${report.productFixture.minimum}, max=${report.productFixture.maximum}`,
  );
  lines.push(`- passesProductGates: ${report.productFixture.passesProductGates}`);
  if (report.productFixture.productBlockers.length) {
    for (const b of report.productFixture.productBlockers) lines.push(`  - ${b}`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("- Domain centers are training-only medians of spatialSignedRaw (activationGate > 0).");
  lines.push("- Score uses amplitude 44 and atanh(0.5) domain-scale target.");
  lines.push("- No React-side stretching, visualScore, or final-score offset.");
  return `${lines.join("\n")}\n`;
}

function bakeCalibration(
  report: ReturnType<typeof runV07CalibrationEvaluation>,
): AnnualAxisCalibrationV07 {
  return {
    schemaVersion: "0.7.0",
    profileId: "annual-axis-calibration-nam-phai-v0-7",
    engineVersion: "0.7.0",
    formulaVersion: "v0.7-robust-centered-annual-score",
    trainingCorpusId: report.corpusId,
    splitPolicy: {
      trainingFraction: 0.8,
      holdoutFraction: 0.2,
      splitBy: "stable-chart-id",
    },
    activationTargetMedianGate: 0.7,
    activationScale: report.calibration.activationScale,
    medianPositiveAnnualActivationRaw:
      report.calibration.medianPositiveAnnualActivationRaw,
    domainCenters: report.calibration.domainCenters as AnnualAxisCalibrationV07["domainCenters"],
    domainScales: report.calibration.domainScales as AnnualAxisCalibrationV07["domainScales"],
    q75AbsStrictLatent:
      report.calibration.q75AbsStrictLatent as AnnualAxisCalibrationV07["q75AbsStrictLatent"],
    trainingDiagnostics: report.calibration.trainingDiagnostics,
    generatedAt: report.generatedAt,
    sourceIds: ["SRC-AA-ENG-004"],
    signedLayerFactors: report.calibration.signedLayerFactors,
    selectionStatus: report.selectionStatus,
  };
}

describe.runIf(ENABLED)("annual-axes v0.7 calibration write", () => {
  it("derives calibration, evaluates holdout/product gates, writes artifacts", () => {
    resetAnnualAxesKnowledgeV07NamPhaiCache();
    const loaded = loadAnnualAxesKnowledgeV07NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const report = runV07CalibrationEvaluation(loaded.knowledge);
    const report2 = runV07CalibrationEvaluation(loaded.knowledge);
    expect(JSON.stringify(report)).toBe(JSON.stringify(report2));

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.7-calibration.json"),
      `${JSON.stringify(report.calibration, null, 2)}\n`,
    );
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.7-holdout-report.json"),
      `${JSON.stringify(
        {
          selectionStatus: report.selectionStatus,
          passedAllHoldoutGates: report.passedAllHoldoutGates,
          holdoutMetrics: report.holdoutMetrics,
          gateResults: report.gateResults,
          holdoutBlockers: report.holdoutBlockers,
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.7-product-fixture.json"),
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
          v05Baseline: {
            health: 41.9,
            family: 59.2,
            wealth: 47.5,
            career: 50,
            social: 53.7,
            romance: 58.9,
          },
          productFixture: report.productFixture,
          selectionStatus: report.selectionStatus,
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(join(OUT_DIR, "ANNUAL-AXES-V0.7-DECISION.md"), renderDecision(report));

    const baked = bakeCalibration(report);
    writeFileSync(KNOWLEDGE_CAL, `${JSON.stringify(baked, null, 2)}\n`);
    resetAnnualAxesKnowledgeV07NamPhaiCache();

    // Second bake must be byte-stable once parameters are committed.
    const reloaded = loadAnnualAxesKnowledgeV07NamPhai();
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    const again = bakeCalibration(runV07CalibrationEvaluation(reloaded.knowledge));
    expect(JSON.stringify(again)).toBe(JSON.stringify(baked));

    // Confirm knowledge file matches bake.
    const onDisk = JSON.parse(readFileSync(KNOWLEDGE_CAL, "utf8"));
    expect(onDisk.domainCenters).toEqual(baked.domainCenters);
    expect(onDisk.domainScales).toEqual(baked.domainScales);
  }, 600_000);
});
