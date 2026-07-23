# Monthly Flow Calculation Core provider policy

- `createMonthlyCalculationProvider(school)` maps only tuHoaTargets + stemBranchForLunarMonth
- Provider school must equal requested school
- Missing engine → unavailable (no cross-school fallback)
- Never expose or call locTonIndex
