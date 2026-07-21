# Annual Axes V0.5.1 Decision

auditIntegrityVersion: 2

## Status: NO VARIANT APPROVED

**Selected variant:** null
**Baseline reproduced:** true (51 metrics)
**Evidence bias detected (training AND holdout):** true

## A. Observed result

- Positive latent bias (both splits): true
- Training positive latent rate: 73.3%
- Holdout positive latent rate: 74.2%
- Retained support/pressure mass ratio: 1.404
- Global score median: 57.10

## B. Mechanical funnel finding

- pressureRelativeRetentionGap: -0.0044
- pressureRetentionDiagnosis: no-material-mechanical-retention-gap
- Support final retention: 72.3%
- Pressure final retention: 71.9%

## C. Root-cause inference

**doctrinal-evidence-imbalance** (confidence: medium)

- Positive latent bias confirmed on both training and holdout with no material pressure retention disadvantage.
- Retained evidence still shows material support/pressure mass imbalance — consistent with doctrinal knowledge imbalance.

## Candidate summary (generated)

- **BASELINE-V05**: activationScale=12.089302, passedAllGates=false, blockers=13, globalMedian=57.95, allSixAbove50=17.9%
- **STRICT-SCALE**: activationScale=12.089302, passedAllGates=false, blockers=14, globalMedian=60.45, allSixAbove50=17.9%
- **STRICT-BALANCED**: activationScale=10.029992, passedAllGates=false, blockers=14, globalMedian=60.00, allSixAbove50=17.9%
- **STRICT-ACTIVATION**: activationScale=9.543911, passedAllGates=false, blockers=14, globalMedian=60.70, allSixAbove50=17.9%

## Product fixture (1991-09-21 / 2026)

Production V0.5.0: {"health":41.9,"family":59.2,"wealth":47.5,"career":50,"social":53.7,"romance":58.9}
Range: 17.3, above50: 3

## V0.5.1 routing

No V0.5.1 analyzer — audit artifacts only.

## Prohibited post-processing

No UI stretching, per-chart centering, global pressure multipliers, or score
post-processing were applied. All scores derive from the V0.5 evidence pipeline.
