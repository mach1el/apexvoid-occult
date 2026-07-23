# Monthly Flow V0.1 production UI

Integration release publishing the existing Monthly Flow V0.1 engine.

Pipeline:

```
ChartData → Calculation Core provider → school-aware annual-domain adapter
→ analyzeMonthlyFlow → 12-month UI timeline → selected-month six-axis detail
```

Scripts: `research:monthly-flow-v01:*`

Decision: see `V0.1-PRODUCTION-DECISION.md` (`PROMOTE_MONTHLY_FLOW_V01_TO_PRODUCTION`).
