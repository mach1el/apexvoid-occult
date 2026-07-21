/**
 * V0.5.1 bias audit writer — ANNUAL_AXES_V051_BIAS_WRITE=1
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAnnualAxesKnowledgeV05NamPhai } from "../../../../knowledge/annual-axes/v0.5";
import { runV051BiasAudit } from "../run-v051-bias-audit";

const ENABLED = process.env.ANNUAL_AXES_V051_BIAS_WRITE === "1";
const OUT_DIR = join(process.cwd(), "research/annual-axes/distribution/v0.5.1");

function renderBiasMarkdown(report: ReturnType<typeof runV051BiasAudit>): string {
  const g = report.global;
  const f = report.signedEvidenceFunnel;
  const bias = report.evidenceBiasFlags;
  return `# Annual Axes V0.5.1 Baseline Bias Audit

auditIntegrityVersion: ${report.auditIntegrityVersion}
Engine: V0.5.0 (production baseline)
Corpus: ${report.corpusId}
Baseline reproduced: ${report.baselineReproduction.reproduced}
Checked metrics: ${report.baselineReproduction.checkedMetricCount}
Dimension count integrity: ${report.dimensionCountIntegrity.ok}

## Score distribution (global)

| Metric | Value |
|--------|------:|
| Median score | ${g.score.median.toFixed(2)} |
| Mean score | ${g.score.mean.toFixed(2)} |
| scoreAbove50Rate | ${(g.score.scoreAbove50Rate * 100).toFixed(1)}% |
| scoreBelow50Rate | ${(g.score.scoreBelow50Rate * 100).toFixed(1)}% |
| scoreAtOrBelow45Rate | ${(g.score.scoreAtOrBelow45Rate * 100).toFixed(1)}% |
| scoreAtOrAbove60Rate | ${(g.score.scoreAtOrAbove60Rate * 100).toFixed(1)}% |

## Latent bias (training AND holdout)

| Split | positiveLatentRate | medianLatent | negativeLatentRate |
|-------|-------------------:|-------------:|-------------------:|
| Training | ${(bias.training.positiveLatentRate * 100).toFixed(1)}% | ${bias.training.medianLatent.toFixed(4)} | ${(bias.training.negativeLatentRate * 100).toFixed(1)}% |
| Holdout | ${(bias.holdout.positiveLatentRate * 100).toFixed(1)}% | ${bias.holdout.medianLatent.toFixed(4)} | ${(bias.holdout.negativeLatentRate * 100).toFixed(1)}% |

Global positive latent bias (both splits): ${bias.globalPositiveLatentBias}
Per-domain bias (both splits): ${bias.perDomainPositiveLatentBiasDomains.join(", ") || "none"}
Scale-only tightening blocked: ${bias.scaleOnlyTighteningBlocked}

## Support/pressure funnel (rawAxes stages)

| Stage | factCount | supportRaw | pressureRaw | S/P ratio |
|-------|----------:|-----------:|------------:|----------:|
| candidate | ${f.candidate.factCount} | ${f.candidate.supportRaw.toFixed(1)} | ${f.candidate.pressureRaw.toFixed(1)} | ${f.candidate.supportPressureMassRatio.toFixed(3)} |
| eligible | ${f.eligible.factCount} | ${f.eligible.supportRaw.toFixed(1)} | ${f.eligible.pressureRaw.toFixed(1)} | ${f.eligible.supportPressureMassRatio.toFixed(3)} |
| dedupedWinner | ${f.dedupedWinner.factCount} | ${f.dedupedWinner.supportRaw.toFixed(1)} | ${f.dedupedWinner.pressureRaw.toFixed(1)} | ${f.dedupedWinner.supportPressureMassRatio.toFixed(3)} |
| retained | ${f.retained.factCount} | ${f.retained.supportRaw.toFixed(1)} | ${f.retained.pressureRaw.toFixed(1)} | ${f.retained.supportPressureMassRatio.toFixed(3)} |

### Retention rates

| Metric | Support | Pressure |
|--------|--------:|---------:|
| Eligibility retention | ${(f.retentionRates.supportEligibilityRetentionRate * 100).toFixed(1)}% | ${(f.retentionRates.pressureEligibilityRetentionRate * 100).toFixed(1)}% |
| Dedupe retention | ${(f.retentionRates.supportDedupeRetentionRate * 100).toFixed(1)}% | ${(f.retentionRates.pressureDedupeRetentionRate * 100).toFixed(1)}% |
| Final retention | ${(f.retentionRates.supportFinalRetentionRate * 100).toFixed(1)}% | ${(f.retentionRates.pressureFinalRetentionRate * 100).toFixed(1)}% |

pressureRelativeRetentionGap: ${f.retentionRates.pressureRelativeRetentionGap.toFixed(4)}
pressureRetentionDiagnosis: ${report.diagnosis.pressureRetentionDiagnosis}

## Retained signed fact count

${g.evidence.retainedSignedFactCount}

## Diagnosis

1. Softness in spatialSigned? ${report.diagnosis.softnessInSpatialSigned}
2. Latent positively biased (both splits)? ${report.diagnosis.latentPositivelyBiased}
3. Support raw mass > pressure? ${report.diagnosis.supportLargerThanPressure} (ratio ${g.evidence.supportPressureRawMassRatio.toFixed(3)})
4. Pressure disproportionately TP4C? ${report.diagnosis.pressureDisproportionatelyTp4c}
5. Pressure mechanical retention gap? ${report.diagnosis.pressureRetentionDiagnosis}
6. Activation too weak? ${report.diagnosis.activationTooWeak}
7. Calibration-only would amplify positive bias? ${report.diagnosis.calibrationWouldAmplifyPositiveBias}

### Root cause

**${report.diagnosis.rootCauseLabel}** (confidence: ${report.diagnosis.rootCauseConfidence})

${report.diagnosis.rootCauseNotes.map((n) => `- ${n}`).join("\n")}
`;
}

describe.runIf(ENABLED)("annual-axes v0.5.1 bias audit write", () => {
  it("writes baseline bias audit artifacts", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const report = runV051BiasAudit(loaded.knowledge);
    expect(report.baselineReproduction.reproduced).toBe(true);
    expect(report.dimensionCountIntegrity.ok).toBe(true);
    expect(report.auditIntegrityVersion).toBe(2);

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.5.1-baseline-bias-audit.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    writeFileSync(
      join(OUT_DIR, "ANNUAL-AXES-V0.5.1-BIAS-AUDIT.md"),
      renderBiasMarkdown(report),
    );
  }, 900_000);
});
