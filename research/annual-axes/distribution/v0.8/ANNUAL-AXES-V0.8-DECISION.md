# Annual Axes V0.8 Decision

NO VARIANT APPROVED

selectionStatus: no-variant-approved
selectedVariant: null
formulaVersion: v0.8-direct-anchor-robust-score

## Selection rationale
- No candidate passed all hard holdout and product gates.

## Calibration
- domainCenters: health=0.3404274438410595, family=0.29551001939497534, wealth=0.1814445531104557, career=0.1814445531104557, social=0.0041835643278212075, romance=0.16930673088414006
- robustScales: health=0.4102525606057236, family=0.33435675325938347, wealth=0.40865573803174493, career=0.4376379803259447, social=0.48662468233861694, romance=0.41155212923509893
- activationScales: health=7.609818960387167, family=8.085432645411366, wealth=7.843768809875197, career=6.658591590338771, social=7.263918098551387, romance=7.263918098551387

## Candidates
### DIRECT-STRICT-16
- passedAllGates: false
- holdout median/mean: 50 / 47.72499999999996
- effectiveZ +/-: 0.31875 / 0.3819444444444444
- product: health=32.5, family=50, wealth=50, career=33.4, social=62.5, romance=47.9 range=30 L1v05=57.5 L1v07=67.5
- blockers (23):
  - positiveEffectiveZRateMin: 0.31875 vs >= 0.35
  - meanIntraYearSixAxisSdMin: 10.501353799861619 vs >= 11
  - medianIntraYearRangeMin: 26.7 vs >= 30
  - atLeastOneAtOrAbove60RateMin: 0.5416666666666666 vs >= 0.6
  - oneLowAndOneHighRateMin: 0.375 vs >= 0.55
  - exactDuplicateVectorRateMax: 0.09166666666666666 vs <= 0.01
  - nearDuplicateVectorRateMax: 0.1 vs <= 0.05
  - domainTwelveYearRangeMin_health: 4.850000000000001 vs >= 12
  - domainAdjacentDeltaMin_health: 0 vs >= 2.5
  - domainTwelveYearRangeMin_family: 8.45 vs >= 12
  - domainAdjacentDeltaMin_family: 0.20000000000000284 vs >= 2.5
  - domainPositiveEffectiveZRateMin_wealth: 0.19583333333333333 vs >= 0.25
  - domainTwelveYearRangeMin_wealth: 9.55 vs >= 12
  - domainAdjacentDeltaMin_wealth: 0.34999999999999964 vs >= 2.5
  - domainPositiveEffectiveZRateMin_career: 0.24166666666666667 vs >= 0.25
  - domainTwelveYearRangeMin_career: 9.15 vs >= 12
  - domainAdjacentDeltaMin_career: 0 vs >= 2.5
  - domainTwelveYearRangeMin_social: 4.700000000000003 vs >= 12
  - domainAdjacentDeltaMin_social: 0 vs >= 2.5
  - domainTwelveYearRangeMin_romance: 11.25 vs >= 12
  - domainAdjacentDeltaMin_romance: 0.3000000000000007 vs >= 2.5
  - product:maximum 62.5 < 65
  - product:countAtOrAbove58 1 < 2

### DIRECT-STRICT-18
- passedAllGates: false
- holdout median/mean: 50 / 47.44076388888901
- effectiveZ +/-: 0.31875 / 0.3819444444444444
- product: health=30.3, family=50, wealth=50, career=31.3, social=64.1, romance=47.6 range=33.8 L1v05=63.69999999999999 L1v07=69.3
- blockers (20):
  - positiveEffectiveZRateMin: 0.31875 vs >= 0.35
  - medianIntraYearRangeMin: 29.999999999999996 vs >= 30
  - oneLowAndOneHighRateMin: 0.44166666666666665 vs >= 0.55
  - exactDuplicateVectorRateMax: 0.09166666666666666 vs <= 0.01
  - nearDuplicateVectorRateMax: 0.1 vs <= 0.05
  - domainTwelveYearRangeMin_health: 5.450000000000003 vs >= 12
  - domainAdjacentDeltaMin_health: 0 vs >= 2.5
  - domainTwelveYearRangeMin_family: 9.45 vs >= 12
  - domainAdjacentDeltaMin_family: 0.15000000000000213 vs >= 2.5
  - domainPositiveEffectiveZRateMin_wealth: 0.19583333333333333 vs >= 0.25
  - domainTwelveYearRangeMin_wealth: 10.8 vs >= 12
  - domainAdjacentDeltaMin_wealth: 0.34999999999999787 vs >= 2.5
  - domainPositiveEffectiveZRateMin_career: 0.24166666666666667 vs >= 0.25
  - domainTwelveYearRangeMin_career: 10.25 vs >= 12
  - domainAdjacentDeltaMin_career: 0 vs >= 2.5
  - domainTwelveYearRangeMin_social: 5.299999999999997 vs >= 12
  - domainAdjacentDeltaMin_social: 0 vs >= 2.5
  - domainAdjacentDeltaMin_romance: 0.3000000000000007 vs >= 2.5
  - product:maximum 64.1 < 65
  - product:countAtOrAbove58 1 < 2

### DIRECT-STRICT-20
- passedAllGates: false
- holdout median/mean: 50 / 47.17715277777776
- effectiveZ +/-: 0.31875 / 0.3819444444444444
- product: health=28.1, family=50, wealth=50, career=29.2, social=65.7, romance=47.4 range=37.6 L1v05=69.8 L1v07=71.00000000000001
- blockers (16):
  - positiveEffectiveZRateMin: 0.31875 vs >= 0.35
  - oneLowAndOneHighRateMin: 0.4666666666666667 vs >= 0.55
  - exactDuplicateVectorRateMax: 0.09166666666666666 vs <= 0.01
  - domainTwelveYearRangeMin_health: 6.100000000000001 vs >= 12
  - domainAdjacentDeltaMin_health: 0 vs >= 2.5
  - domainTwelveYearRangeMin_family: 10.5 vs >= 12
  - domainAdjacentDeltaMin_family: 0.14999999999999858 vs >= 2.5
  - domainPositiveEffectiveZRateMin_wealth: 0.19583333333333333 vs >= 0.25
  - domainAdjacentDeltaMin_wealth: 0.40000000000000213 vs >= 2.5
  - domainPositiveEffectiveZRateMin_career: 0.24166666666666667 vs >= 0.25
  - domainTwelveYearRangeMin_career: 11.4 vs >= 12
  - domainAdjacentDeltaMin_career: 0 vs >= 2.5
  - domainTwelveYearRangeMin_social: 5.850000000000001 vs >= 12
  - domainAdjacentDeltaMin_social: 0.09999999999999432 vs >= 2.5
  - domainAdjacentDeltaMin_romance: 0.3000000000000007 vs >= 2.5
  - product:countAtOrAbove58 1 < 2

