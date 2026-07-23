# Major Fortune V0.3 Evidence Adapter Audit

Research-only ChartData → `MajorFortuneOrdinalEvidence` adapter audit.

## Pipeline

```text
ChartData
→ resolved Major Fortune context
→ normalized evidence
→ evaluateMajorFortuneOrdinal(...)
→ adapter/corpus audit reports
```

## Commands

```bash
npm run research:major-fortune-v03-adapter:validate
npm run research:major-fortune-v03-adapter:audit
npm run research:major-fortune-v03-adapter:report
npm run research:major-fortune-v03-adapter:decision
```

## Decision

See `V0.3-ADAPTER-AUDIT-DECISION.md` — currently **`EVIDENCE_ADAPTER_READY_FOR_CANDIDATE_EVALUATION`**.
