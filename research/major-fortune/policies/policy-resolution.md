# Policy Resolution Strategy

This document describes how the Calculation Core resolves school-dependent rules for Major Fortune (Đại Vận).

## 1. Explicit Profiling
Every chart calculation must be accompanied by a `policyProfileId`. 
The core engine will NOT guess or fall back silently if a required policy is missing. 
If a chart is submitted without a profile, it receives the explicit default profile `default-profile.v0.json` at the boundary layer before calculation begins. The core itself never assumes a profile.

## 2. Failure Semantics
- **Missing Required Policy:** If an explicitly requested calculation step encounters a missing required policy, the engine will halt the specific operation and throw an error or log a diagnostic, returning an unresolved state for that calculation piece.
- **Conflicting Calculation-Impact Policies:** If an override creates a mathematically contradictory state (e.g., trying to use both forward and reverse derivation simultaneously), the engine will **fail closed**, throwing an error. It will not attempt to execute a "mathematically possible but semantically conflicting" override.
- **Unsupported School Feature:** If a user requests a feature explicitly rejected by their selected school (e.g., Tiểu Hạn under Trung Châu), the engine will output an `UNSUPPORTED_SCHOOL_RULE` diagnostic and will **not** fabricate a fake output.

## 3. No Silent Mixing
If a user selects a `nam-phai` profile, the engine will enforce all Nam Phái rules. It will not silently switch to Trung Châu rules just because a particular feature (like Phi Hóa) is requested. 

## 4. Major Fortune Defaults (V0)
For Major Fortune V0:
- **Direction & Traversal:** Universal standard (Yin/Yang + Gender).
- **Starting Age:** Universal standard (Cục số).
- **Major Fortune Tứ Hóa:** Enabled by default (using Palace Stem).
- **Tuần/Triệt Treatment:** Retained as structural markers. No dynamic semantic decay is applied.
