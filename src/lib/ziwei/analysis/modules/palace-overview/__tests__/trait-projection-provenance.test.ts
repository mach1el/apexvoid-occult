import { describe, expect, it } from "vitest";
import {
  loadPalaceOverviewKnowledgeV1,
  loadPalaceOverviewSemanticKnowledgeV1,
} from "@/lib/ziwei/analysis/knowledge";
import {
  buildTraitProjectionAnnotations,
  emptySemanticDiagnostics,
  type PalaceEvidence,
} from "@/lib/ziwei/analysis/modules/palace-overview";

const numericKnowledge = (() => {
  const loaded = loadPalaceOverviewKnowledgeV1();
  if (!loaded.ok) throw new Error("expected valid numeric knowledge fixture");
  return loaded.knowledge;
})();

const semanticKnowledge = (() => {
  const loaded = loadPalaceOverviewSemanticKnowledgeV1();
  if (!loaded.ok) throw new Error("expected valid semantic knowledge fixture");
  return loaded.knowledge;
})();

function evidence(overrides: Partial<PalaceEvidence>): PalaceEvidence {
  return {
    id: "ev:test",
    category: "minor-star-family",
    factIds: ["fact:test"],
    palaceRole: "focus",
    palaceName: "Mệnh",
    palaceBranch: "Tý",
    axes: { support: 1, pressure: 0, stability: 0, activation: 0 },
    label: "test",
    explanationKey: "minor.mentorship.test",
    sourceIds: [],
    knowledgeStatus: "experimental",
    starName: "Test Star",
    traitTags: ["mentorship"],
    ...overrides,
  };
}

describe("trait projection provenance aggregation", () => {
  it("preserves every factId and unions contributor sourceIds deterministically", () => {
    const first = evidence({
      id: "ev:first",
      starName: "Sao A",
      factIds: ["fact:A1", "fact:A2"],
      sourceIds: ["source:shared", "source:A"],
    });
    const second = evidence({
      id: "ev:second",
      starName: "Sao B",
      factIds: ["fact:B1", "fact:B2"],
      sourceIds: ["source:shared", "source:B"],
    });

    const diagnostics = emptySemanticDiagnostics();
    const out = buildTraitProjectionAnnotations({
      allEvidence: [first, second],
      knowledge: numericKnowledge,
      semanticKnowledge,
      diagnostics,
      focusPalaceIndex: 0,
      focusPalaceName: "Mệnh",
    });

    const annotation = out.find((item) => item.metadata?.trait === "mentorship");
    expect(annotation).toBeDefined();
    expect(annotation?.factIds).toEqual([
      "fact:A1",
      "fact:A2",
      "fact:B1",
      "fact:B2",
    ]);
    expect(annotation?.sourceIds).toEqual([
      ...semanticKnowledge.traitPalaceProjection.sourceIds,
      "source:shared",
      "source:A",
      "source:B",
    ]);
    expect(annotation?.metadata?.contributorEvidenceIds).toEqual([
      "ev:first",
      "ev:second",
    ]);
    expect(annotation?.metadata?.contributorCount).toBe(2);
  });
});
