# Calculation Core Audit V0

## MF-AUDIT-001
**Severity:** high  
**Category:** layer-isolation  
**File:** `src/lib/ziwei/engine-nam-phai.ts`  
**Location:** `assignMajorFortunes` (line 580)  
**Current behavior:** The function mutates the `palaces` array directly, attaching the `majorFortune` object to the natal palaces.  
**Why it is a problem:** Violates layer isolation. The natal chart must remain immutable. Major Fortune should be calculated as an overlay layer, not injected into the base natal palace objects.  
**Affected policies:** `POL-MF-TOPIC-015` (Layer Stacking)  
**Affected sources:** N/A (Architectural defect)  
**Recommended change:** Create a separate `MajorFortuneResult` structure that references `natalPalaceIndex` instead of mutating the base `Palace` object.  
**Required tests:** Layer-isolation test (natal chart deep equals before and after calculation).  
**Breaking change:** yes  
**Status:** open  

## MF-AUDIT-002
**Severity:** medium  
**Category:** calculation  
**File:** `src/lib/ziwei/annual-flow.ts`  
**Location:** `getAnnualMajorFortuneIndex` (line 107)  
**Current behavior:** Uses magic numbers (`yearInFortune === 2`, `oppositeIndex + 6`, `yearInFortune - 4`) to calculate the zigzag flow of Lưu Niên Đại Vận.  
**Why it is a problem:** Difficult to maintain or verify against classical texts. The algorithm works for the standard "year 1 base, year 2 opposite, year 3 back one, year 4 opposite, year 5 forward" but the arbitrary arithmetic obfuscates the provenance.  
**Affected policies:** `POL-MF-TOPIC-003`, `POL-MF-TOPIC-004`  
**Affected sources:** `SRC-MF-001`  
**Recommended change:** Replace magic numbers with a clear state machine or explicitly documented array lookup mapping the 10-year path.  
**Required tests:** Palace traversal tests.  
**Breaking change:** no  
**Status:** open  

## MF-AUDIT-003
**Severity:** medium  
**Category:** policy  
**File:** `src/lib/ziwei/engine-nam-phai.ts`  
**Location:** `calculateThang1`  
**Current behavior:** Automatically falls back to `"luu-nien"` if `input.flowBase` is omitted.  
**Why it is a problem:** Silent fallback masks missing policy configurations. The engine should explicitly require the annual flow policy rather than guessing.  
**Affected policies:** `POL-MF-TOPIC-003`  
**Affected sources:** N/A  
**Recommended change:** Ensure `policyProfileId` dictates the flow base. Throw `MISSING_REQUIRED_POLICY` if absent.  
**Required tests:** Policy comparison tests.  
**Breaking change:** yes  
**Status:** open  

## MF-AUDIT-004
**Severity:** blocker  
**Category:** semantic-leakage  
**File:** `src/lib/ziwei/trend/score.ts`  
**Location:** `getLuuNienTrend` and `scoreFortuneFrame`  
**Current behavior:** Merges the Major Fortune stars (and Tam Phương Tứ Chính) with weights to calculate composite fortune scores (`cat`, `hung`).  
**Why it is a problem:** Produces deterministic good/bad scores based on heuristics, which is strictly forbidden in the Calculation Core. This introduces "fortune telling" into the core logic.  
**Affected policies:** All  
**Affected sources:** Unverified heuristics.  
**Recommended change:** Decouple `score.ts` entirely from the core mathematical engine. Ensure `major-fortune` module strictly outputs structural facts (stars, stems, transformations) and delegates any interpretation to a semantic layer.  
**Required tests:** N/A (Deprecation)  
**Breaking change:** no (if decoupled properly)  
**Status:** open  

## MF-AUDIT-005
**Severity:** low  
**Category:** data-contract  
**File:** `src/lib/ziwei/engine-nam-phai.ts`  
**Location:** `assignMajorFortunes` (line 580)  
**Current behavior:** Age boundaries rely on `nominalAge` (Tuổi mụ), which is an integer. It does not account for precise solar/lunar boundaries or transition periods.  
**Why it is a problem:** Prevents accurate fractional age tracking or solar-term boundary policies.  
**Affected policies:** Age Boundary Policy (To be defined)  
**Affected sources:** Modern academic astrology.  
**Recommended change:** Introduce targetDate into `MajorFortuneInput` and support boundary resolution in the Calculation Core.  
**Required tests:** Starting-age tests (exact boundary, one day before/after).  
**Breaking change:** yes  
**Status:** open
