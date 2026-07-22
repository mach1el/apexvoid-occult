# Annual Axes distribution research

Engineering audit outputs and V0.8 regression fixtures for Annual Axes.

## Production status

- **Nam Phái production**: V0.8 only (`v0.8-annual-palace-weighted-score`)
- **Trung Châu**: isolated V0.2 path
- **No rollback chain** to deleted pre-V0.8 Nam Phái engines
- Distribution gates are **advisory**
- Numeric model constants are **engineering policy**, not classical doctrine

## Active V0.8 artifacts

```text
v0.8/ANNUAL-AXES-V0.8-DECISION.md
v0.8/annual-axes-v0.8-holdout-scores.json
v0.8/annual-axes-v0.8-ui-proof.json
v0.8/annual-axes-v0.8-product-fixture.json
corpus-contract.json
```

Pre-V0.8 research dumps (v0.4 / v0.5 / v0.7 / candidate reports) are deleted.

## Commands

```bash
npm run test:annual-axes-distribution:fast
npm run test:annual-axes-v08
npm run test:annual-axes-v08-holdout
npm run test:annual-axes-v08-ui
npm run generate:annual-axes-v08-fixtures   # ANNUAL_AXES_V08_GENERATE_FIXTURES=1
npm run audit:annual-axes-distribution     # advisory full audit writer
```

Do not commit thousands of raw chart payloads.
