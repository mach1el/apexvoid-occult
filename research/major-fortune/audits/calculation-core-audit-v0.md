# Calculation Core Audit V0.2

## Context: Implementation Status
This audit documents the current state of the existing Zi Wei Calculation Core (the `engine-nam-phai.ts`, `engine-trung-chau.ts`, and `annual-flow.ts` runtime code) as it relates to the new `major-fortune` module boundaries. 
Currently, the legacy engine contains hardcoded arithmetic that mimics Major Fortune calculations. However, the true **policy-aware Major Fortune Calculation Core integration has not started**. Therefore, all policies in the matrix remain with `implementationStatus` as `not_started`, and the legacy behaviors are documented via `legacyRuntimeRefs` purely for context. Current engine code remains unchanged in this PR and deleted scoring code (`trend/score.ts`) is no longer treated as a production blocker.

## MF-AUDIT-001
**Severity:** high  
**Category:** layer-isolation  
**File:** `src/lib/ziwei/engine-nam-phai.ts`  
**Location:** `assignMajorFortunes` (line 580)  
**Current behavior:** The function mutates the `palaces` array directly, attaching the `majorFortune` object to the natal palaces.  
**Why it is a problem:** Violates layer isolation. The natal chart must remain immutable. Major Fortune should be calculated as an overlay layer, not injected into the base natal palace objects.  
**Affected policies:** `POL-MF-NATAL-TRANSFORMATION-INHERITANCE`  
**Affected sources:** N/A (Architectural defect)  
**Recommended change:** Create a separate `MajorFortuneResult` structure that references `natalPalaceIndex` instead of mutating the base `Palace` object.  
**Required tests:** Layer-isolation test (natal chart deep equals before and after calculation).  
**Breaking change:** yes  
**Status:** open  

## MF-AUDIT-002
**Severity:** high  
**Category:** layer-isolation  
**File:** `src/lib/ziwei/engine-trung-chau.ts`  
**Location:** `assignMajorFortunes` (line 590)  
**Current behavior:** The function mutates the `palaces` array directly, attaching the `majorFortune` object to the natal palaces.  
**Why it is a problem:** Identical to MF-AUDIT-001, violates layer isolation in the Trung Châu engine.  
**Affected policies:** `POL-MF-NATAL-TRANSFORMATION-INHERITANCE`  
**Affected sources:** N/A (Architectural defect)  
**Recommended change:** Create a separate `MajorFortuneResult` structure.  
**Required tests:** Layer-isolation test.  
**Breaking change:** yes  
**Status:** open  

## MF-AUDIT-003
**Severity:** medium  
**Category:** provenance  
**File:** `src/lib/ziwei/annual-flow.ts`  
**Location:** `getAnnualMajorFortuneIndex` (line 107)  
**Current behavior:** Uses magic numbers (`yearInFortune === 2`, `oppositeIndex + 6`, `yearInFortune - 4`) to calculate the zigzag flow of Lưu Niên Đại Vận.  
**Why it is a problem:** Difficult to maintain or verify against classical texts. The algorithm works for the standard "year 1 base, year 2 opposite, year 3 back one, year 4 opposite, year 5 forward" but the arbitrary arithmetic obfuscates the provenance.  
**Affected policies:** `POL-MF-ANNUAL-INTERACTION-NAM-PHAI`, `POL-MF-ANNUAL-INTERACTION-TRUNG-CHAU`  
**Affected sources:** `SRC-MF-001`  
**Recommended change:** Replace magic numbers with a clear state machine or explicitly documented array lookup mapping the 10-year path.  
**Required tests:** Palace traversal tests.  
**Breaking change:** no  
**Status:** open  

## MF-AUDIT-004
**Severity:** medium  
**Category:** input-integrity  
**File:** `src/lib/ziwei/engine-nam-phai.ts`  
**Location:** `assignMajorFortunes` (line 580)  
**Current behavior:** Age boundaries rely on `nominalAge` (Tuổi mụ), which is an integer. It does not account for precise solar/lunar boundaries or transition periods.  
**Why it is a problem:** Prevents accurate fractional age tracking or solar-term boundary policies.  
**Affected policies:** `POL-MF-AGE-BOUNDARY`  
**Affected sources:** N/A  
**Recommended change:** Support boundary resolution in the Calculation Core using the new target union contract.  
**Required tests:** Starting-age boundary tests.  
**Breaking change:** yes  
**Status:** open  

## MF-AUDIT-005
**Severity:** low  
**Category:** policy-explicitness  
**File:** `src/lib/ziwei/engine-nam-phai.ts`  
**Location:** `getLNDVBase` (line 642)  
**Current behavior:** Returns `null` if `majorFortunePalace` is not passed, allowing downstream execution to proceed with missing data.  
**Why it is a problem:** Missing required policy data should fail closed rather than returning `null` silently, which could mask deeper state errors.  
**Affected policies:** `POL-MF-ANNUAL-INTERACTION-NAM-PHAI`  
**Affected sources:** N/A  
**Recommended change:** Ensure `majorFortunePalace` is strictly required before calculating dependent nodes, or throw a formal diagnostic error.  
**Required tests:** Missing dependency error test.  
**Breaking change:** yes  
**Status:** open
