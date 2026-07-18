# Policy Resolution Strategy

This document describes how the Calculation Core resolves school-dependent rules for Major Fortune (Đại Vận).

## 1. Explicit Profiling
Every chart calculation must be accompanied by a `policyProfileId`. 
The core engine will NOT guess or fall back silently if a required policy is missing. 
If a chart is submitted without a profile, it receives the explicit default profile `major-fortune-research-v0` at the boundary layer before calculation begins. The core itself never assumes a profile.

## 2. Failure Semantics
- **Missing Required Policy:** If an explicitly requested calculation step encounters a missing required policy, the engine will halt the specific operation and throw an error or log a diagnostic, returning an unresolved state for that calculation piece.
- **Conflicting Calculation-Impact Policies:** If an override creates a mathematically contradictory state (e.g., trying to use both forward and reverse derivation simultaneously), the engine will **fail closed**, throwing an error. It will not attempt to execute a "mathematically possible but semantically conflicting" override.
- **Unsupported School Feature:** If a user requests a feature explicitly rejected by their selected school (e.g., Tiểu Hạn under Trung Châu), the engine will output an `UNSUPPORTED_SCHOOL_RULE` diagnostic and will **not** fabricate a fake output.
- **Unresolved Policies in Research Profiles:** If the engine encounters an `unresolved` policy and the `unresolvedPolicyBehavior` is `preserve`, it will gracefully return diagnostics and an `UnresolvedCalculationIssue` rather than crashing or inventing structural values.

## 3. No Silent Mixing
If a user selects a `nam-phai` profile, the engine will enforce all Nam Phái rules. It will not silently switch to Trung Châu rules just because a particular feature (like Phi Hóa) is requested. 

## 4. Major Fortune Defaults (V0.2)
For Major Fortune V0.2:
- **Profile:** This profile is research-only (`profileType: "research"`). It is not executable.
- **Unresolved Policies:** Unresolved policies are preserved, not executed.
- **Boundary Responsibility:** The boundary layer must never silently turn the research profile into a runtime profile.
- **Status:** The Calculation Core remains unchanged in this PR. Current engine code must not be altered to resolve audit findings yet.
