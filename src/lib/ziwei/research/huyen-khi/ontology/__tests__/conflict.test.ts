import { describe, expect, it } from "vitest";

import { analyzeRuleConflicts } from "../validate-ontology";
import type { HuyenKhiRule, HuyenKhiRuleEffect } from "../types";

function rule(
  ruleId: string,
  effect: HuyenKhiRuleEffect,
  extra: Partial<HuyenKhiRule> = {},
): HuyenKhiRule {
  return {
    ruleId,
    version: "0.1.0",
    status: "draft",
    schoolProfile: "shared",
    specificity: "exact-star",
    subject: { kind: "major-star", id: "s" },
    conditions: [],
    effects: [effect],
    stackingGroup: "g",
    sourceIds: ["HK-SRC-SPEC-001"],
    ...extra,
  };
}

const target = { star: "S1" };

describe("Huyền Khí ontology — conflict policy (§8, §14)", () => {
  it("contradictory effects on same target+dimension emit an UNRESOLVED conflict", () => {
    const rules = [
      rule("HK-RULE-A", { dimension: "capacity", operation: "strengthen", magnitude: "moderate", targetFactSelector: target }),
      rule("HK-RULE-B", { dimension: "capacity", operation: "weaken", magnitude: "moderate", targetFactSelector: target }),
    ];
    const analysis = analyzeRuleConflicts(rules);
    expect(analysis.unresolved).toHaveLength(1);
    expect(analysis.suppressed).toHaveLength(0);
  });

  it("specificity alone does NOT silently suppress", () => {
    const rules = [
      rule("HK-RULE-GENERIC", { dimension: "expression", operation: "block", magnitude: "light", targetFactSelector: target }, { specificity: "generic-structure" }),
      rule("HK-RULE-EXACT", { dimension: "expression", operation: "release", magnitude: "light", targetFactSelector: target }, { specificity: "exact-star-state" }),
    ];
    // Higher specificity exists but declares no suppression → still unresolved.
    const analysis = analyzeRuleConflicts(rules);
    expect(analysis.unresolved).toHaveLength(1);
    expect(analysis.suppressed).toHaveLength(0);
  });

  it("explicit suppression on same target/dimension resolves (not silent)", () => {
    const rules = [
      rule("HK-RULE-WIN", { dimension: "capacity", operation: "strengthen", magnitude: "strong", targetFactSelector: target }, { suppressesRuleIds: ["HK-RULE-LOSE"] }),
      rule("HK-RULE-LOSE", { dimension: "capacity", operation: "weaken", magnitude: "light", targetFactSelector: target }),
    ];
    const analysis = analyzeRuleConflicts(rules);
    expect(analysis.suppressed).toHaveLength(1);
    expect(analysis.unresolved).toHaveLength(0);
  });

  it("different dimensions coexist (no conflict)", () => {
    const rules = [
      rule("HK-RULE-A", { dimension: "capacity", operation: "strengthen", magnitude: "moderate", targetFactSelector: target }),
      rule("HK-RULE-B", { dimension: "expression", operation: "block", magnitude: "moderate", targetFactSelector: target }),
    ];
    const analysis = analyzeRuleConflicts(rules);
    expect(analysis.unresolved).toHaveLength(0);
    expect(analysis.suppressed).toHaveLength(0);
  });

  it("different targets do not conflict even on same dimension", () => {
    const rules = [
      rule("HK-RULE-A", { dimension: "capacity", operation: "strengthen", magnitude: "moderate", targetFactSelector: { star: "S1" } }),
      rule("HK-RULE-B", { dimension: "capacity", operation: "weaken", magnitude: "moderate", targetFactSelector: { star: "S2" } }),
    ];
    expect(analyzeRuleConflicts(rules).unresolved).toHaveLength(0);
  });

  it("conflict detection is order-independent", () => {
    const a = rule("HK-RULE-A", { dimension: "capacity", operation: "strengthen", magnitude: "moderate", targetFactSelector: target });
    const b = rule("HK-RULE-B", { dimension: "capacity", operation: "weaken", magnitude: "moderate", targetFactSelector: target });
    expect(analyzeRuleConflicts([a, b]).unresolved.length).toBe(
      analyzeRuleConflicts([b, a]).unresolved.length,
    );
  });
});
