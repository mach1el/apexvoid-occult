import type { MajorFortuneAdapterDiagnostics, MajorFortuneAdapterResolvedContext, AdapterEvidenceDraft } from "./types";
import type { MajorFortuneOrdinalPillarContext } from "../types";
import adapterPolicy from "./policy/adapter-policy.v0.3.json";
import branchMap from "./policy/branch-element-map.v0.3.json";
import { resolveElementRelation, type ElementRelationId } from "../../v0.2/resolve-context";

const EL_SOURCE = ["SRC-MF-V03-ADAPTER-ELEMENT"];
const EL_CLAIM = ["CLM-MF-V03-ADAPTER-ELEMENT"];

export function emitThienThoi(
  ctx: MajorFortuneAdapterResolvedContext,
  diagnostics: MajorFortuneAdapterDiagnostics,
): { evidence: AdapterEvidenceDraft[]; context: MajorFortuneOrdinalPillarContext } {
  if (!ctx.menhElement) {
    return {
      evidence: [],
      context: {
        availability: "unavailable",
        reasonCodes: ["missing-menh-element"],
      },
    };
  }

  const palaceElement = branchMap.branchToElement[ctx.activePalaceBranch as keyof typeof branchMap.branchToElement];
  if (!palaceElement) {
    return {
      evidence: [],
      context: {
        availability: "unavailable",
        reasonCodes: ["unknown-palace-branch-element"],
      },
    };
  }

  const relation = resolveElementRelation(
    palaceElement,
    ctx.menhElement,
    branchMap.generates as Record<string, string>,
    branchMap.controls as Record<string, string>,
  );
  if (!relation) {
    diagnostics.notes.push(`thien-thoi:no-mapped-relation:${palaceElement}:${ctx.menhElement}`);
    return {
      evidence: [],
      context: { availability: "available", reasonCodes: ["element-relation-unmapped"] },
    };
  }

  const mapping = adapterPolicy.elementRelationMapping[relation as ElementRelationId] as {
    direction: "support" | "pressure";
    strength: "normal" | "strong";
  };

  const cycleKey = `c${ctx.cycle.cycleIndex}-p${ctx.cycle.activePalaceIndex}`;
  const evidence: AdapterEvidenceDraft = {
    evidenceId: `mf-v03-el-${cycleKey}-${relation}`,
    physicalFactId: `element-relation:${ctx.activePalaceBranch}:${palaceElement}:${ctx.menhElement}:${relation}`,
    physicalFactKind: "element-relation",
    evidenceClusterId: `cluster-element-relation:${cycleKey}`,
    pillarId: "thien-thoi",
    signalFamilyId: "element-relation",
    direction: mapping.direction,
    strength: mapping.strength,
    temporalScope: "major-fortune",
    factIds: [
      `palace-branch:${ctx.activePalaceBranch}`,
      `palace-element:${palaceElement}`,
      `menh-element:${ctx.menhElement}`,
      `relation:${relation}`,
    ],
    sourceIds: EL_SOURCE,
    claimIds: EL_CLAIM,
    policyStatus: "research-admitted",
    schoolScope: ["nam-phai", "trung-chau"],
    reasonCode: `element-relation:${relation}`,
  };

  return {
    evidence: [evidence],
    context: { availability: "available" },
  };
}
