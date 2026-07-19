# Huyền Khí Reverse-Spec Research V0.1

Research-only program to build a provenance-first reverse-spec for **Huyền
Khí** — a palace-level qi-strength concept on a public Tử Vi site, distinct
from `Xí Hoa`, `Đẩu Minh` and `Cung Khí` (never alias these four).

This is **not** a production scoring engine. There is no
`src/lib/ziwei/analysis/modules/huyen-khi/`, no UI, no public API. See
`docs/PROMPT-HUYEN-KHI-REVERSE-SPEC-V0.1.md` for the full mission and
`../../src/lib/ziwei/research/huyen-khi/` for the TypeScript tooling
(kept under `src/` — not here — so `npm run typecheck`/`build` cover it;
this directory holds only data/reports, matching the existing
`research/annual-axes/` convention).

## What's here

- `v0.1/*.json`, `v0.1/schemas/`, `v0.1/docs/` — the supplied data pack:
  source/claim registries, terminology matrix, 18 manually-transcribed
  public samples (+ CSV), extraction contract, hypothesis ledger, corpus
  plan, quality gates.
- `v0.1/reports/` — generated output (not hand-authored) from
  `npm run research:huyen-khi:build-facts` / `:analyze`.

## Key result (verified, not just quoted)

All 18/18 seed records satisfy `displayedTotal === sum(twelve palace
scores)` after treating unlisted palaces as zero. 170/207 (82.1%) nonzero
palace values sit on a 0.25 grid — this supports, but does not prove, a
"coarse base + fine residual" hypothesis (HYP-HK-002).

## Important limitation found during V0.1 (not anticipated by the prompt)

The 18 seed titles give a lunar **year stem-branch** (e.g. "Giáp Tuất"), not
an absolute year — and a stem-branch pair repeats every 60 years. All 18
seed records are therefore lunar-year **ambiguous** in the checked
1900–2026 window; V0.1 does not guess a year, so none of the 18 seeds has
a resolved `HuyenKhiChartFactSnapshot` yet. This blocks any chart-structure
feature analysis (Cục, star placement, Tuần/Triệt, Tứ Hóa) until further
records carry (or an operator confirms) an absolute birth year.

See `limitations.md` for the full list of what's proven vs. hypothesis vs.
unresolved, and `docs/RESEARCH-MEMO.md` for the original research memo.

## V0.2 — absolute-date gold corpus (real, rate-limited data collection)

`v0.2/` adds thầy-approved, rate-limited (1 req/20s) live collection —
the first pass in this program with real network access. Key results:

- Recovered **HK-PUB-002**'s absolute date (1997-02-01, hour Dần) via
  live calendar-page cross-matching, double-verified — this program's
  **first non-null chart-fact snapshot**.
- Discovered a hard blocker: detail/result pages render via client-side
  JS that `WebFetch` cannot execute, so full 12-palace data cannot be
  collected for *new* records — the 60-gold-record target is not
  reachable this way. See `v0.2/source-access-review.md` and
  `limitations.md` for the full findings (including a real ~1-day lunar
  calendar edge case near month boundaries).

## Ethics boundary

V0.1 performed no automated collection. V0.2 performs a small, explicitly
approved, rate-limited amount (see `v0.2/source-access-review.md` and
`v0.2/source-access-policy.v0.2.json`). Production runtime never depends
on the source site in either phase. See `v0.1/extraction-contract.v0.1.json`.
