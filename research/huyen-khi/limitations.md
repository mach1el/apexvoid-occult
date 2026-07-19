# Huyền Khí Reverse-Spec — Limitations (V0.1 + V0.2)

## V0.2 update — the absolute-date blocker is only partly resolved

thầy approved `limited-automation-approved` (1 request/20s, per the site's
own `Crawl-delay: 20`) after reviewing `robots.txt` and the publisher's
stated anti-imitation stance (see `v0.2/source-access-review.md`).

**Real, live findings this pass:**

- **Calendar day pages** (`lich-la-so-tu-vi-ngay-D-M-YYYY.html`) render
  server-side and expose real data: lunar date + per-hour Mệnh score +
  whole-chart total (not the other 11 palace scores). Two were captured
  live: `research/huyen-khi/v0.2/calendar-day-1969-04-08.json` (full
  12-hour panel, male only) and `calendar-day-1997-02-01.json` (hour Dần,
  double-verified).
- **Detail/result pages** — including both the pattern behind all 18
  V0.1 seeds (`la-so-tu-vi-*-lid-*.html`) and the calendar page's own
  linked detail URLs — render via **client-side JavaScript/AJAX**.
  `WebFetch` cannot execute JavaScript, so every live fetch of a detail
  page returned only a loading interstitial with zero computed numbers
  in the underlying HTML (confirmed by explicitly asking for any number
  near any palace-name token — none were present). **This is a hard
  technical blocker**: full twelve-palace data for *new* records cannot
  be collected with the tools available to this program. The V0.1 seed
  set was almost certainly transcribed by a human viewing these pages in
  a real browser, not by any kind of static fetch.
- **Consequence for the 60-gold-record target**: not reachable this way.
  V0.2's real, achievable contribution instead is **recovering absolute
  dates for the existing 18 V0.1 records** (which already have
  human-transcribed palace data) via calendar-page cross-matching — not
  collecting 60 new ones from scratch.
- **One V0.1 record recovered**: HK-PUB-002 → **1997-02-01, hour Dần,
  Dương Nam** — confirmed via three independent numeric fields (lunar
  month/day, Mệnh score 0.25, whole-chart total 7.09) agreeing exactly
  across two independent `WebFetch` calls. This produced this research
  program's **first non-null `HuyenKhiChartFactSnapshot`**
  (`build-chart-fact-snapshot-v02.test.ts`). 16 of the other 17 records
  were not attempted this pass (fetch-budget/session-time, not a
  technical blocker) — `recover-v01-dates.ts` is reusable for them.
- **HK-PUB-001 checked, not recovered**: the 1994-05-20 candidate's live
  calendar page showed a lunar day off by one from the engine's
  prediction (10 vs. 11) and only exposed the male row (record is
  female) — a genuine mismatch, not a bug being papered over.
- **Real edge case found**: this Calculation Core's `solarToLunar` agreed
  exactly with the site's own calendar for 1969-04-08, but differed by
  one day for 1994-05-20 — likely a new-moon-boundary edge case. **Any**
  date resolved via `resolveSolarDateForLunar` must be cross-verified
  against the site's own calendar before being trusted; it is not
  self-certifying even when "unique".
