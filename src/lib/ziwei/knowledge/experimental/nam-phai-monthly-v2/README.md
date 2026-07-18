# Nam Phái monthly scoring v2 (experimental)

Status: **experimental**. Default production profile remains `legacy-v1`.

## Data

| File | Role |
|------|------|
| `scoring-profile-v2.json` | Geometry, multipliers, minor caps, soft-sat scales, ĐV context |
| `frame-pattern-rules.json` | Declarative frame / same-star / monthly-context rules |
| `regression-cases.json` | One reference chart + soft calibration bands (v0.1.2) |
| `sources.json` | Concept provenance only — numeric weights are not classical constants |

## Opt-in

```ts
getLuuNienTrend(chart, {
  school: "nam-phai",
  birthInput,
  scoringProfile: "nam-phai-monthly-v2-experimental",
});
```

## Calibration bands (v0.1.2)

`preferred` ranges are **non-blocking expert audit bands**.

They are human-audit targets for one reference chart — **not** classical truth and **not** hard acceptance criteria for the whole system.

Do **not** retune seed weights to fit every preferred band on a single chart (overfit risk).

| Field | CI behavior |
|-------|-------------|
| `preferred` | Report / table only — never fails CI alone |
| `hardMin` / `hardMax` / `atLeastLegacy` | Honors `severity`: `report` \| `warning` \| `error` |

Hard floors for high-signal months (aligned to **honest measured** output under seed 0.1.0 — not aspirational 70/60):

| Target pattern | `activation.hardMin` | `conflict.hardMin` | `risk` |
|----------------|----------------------|--------------------|--------|
| Same-star Quyền–Kỵ | 40 | 25 | `atLeastLegacy` error |
| ĐV reactivate + SPT | 60 | 15 | `atLeastLegacy` error |

Preferred bands (e.g. act 80–90) remain report-only.

## Seed policy

Retune seeds in this profile only for **global** defects (e.g. normalization scale saturates most charts, caps not applied, an axis has no score path, monotonicity broken). Never retune for one regression month missing a preferred band.

## Invariants

- Legacy output unchanged when experimental profile is not selected
- No chart/month/palace hard-coding in the scorer
- Benefit and risk independent; no whole-column multipliers
- No fake normalization `ScoreLine`; raw + normalized exposed
- `cat === normalized.benefit`, `hung === normalized.risk`
