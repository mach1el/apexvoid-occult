import type { ChartData, ChartStar } from "@/types/chart";
import type { 
  MonthlyTransformationContribution, 
  MonthlyJiCollisionCandidate,
  MonthlyTransformationContext
} from "./types";
import type { ResolvedMonthlyTransformation } from "../types";
import { canonicalStarName } from "@/lib/ziwei/analysis/modules/major-fortune/utils"; // I'll check if this exists or just write a simple canonical mapping. Actually, I can just use a simple string matching since canonical names are passed.

function resolveFrameRelationship(focusIndex: number, targetIndex: number): "direct-focus" | "opposite" | "trine" | "outside" {
  const diff = (targetIndex - focusIndex + 12) % 12;
  if (diff === 0) return "direct-focus";
  if (diff === 6) return "opposite";
  if (diff === 4 || diff === 8) return "trine";
  return "outside";
}

export interface ResolveTransformationInput {
  chart: ChartData;
  canonicalTransformations: readonly ResolvedMonthlyTransformation[];
  focusPalaceIndex: number;
  unresolvedTargets: string[];
  ambiguousTargets: string[];
}

export function resolveTransformations(input: ResolveTransformationInput): MonthlyTransformationContext {
  const contributions: MonthlyTransformationContribution[] = [];
  const collisionCandidates: MonthlyJiCollisionCandidate[] = [];

  // Weights & Base Deltas (Expert Authorized)
  const roleWeights = { "direct-focus": 1.0, "opposite": 0.8, "trine": 0.65, "outside": 0.0 };
  const baseDeltas = { "Lộc": 25, "Quyền": 15, "Khoa": 15, "Kỵ": -25 } as Record<string, number>;

  let finalAppliedDelta = 0;

  for (const target of input.canonicalTransformations) {
    const rel = resolveFrameRelationship(input.focusPalaceIndex, target.targetPalaceIndex);
    const weight = roleWeights[rel];

    if (weight > 0) {
      const baseDelta = baseDeltas[target.mutagen] ?? 0;
      const contribution = baseDelta * weight;
      contributions.push({
        mutagen: target.mutagen,
        starName: target.canonicalStarName,
        role: rel,
        baseMutagenDelta: baseDelta,
        roleWeight: weight,
        contribution
      });
      // The scorer handles aggregation (dominant + secondary). We shouldn't do it here!
      // Wait, the new prompt says "scorer receives only authorized applied contributions" and "Aggregation should happen in scoreMonth".
      // But we can leave the finalDelta calculation out of here.
      // Wait, `MonthlyTransformationContext` has `finalAppliedDelta`. We will let `score-month.ts` compute it and set it, OR we compute it here.
    }
  }

  // Collision detection
  const ky = input.canonicalTransformations.find(t => t.mutagen === "Kỵ");
  if (ky) {
    const targetPalace = input.chart.palaces.find(p => p.index === ky.targetPalaceIndex);
    if (targetPalace && targetPalace.stars) {
      // Find natal mutagen Kỵ
      const natalKyStars = targetPalace.stars.filter(s => s.source === "natal-mutagen" && s.mutagen === "Kỵ");
      // Find annual mutagen Kỵ
      const annualKyStars = targetPalace.stars.filter(s => s.source === "annual-mutagen" && s.mutagen === "Kỵ");

      for (const nk of natalKyStars) {
        if (nk.targetStar === ky.canonicalStarName) {
          collisionCandidates.push({
            kind: "same-star-natal-monthly",
            targetStar: ky.canonicalStarName,
            targetPalaceIndex: ky.targetPalaceIndex
          });
        } else {
          collisionCandidates.push({
            kind: "same-palace-natal-monthly",
            monthlyTargetStar: ky.canonicalStarName,
            existingTargetStar: nk.targetStar || "Unknown",
            targetPalaceIndex: ky.targetPalaceIndex
          });
        }
      }

      for (const ak of annualKyStars) {
        if (ak.targetStar === ky.canonicalStarName) {
          collisionCandidates.push({
            kind: "same-star-annual-monthly",
            targetStar: ky.canonicalStarName,
            targetPalaceIndex: ky.targetPalaceIndex
          });
        } else {
          collisionCandidates.push({
            kind: "same-palace-annual-monthly",
            monthlyTargetStar: ky.canonicalStarName,
            existingTargetStar: ak.targetStar || "Unknown",
            targetPalaceIndex: ky.targetPalaceIndex
          });
        }
      }
    }
  }

  const isPartial = input.unresolvedTargets.length > 0 || input.ambiguousTargets.length > 0 || collisionCandidates.length > 0;
  
  return {
    contributions,
    resolutionStatus: isPartial ? "partial" : "resolved",
    unresolvedTargets: input.unresolvedTargets,
    ambiguousTargets: input.ambiguousTargets,
    collisionCandidates,
    collisionPolicyStatus: collisionCandidates.length > 0 ? "pending-expert-review" : "not-applicable",
    finalAppliedDelta: 0 // Will be calculated by scoreMonth and can be removed from here if we want, but it's required by the interface.
  };
}