- **"Machine-diff-verified" ≠ "gold"**: the spec's blind double-entry
  workflow assumes two independent *humans*. This program is one process;
  its adaptation — two independent `WebFetch` passes, diffed, agreeing
  exactly — genuinely catches transcription/extraction errors (including
  the summarizer's own mistakes) but is a weaker guarantee than human
  double-entry. `gold-workflow.ts`'s `resolveVerificationTier()` never
  labels an automated second entry `"gold"` — only a real second human
  entry (e.g. `secondEntryBy: "thay-..."`) can earn that tier.
- Model 0/1A/1B, the full 5-date×12-hour panel grid, and the full 60-gold
  corpus remain **correctly withheld** — the spec's own gates require the
  60-record corpus first, which was not reached.

## V0.1 (original)

## Proven (verified by tests, not just asserted)

- The additive output contract: 18/18 seed records' displayed whole-chart
  total equals the sum of twelve palace scores, after omitted palaces are
  inferred zero only where that inference validates exactly at two
  decimals (`validate-public-record.ts`, `validate-seed.test.ts`).
- The `displayTitle` free-text format parses deterministically into
  structured birth facts (yin/yang, gender, year stem/branch, lunar
  month/day, hour branch) for all 18 seeds (`parse-public-summary.ts`).
- The score alphabet: 170/207 (82.1%) nonzero palace values are exact
  multiples of 0.25; the tool reproduces the pack's own
  `sample-validation-report.v0.1.json` numbers exactly.

## Hypothesis (testable, not established)

- HYP-HK-002: palace scores = coarse quarter-step base + fine residual
  modifier. Supported by the score-alphabet distribution, not proven.
- HYP-HK-003 / HYP-HK-004: Mệnh/Cục/branch set the coarse base; Tuần/Triệt
  and Tứ Hóa produce the residual. **Untested in V0.1** — testing requires
  resolved chart-fact snapshots, which no seed record has yet (see below).

## Unresolved / explicitly rejected

- HYP-HK-005 (Đẩu Minh or Xí Hoa can stand in for Huyền Khí) — rejected,
  no public source establishes equivalence.
- HYP-HK-006 (a generic support-minus-pressure star sum is Huyền Khí) —
  rejected, already failed Annual Axes calibration and doesn't match the
  published conceptual definition.
- The hidden palace-score formula itself — completely unknown. The
  additive-total contract is an output inference, not the formula.
- Rounding/limit rules, and Nạp Âm naming (`stemBranchNapAm` is `null` in
  every fact snapshot — only a private element helper exists in the
  Calculation Core, not an exported 60-entry Nạp Âm name table).

## The lunar-year ambiguity (found during V0.1, not anticipated by the prompt)

All 18 seed titles give a lunar year as a **stem-branch pair** (e.g. "Giáp
Tuất"), never an absolute year. A stem-branch pair repeats every 60 years,
so within a plausible 1900–2026 window there are 2–3 candidate absolute
years per record, and the site gives no way to disambiguate them from the
title text alone. `resolve-solar-date.ts` brute-force-searches every
candidate year (using the Calculation Core's own `solarToLunar` as an
oracle) and reports `"ambiguous"` rather than guessing — **all 18 seed
records currently resolve as ambiguous**, so V0.1 has **zero** resolved
`HuyenKhiChartFactSnapshot`s. This means:

- Corpus Phase B/C stratification by Cục/major-star-configuration/VCD/
  Tuần-Triệt/Tứ Hóa is not yet possible on the seed set.
- Matched-pair analysis in V0.1 only compares parsed birth-title facts
  (yin/yang, gender, year stem/branch, lunar month/day, hour branch) — it
  found 0 pairs differing in exactly one fact at N=18 (honestly reported,
  not padded).
- Model 1 (the prompt's coarse lookup baseline: palace + Cục + Mệnh branch
  + major-star config + brightness) could not be built as specified;
  `baseline-models.ts` ships a documented placeholder that is numerically
  identical to Model 0 until real resolved charts exist.

Resolving this needs either an operator-confirmed absolute year per
record (a future `import-manual-record.ts` field), or additional real
public records that happen to state an absolute year.

## Explicitly deferred (not attempted, not faked)

- Live collection against the source site — the ethics contract requires
  checking robots.txt/terms and enforcing a 6 req/min cap before any
  automation; V0.1 does not perform any network access.
- Corpus Phase A completion (need 42 more real charts), Phase B (240),
  Phase C (2000), Phase D (200 expert-reviewed) — `build-controlled-corpus.ts`
  reports the current-vs-target gap; it never fabricates records.
- Model 2 (explainable additive rules), Model 3 (bounded interactions),
  Model 4 (symbolic hypothesis search) — need far more than 18 records.
- A held-out `HuyenKhiEvaluationReport` against the quality gates in
  `quality-gates.v0.1.json` — not meaningful at N=18; only in-sample
  descriptive baselines are reported, clearly labeled as such.

## Anti-fabrication statement

Nothing in this pack claims to reproduce the source site's proprietary
formula. All numeric findings are labeled "ApexVoid Huyền Khí Reverse-Spec"
— explicit, versioned, experimental engineering hypotheses requiring much
larger held-out benchmarks and expert review before any production use.
