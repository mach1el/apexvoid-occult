# Huyền Khí V0.2 — Source Access Review

- **Review date**: 2026-07-19
- **Reviewer**: thầy (repository owner), decision recorded live in chat; robots.txt/technical facts gathered by Claude (Sonnet 5) via the `WebFetch` tool.

## robots.txt result

Fetched `https://tuvi.cohoc.net/robots.txt` directly (2026-07-19). Findings:

- No blanket `Disallow: /` for a generic/unnamed user agent.
- Explicitly disallows dozens of named scraper/downloader tools (AhrefsBot,
  SemrushBot variants, MJ12bot, Screaming Frog SEO Spider, Wget, HTTrack,
  WebCopier, FlashGet, and 100+ others) plus several search-engine crawlers
  (Yandex, amazonbot, PetalBot, bytespider).
- `Disallow: /bin/`, `/control/`, `/cache/`, `gss.xsl` for general agents —
  none of these overlap with calendar or detail pages.
- **`Crawl-delay: 20`** for general agents (i.e. ≤3 requests/minute) —
  stricter than this program's own suggested 6/minute cap.
- `Sitemap: https://tuvi.cohoc.net/sitemap.xml`.

## Terms-of-use result

No separate machine-readable terms file found. The site's own public
articles (`SRC-HK-COHOC-CONCEPT-001`, `SRC-HK-COHOC-USAGE-001`, already in
`research/huyen-khi/v0.1/source-registry.v0.1.json`) explicitly state the
underlying Huyền Khí theory is not fully public and warn that imitation
scores may be inaccurate — a stated preference against reverse-engineering,
even though robots.txt does not technically disallow reading individual
pages.

## Decision

```json
"sourceAccessDecision": "limited-automation-approved"
```

Approved by thầy with a **stricter-than-suggested** policy, given the
robots.txt crawl-delay and the publisher's explicit anti-imitation stance:

- Rate limit: **1 request per 20 seconds**, matching `Crawl-delay: 20`
  exactly (not the program's own looser 6/minute).
- Concurrency: **1** (no parallel requests).
- Stop immediately on: HTTP 403, HTTP 429, CAPTCHA page, "robot processing"
  interstitial, or any explicit block/warning page.
- Cache every fetched page's extracted facts (not raw HTML) under
  `research/huyen-khi/v0.2/cache/` so no page is re-fetched needlessly.
- Store numeric facts and minimal identifying metadata only — no long
  interpretive prose copied (unchanged from V0.1 policy).
- No runtime dependency on the source site anywhere in production code
  (unchanged, enforced by source-scan tests).

## Honest limitation: user-agent identity

Fetches in this phase were made through Claude Code's `WebFetch` tool,
which controls its own HTTP client and user-agent string — this program
does not control or see the literal request headers sent. This is
disclosed rather than hidden: a fully compliant researcher client would
self-identify explicitly in its User-Agent, which this tool does not
expose configuration for. Future automation (if any) that runs outside
this chat tool should set an honest, descriptive User-Agent explicitly.

## Critical technical finding: detail pages require client-side rendering

Live-fetching `la-so-tu-vi-*-lid-*.html` (the URL pattern behind all 18
V0.1 seed records) and the calendar page's own linked detail URLs
(`la-so-tu-vi-nam-phai.html?d=...&m=...&y=...&h=...&s=...&TokenID=...`)
both returned **only a client-side loading interstitial** ("Hệ thống đang
thực hiện xử lý nghiệp vụ") with no computed numbers anywhere in the
fetched HTML — confirmed by re-fetching and asking explicitly for raw
numeric content near every palace-name token. `WebFetch` does not execute
JavaScript, so it cannot wait out whatever client-side calculation or
AJAX round-trip populates these pages with real chart data.

**Consequence**: full twelve-palace `HuyenKhiPublicOutputRecordV02` data
for *new* records cannot be collected via this program's available tools
in V0.2 — only a human loading these pages in a real browser (as was
almost certainly done to build the V0.1 seed set) can currently do that.
This is why V0.2's real, achievable contribution this pass is **recovering
absolute dates for the existing 18 V0.1 records** (which already have
human-transcribed palace data — they just need a confirmed date) rather
than collecting 60 brand-new gold records. See `reports/v01-date-recovery-report.json`
and `limitations.md`.

By contrast, the **calendar day pages**
(`lich-la-so-tu-vi-ngay-D-M-YYYY.html`) render server-side and *do* expose
real numeric data directly: lunar date, and per-hour Mệnh Huyền Khí +
whole-chart Huyền Khí total (but not the other eleven palace scores).
These were used successfully both to capture a real controlled-hour
panel and to recover one V0.1 record's date (see below).

## Critical technical finding: lunar-date edge case near month boundaries

Cross-checking this Calculation Core's `solarToLunar` against the site's
own calendar page:

- **1969-04-08**: engine says lunar 22/2/1969 (Kỷ Dậu) — site's calendar
  page says the same, exactly. ✅
- **1994-05-20**: engine says lunar 11/4/1994 — site's calendar page says
  lunar **10**/4/1994, one day earlier. ⚠️

This is not a systematic offset (it agreed exactly on the first date) —
most likely a new-moon-boundary edge case where sub-hour differences in
astronomical new-moon timing tip the lunar-day count by one for dates near
a lunar month transition. **Any date resolved via `resolveSolarDateForLunar`
must be cross-verified against the site's own calendar page before being
trusted** — this is now enforced by `recover-v01-dates.ts` (it only
accepts a candidate when the live calendar page's own stated lunar
month/day matches, not just the engine's forward computation).
