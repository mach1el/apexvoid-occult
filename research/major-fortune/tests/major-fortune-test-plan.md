# Major Fortune Test Plan V0

## Overview
This test plan outlines the deterministic testing strategy for the Major Fortune (Đại Vận) calculation core. All tests must be deterministic, mathematically verifiable, and trace-enabled.

## 1. Direction Tests
* **Objective:** Validate that the direction of the 10-year cycle follows the Yin/Yang and Gender policy accurately.
* **Cases:**
  * Forward traversal (`yang_male`, `yin_female`).
  * Reverse traversal (`yin_male`, `yang_female`).
  * Verify that an overridden policy (e.g., custom directional rule) correctly overrides the default behavior.

## 2. Starting-Age Tests
* **Objective:** Ensure the calculation of the starting age (Cục số) and age boundaries is precise.
* **Cases:**
  * Exact boundary hit (e.g., Target age exactly equals Cục số).
  * One day before the boundary (using `targetDate`).
  * One day after the boundary.
  * Evaluation of `nominal-age` policy vs `actual-age` policy.
  * Birthday boundary vs Calendar-year boundary.

## 3. Palace Traversal Tests
* **Objective:** Verify the movement of the active Major Fortune through the 12 palaces over time.
* **Cases:**
  * Initialization at all 12 potential starting natal palaces.
  * Forward wraparound (Index 11 -> 0).
  * Reverse wraparound (Index 0 -> 11).
  * Cycle index zero (First decade).
  * High cycle indexes (e.g., 90-100 years old).

## 4. Cycle Range Tests
* **Objective:** Validate the handling of life cycle ranges.
* **Cases:**
  * First cycle (Childhood, before Major Fortune starts).
  * Partial first cycle (If policy dictates handling pre-Cục số ages).
  * Middle cycle (e.g., 30-40 years).
  * Final supported cycle (Maximum age boundary).
  * Invalid negative age (Should return `UnresolvedCalculationIssue` or specific diagnostic).
  * Age outside supported range.

## 5. Policy Comparison Tests
* **Objective:** Prove that school-dependent policies execute in isolation without cross-contamination.
* **Cases:**
  * Use the exact same input chart data.
  * Run once with `default-profile.v0.json` (Mixed/Nam Phái).
  * Run once with a strict `Trung Châu` profile.
  * Assert that the results differ *only* where the policies dictate (e.g., Tứ Hóa derivation, Lưu Niên Đại Vận).
  * Both outputs must contain complete, discrete `CalculationTraceEntry` arrays.

## 6. Layer-Isolation Tests
* **Objective:** Protect the natal base chart from mutation.
* **Cases:**
  * Pass an immutable frozen `NatalChart` object into the calculation. Assert it deep-equals itself after execution.
  * Ensure annual overlay does not mutate Major Fortune data.
  * Ensure monthly overlay does not mutate annual data.
  * Disable the `fortuneTransformations` feature toggle and assert `derived.fortuneTransformations` is undefined/empty.

## 7. Golden Tests
* **Objective:** Lock in deterministic structural facts for known charts.
* **Cases:**
  * Will be stored in `src/lib/ziwei/analysis/major-fortune/__tests__/fixtures/`.
  * Fixtures will contain: Normalized Input, Selected Policy Profile, Expected Cycle (start/end), Expected Position (Natal Palace ID), Expected Derived Values (Stem, Tứ Hóa), Expected Trace Operations, and Expected Diagnostics.
  * **Strict Requirement:** Do not include any semantic reading (e.g., "Good year for marriage") in the golden fixtures.
