/**
 * V0.5.1 variant evaluation writer — ANNUAL_AXES_V051_VARIANTS_WRITE=1
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAnnualAxesKnowledgeV05NamPhai } from "../../../../knowledge/annual-axes/v0.5";
import { runV051VariantEvaluation } from "../run-v051-variant-evaluation";
import { runV051ProductFixture } from "../run-v051-product-fixture";
import { runV051BiasAudit } from "../run-v051-bias-audit";

const ENABLED = process.env.ANNUAL_AXES_V051_VARIANTS_WRITE === "1";
const OUT_DIR = join(process.cwd(), "research/annual-axes/distribution/v0.5.1");

function renderDecisionMarkdown(
  evaluation: ReturnType<typeof runV051VariantEvaluation>,
  product: ReturnType<typeof runV051ProductFixture>,
  bias: ReturnType<typeof runV051BiasAudit>,
): string {
  const status =
    evaluation.selectionStatus === "approved"
      ? "APPROVED FOR RESEARCH PREVIEW"
      : "NO VARIANT APPROVED";

  return `# Annual Axes V0.5.1 Decision

auditIntegrityVersion: ${evaluation.auditIntegrityVersion}

## Status: ${status}

**Selected variant:** ${evaluation.selectedVariant ?? "null"}
**Baseline reproduced:** ${evaluation.baselineReproduction.reproduced} (${evaluation.baselineReproduction.checkedMetricCount} metrics)
**Evidence bias detected (training AND holdout):** ${evaluation.evidenceBiasDetected}

## A. Observed result

- Positive latent bias (both splits): ${bias.evidenceBiasFlags.globalPositiveLatentBias}
- Training positive latent rate: ${(bias.evidenceBiasFlags.training.positiveLatentRate * 100).toFixed(1)}%
- Holdout positive latent rate: ${(bias.evidenceBiasFlags.holdout.positiveLatentRate * 100).toFixed(1)}%
- Retained support/pressure mass ratio: ${bias.global.evidence.supportPressureRawMassRatio.toFixed(3)}
- Global score median: ${bias.global.score.median.toFixed(2)}

## B. Mechanical funnel finding

- pressureRelativeRetentionGap: ${bias.signedEvidenceFunnel.retentionRates.pressureRelativeRetentionGap.toFixed(4)}
- pressureRetentionDiagnosis: ${bias.diagnosis.pressureRetentionDiagnosis}
- Support final retention: ${(bias.signedEvidenceFunnel.retentionRates.supportFinalRetentionRate * 100).toFixed(1)}%
- Pressure final retention: ${(bias.signedEvidenceFunnel.retentionRates.pressureFinalRetentionRate * 100).toFixed(1)}%

## C. Root-cause inference

**${bias.diagnosis.rootCauseLabel}** (confidence: ${bias.diagnosis.rootCauseConfidence})

${bias.diagnosis.rootCauseNotes.map((n) => `- ${n}`).join("\n")}

## Candidate summary (generated)

${evaluation.candidates
  .map(
    (c) =>
      `- **${c.candidateId}**: activationScale=${c.calibration.activationScale.toFixed(6)}, passedAllGates=${c.passedAllGates}, blockers=${c.blockers.length}, globalMedian=${c.holdoutMetrics.globalMedianScore?.toFixed(2)}, allSixAbove50=${((c.holdoutMetrics.allSixAbove50Rate ?? 0) * 100).toFixed(1)}%`,
  )
  .join("\n")}

## Product fixture (1991-09-21 / 2026)

Production V0.5.0: ${JSON.stringify(product.productionV050.scores)}
Range: ${product.productionV050.range?.toFixed(1)}, above50: ${product.productionV050.countAbove50}

## V0.5.1 routing

${evaluation.selectionStatus === "approved" ? "V0.5.1 research routing implemented behind default-OFF flag." : "No V0.5.1 analyzer — audit artifacts only."}

## Prohibited post-processing

No UI stretching, per-chart centering, global pressure multipliers, or score
post-processing were applied. All scores derive from the V0.5 evidence pipeline.
`;
}

describe.runIf(ENABLED)("annual-axes v0.5.1 variant evaluation write", () => {
  it("writes variant evaluation and product fixture artifacts", () => {
    const loaded = loadAnnualAxesKnowledgeV05NamPhai();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const bias = runV051BiasAudit(loaded.knowledge);
    const evaluation = runV051VariantEvaluation(loaded.knowledge);
    expect(evaluation.baselineReproduction.reproduced).toBe(true);
    expect(evaluation.auditIntegrityVersion).toBe(2);

    const product = runV051ProductFixture(
      loaded.knowledge,
      evaluation.selectedVariant,
    );

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.5.1-variant-evaluation.json"),
      `${JSON.stringify(evaluation, null, 2)}\n`,
    );
    writeFileSync(
      join(OUT_DIR, "annual-axes-v0.5.1-product-fixture.json"),
      `${JSON.stringify(product, null, 2)}\n`,
    );
    writeFileSync(
      join(OUT_DIR, "ANNUAL-AXES-V0.5.1-DECISION.md"),
      renderDecisionMarkdown(evaluation, product, bias),
    );
  }, 900_000);
});
