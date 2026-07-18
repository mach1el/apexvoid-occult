# Current Implementation Inventory

This document maps all existing code related to Đại Vận (Major Fortune) on the current branch (`research/major-fortune-pack`).

## 1. `src/lib/ziwei/engine-nam-phai.ts` & `src/lib/ziwei/engine-trung-chau.ts`
- **Responsibility:** Calculates the `majorFortune` (Đại Vận) properties for each palace and identifies the active `majorFortunePalace` based on `nominalAge`. Also calculates `luuNienDaiVanIndex` (Lưu Niên Đại Vận) for the given year.
- **Inputs:** `palaces` array, `menhIndex`, `cucNumber`, `directionSign` (derived from yin/yang of year stem and gender), `nominalAge`.
- **Outputs:** Mutates `palaces` to add `majorFortune: { order, start, end, active }`. Returns the `activePalace`.
- **Calculation Rules Found:**
  - `start = cucNumber + order * 10; end = start + 9; active = age >= start && age <= end;`
  - `directionSign` uses Yang Male / Yin Female (forward), Yin Male / Yang Female (reverse).
- **Implicit Assumptions:** Modulo 12 palace movement. Uses fixed +10 decade increments. Relies on `nominalAge` instead of precise birthdate boundaries.
- **School-dependent Behavior:** Currently, both engines share essentially identical mathematical logic for assigning major fortune decades. 
- **Provenance Status:** Classical Nam Phái / Trung Châu.
- **Test Coverage:** Tested indirectly via `golden.test.ts` and `chart.test.ts`.
- **Risks:** 
  - **Mutation:** The `assignMajorFortunes` function directly mutates natal palace objects in both engines, which violates layer isolation.
  - `luuNienDaiVanIndex` relies on a legacy interpretation of zigzag movement, though it appears decoupled from the core T1 start.
- **Recommended Disposition:** Extract into pure `major-fortune` module. Separate the mutation of `palaces` from the calculation of the active cycle. Mark as `accepted-calculation` but needing refactoring.
- **Rule Classification:** `accepted-calculation` (for basic decades), `school-dependent` (for Tứ Hóa and LNDV).

## 2. `src/lib/ziwei/annual-flow.ts`
- **Responsibility:** Contains logic for `getAnnualMajorFortuneIndex` (Lưu Niên Đại Vận).
- **Inputs:** `majorFortuneIndex`, `majorFortuneStartAge`, `nominalAge`, `direction`.
- **Outputs:** Returns a `number` representing the index of the Lưu Niên Đại Vận palace.
- **Calculation Rules Found:** 
  - Year 1 at base palace, Year 2 at opposite (+6), Year 3 one step back, Year 4 opposite, Year 5 continues in direction.
- **Implicit Assumptions:** Follows a specific traditional interpretation of the zigzag flow of Lưu Niên Đại Vận.
- **School-dependent Behavior:** Applied generally in the engines.
- **Provenance Status:** Popular heuristic / traditional convention.
- **Test Coverage:** Explicitly tested in `annual-flow.test.ts`.
- **Risks:** The algorithm uses magic numbers (yearInFortune === 2, -4, +6).
- **Recommended Disposition:** Audit against sources. Extract to `school-dependent` policy because some schools do not use LNDV or calculate it differently.
- **Rule Classification:** `school-dependent`.

## 3. `src/lib/ziwei/chart.ts`
- **Responsibility:** Serialization and textual description of the calculated chart. Contains prose generation.
- **Inputs:** `ChartData`.
- **Outputs:** Plain text strings.
- **Calculation Rules Found:** 
  - Extracts `majorFortune` to generate strings like "Đại vận hiện hành: ...".
- **Implicit Assumptions:** Expects `majorFortune` object to exist on `data.majorFortunePalace`.
- **School-dependent Behavior:** None.
- **Provenance Status:** N/A (UI layer).
- **Test Coverage:** Tested in `chart.test.ts`.
- **Risks:** Semantic labels mixed with UI representation.
- **Recommended Disposition:** Decouple structural facts from prose formatting.
- **Rule Classification:** `semantic-only`.

## 4. `src/lib/ziwei/analysis/contracts/major-fortune.ts`
- **Responsibility:** Partial legacy/future contract definition for `major-fortune` module.
- **Inputs:** None.
- **Outputs:** Types.
- **Calculation Rules Found:** None.
- **Implicit Assumptions:** Notes state "một Đại vận phải độc lập annualYear", "Tứ Hóa Đại vận phụ thuộc school profile".
- **School-dependent Behavior:** Tứ Hóa derivation is school-dependent.
- **Provenance Status:** Architectural contract.
- **Test Coverage:** N/A.
- **Risks:** Currently empty or underdeveloped.
- **Recommended Disposition:** Replace with new robust contracts in `src/lib/ziwei/analysis/major-fortune/contracts/`.
- **Rule Classification:** `accepted-calculation` (architectural constraint).

---

## Archived / Historical Code

### Legacy Scoring (`src/lib/ziwei/trend/score.ts`)
- **Status:** Deleted on production.
- **Historical Note:** Previously, the `score.ts` module illicitly merged Major Fortune overlays into deterministic Good/Bad scoring. This has been fully removed from the codebase and is not a current production blocker. 

### Monthly Flow Start (`calculateThang1` & `input.flowBase`)
- **Status:** Handled via Monthly Flow architecture (out of scope for Major Fortune Core).
- **Historical Note:** The `calculateThang1` fallback logic (`input.flowBase`) was previously audited here but actually pertains to Monthly Flow dependencies, not the Major Fortune decade calculation itself.
