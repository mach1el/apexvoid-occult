# Policy Resolution Strategy

This document describes how the Calculation Core resolves school-dependent rules for Major Fortune (Đại Vận).

## 1. Explicit Profiling
Every chart calculation must be accompanied by a `policyProfileId`. 
The core engine will NOT guess or fall back silently if a required policy is missing. 
If a chart is submitted without a profile, it receives the `default-profile.v0.json`.

## 2. No Silent Mixing
If a user selects a `nam-phai` profile, the engine will enforce all Nam Phái rules (e.g., using Tiểu Hạn). It will not silently switch to Trung Châu rules just because a particular feature (like Phi Hóa) is requested. If a feature is unsupported by the selected policy profile, it throws an `UNSUPPORTED_SCHOOL_RULE` diagnostic.

## 3. Override Mechanism
Consumers (the UI or backend API) can supply an override object. 
If a policy is marked `overrideAllowed: false` (e.g., the basic direction of Major Fortune based on Yin/Yang), the engine will reject the override. This ensures structural integrity of the Zi Wei mathematical model.

## 4. Conflict Logging
If an override conflicts with another active policy (e.g., turning on Trung Châu Annual Flow but keeping Nam Phái Tiểu Hạn), the engine will output a `CONFLICTING_POLICY_SELECTION` diagnostic in the result trace, but will attempt to execute according to the explicit overrides if mathematically possible.

## 5. Major Fortune Defaults
For Major Fortune V0:
- **Direction & Traversal:** Universal standard (Yin/Yang + Gender).
- **Starting Age:** Universal standard (Cục số).
- **Major Fortune Tứ Hóa:** Enabled by default (using Palace Stem).
- **Tuần/Triệt Treatment:** Retained as structural markers. No dynamic semantic decay (e.g., "Triệt giảm sau 30 tuổi") is applied in the calculation core; it is deferred to the semantic layer.
