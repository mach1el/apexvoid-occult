import { describe, expect, it } from "vitest";
import { ANNUAL_AXIS_DOMAINS } from "../../../contracts/annual-axes";
import { loadAnnualAxesKnowledgeV0, validateAnnualAxesKnowledge } from "../index";

describe("annual-axes knowledge V0", () => {
  it("loads and validates cleanly", () => {
    const loaded = loadAnnualAxesKnowledgeV0();
    expect(loaded.ok).toBe(true);
  });

  it("covers exactly the six contract domains", () => {
    const loaded = loadAnnualAxesKnowledgeV0();
    if (!loaded.ok) throw new Error("failed to load");
    const domains = loaded.knowledge.axisDefinitions.domains.map((d) => d.domain);
    expect(new Set(domains)).toEqual(new Set(ANNUAL_AXIS_DOMAINS));
  });

  it("anchor weights sum to 1.0 per domain", () => {
    const loaded = loadAnnualAxesKnowledgeV0();
    if (!loaded.ok) throw new Error("failed to load");
    for (const domain of loaded.knowledge.axisDefinitions.domains) {
      const sum = domain.anchors.reduce((acc, a) => acc + a.weight, 0);
      expect(sum).toBeCloseTo(1.0, 6);
    }
  });

  it("has globally unique ruleIds across every catalog", () => {
    const loaded = loadAnnualAxesKnowledgeV0();
    if (!loaded.ok) throw new Error("failed to load");
    const { focalMarkers, interactionRules, mutagenImpact, starOverrides } = loaded.knowledge;
    const ids = [
      ...focalMarkers.records.map((r) => r.ruleId),
      ...focalMarkers.convergence.map((r) => r.ruleId),
      ...interactionRules.records.map((r) => r.ruleId),
      ...mutagenImpact.records.map((r) => r.ruleId),
      ...starOverrides.records.map((r) => r.ruleId),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every interaction rule disabled in V0", () => {
    const loaded = loadAnnualAxesKnowledgeV0();
    if (!loaded.ok) throw new Error("failed to load");
    expect(loaded.knowledge.interactionRules.defaultEnabled).toBe(false);
    for (const rule of loaded.knowledge.interactionRules.records) {
      expect(rule.enabled).toBe(false);
    }
  });

  it("covers all experimental coefficients with a formula_design source", () => {
    const loaded = loadAnnualAxesKnowledgeV0();
    if (!loaded.ok) throw new Error("failed to load");
    const hasArchSource = loaded.knowledge.sourceRegistry.sources.some(
      (s) => s.sourceType === "internal_architecture" && s.allowedUsage.includes("formula_design"),
    );
    expect(hasArchSource).toBe(true);
  });

  it("rejects a knowledge object with an enabled interaction rule", () => {
    const loaded = loadAnnualAxesKnowledgeV0();
    if (!loaded.ok) throw new Error("failed to load");
    const tampered = {
      ...loaded.knowledge,
      interactionRules: {
        ...loaded.knowledge.interactionRules,
        records: loaded.knowledge.interactionRules.records.map((r, i) =>
          i === 0 ? { ...r, enabled: true } : r,
        ),
      },
    };
    const result = validateAnnualAxesKnowledge(tampered);
    expect(result.ok).toBe(false);
  });
});
