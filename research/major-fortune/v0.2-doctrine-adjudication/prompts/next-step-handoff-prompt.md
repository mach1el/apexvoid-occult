# Handoff — after Major Fortune V0.2 doctrine adjudication

## Decision

`RESEARCH_INCOMPLETE` on base `39cb5bfc`.

No authorized candidate shape. Numeric candidates were **not** evaluated.

## Governance correction (do not regress)

Do **not** require classical sources to contain literal numeric values such as `+10` or `-15`.

Use three layers:

1. **Doctrinal evidence** — existence, scope, polarity, facts, mutex, stacking, exceptions (requires exact locators for verified doctrine).
2. **Engineering parameterization** — candidate ranges, ordering, sign, pillar budgets (no final rawDelta selection in doctrine PR).
3. **Empirical evaluation** — train/holdout/product/sensitivity (later PR only).

Intake (`SRC-MF-V02-INTAKE-001`) remains non-classical.

## Do not

- Publish UI or change `getAnalysisStatus` (must stay `rebuilding`)
- Alter V0.1 output
- Invent or select final rawDelta
- Fabricate Nam Phái MF transformations
- Use annual/monthly facts in decade score
- Tune on holdout/product fixtures in a doctrine PR

## Required before READY_FOR_V0_2_CANDIDATE

1. Layer-1 locators (or explicit human-approved governance bar) authorizing existence, scope, and polarity for every **included** rule family
2. Freeze at least one `authorizationStatus: "authorized"` candidate shape with Layer-2 envelopes (still no final rawDelta until evaluation PR selects among candidates)
3. Keep unresolved families explicitly excluded or blocked
4. Nam Phái XF remains Core-blocked / excluded — readiness must not require it
5. Thái Tuế remains excluded unless decade-stable ring is proven annualYear-independent
6. V0.1 frozen control equivalent; production routing unchanged

## Entry points

- Doctrine pack: `research/major-fortune/v0.2-doctrine-adjudication/`
- Scripts: `npm run research:major-fortune-v02-doctrine:*`
- Foundation (historical): `research/major-fortune/v0.2-foundation/`
- Runtime knowledge (still non-executable): `src/lib/ziwei/analysis/knowledge/major-fortune-scoring/v0.2/`
