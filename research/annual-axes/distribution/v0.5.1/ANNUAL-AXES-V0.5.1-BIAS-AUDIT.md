# Annual Axes V0.5.1 Baseline Bias Audit

auditIntegrityVersion: 2
Engine: V0.5.0 (production baseline)
Corpus: annual-axes-audit-full-v0.4
Baseline reproduced: true
Checked metrics: 51
Dimension count integrity: true

## Score distribution (global)

| Metric | Value |
|--------|------:|
| Median score | 57.10 |
| Mean score | 55.88 |
| scoreAbove50Rate | 73.3% |
| scoreBelow50Rate | 25.9% |
| scoreAtOrBelow45Rate | 15.6% |
| scoreAtOrAbove60Rate | 38.2% |

## Latent bias (training AND holdout)

| Split | positiveLatentRate | medianLatent | negativeLatentRate |
|-------|-------------------:|-------------:|-------------------:|
| Training | 73.3% | 0.1019 | 26.3% |
| Holdout | 74.2% | 0.1092 | 25.3% |

Global positive latent bias (both splits): true
Per-domain bias (both splits): health, family, career
Scale-only tightening blocked: true

## Support/pressure funnel (rawAxes stages)

| Stage | factCount | supportRaw | pressureRaw | S/P ratio |
|-------|----------:|-----------:|------------:|----------:|
| candidate | 53557 | 234126.8 | 166944.9 | 1.402 |
| eligible | 51544 | 221829.5 | 157864.6 | 1.405 |
| dedupedWinner | 41029 | 169368.9 | 120032.6 | 1.411 |
| retained | 41029 | 169368.9 | 120032.6 | 1.411 |

### Retention rates

| Metric | Support | Pressure |
|--------|--------:|---------:|
| Eligibility retention | 94.7% | 94.6% |
| Dedupe retention | 76.4% | 76.0% |
| Final retention | 72.3% | 71.9% |

pressureRelativeRetentionGap: -0.0044
pressureRetentionDiagnosis: no-material-mechanical-retention-gap

## Retained signed fact count

41029

## Diagnosis

1. Softness in spatialSigned? false
2. Latent positively biased (both splits)? true
3. Support raw mass > pressure? true (ratio 1.404)
4. Pressure disproportionately TP4C? false
5. Pressure mechanical retention gap? no-material-mechanical-retention-gap
6. Activation too weak? false
7. Calibration-only would amplify positive bias? true

### Root cause

**doctrinal-evidence-imbalance** (confidence: medium)

- Positive latent bias confirmed on both training and holdout with no material pressure retention disadvantage.
- Retained evidence still shows material support/pressure mass imbalance — consistent with doctrinal knowledge imbalance.
