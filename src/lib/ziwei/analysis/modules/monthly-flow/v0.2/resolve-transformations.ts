import type { ChartData } from "@/types/chart";
import type { MonthlyTransformationContribution, MonthlyJiCollisionKind } from "./types";
import type { ResolvedMonthlyTransformation } from "../types";

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
  isPartial: boolean;
}

export interface ResolvedTransformationOutput {
  contributions: MonthlyTransformationContribution[];
  collisionKind: MonthlyJiCollisionKind | null;
  diagnostics: {
    partialReasons: string[];
  };
}

export function resolveTransformations(input: ResolveTransformationInput): ResolvedTransformationOutput {
  const contributions: MonthlyTransformationContribution[] = [];
  const diagnostics = { partialReasons: [] as string[] };
  let collisionKind: MonthlyJiCollisionKind | null = null;

  if (input.isPartial) {
    diagnostics.partialReasons.push("canonical-transformations-partial");
  }

  // Weights & Base Deltas (Expert Authorized)
  const roleWeights = { "direct-focus": 1.0, "opposite": 0.8, "trine": 0.65, "outside": 0.0 };
  const baseDeltas = { "Lộc": 25, "Quyền": 15, "Khoa": 15, "Kỵ": -25 } as Record<string, number>;

  for (const target of input.canonicalTransformations) {
    const rel = resolveFrameRelationship(input.focusPalaceIndex, target.targetPalaceIndex);
    const weight = roleWeights[rel];

    if (weight > 0) {
      const baseDelta = baseDeltas[target.mutagen] ?? 0;
      contributions.push({
        mutagen: target.mutagen,
        starName: target.canonicalStarName,
        role: rel,
        baseMutagenDelta: baseDelta,
        roleWeight: weight,
        contribution: baseDelta * weight
      });
    }
  }

  // Collision detection (detect candidates but we do not apply special -50)
  const ky = input.canonicalTransformations.find(t => t.mutagen === "Kỵ");
  if (ky) {
    const targetPalace = input.chart.palaces.find(p => p.index === ky.targetPalaceIndex);
    if (targetPalace && targetPalace.stars) {
      const hasNatalKy = targetPalace.stars.some(s => s.name === "Hóa Kỵ" && s.source === "natal");
      const hasAnnualKy = targetPalace.stars.some(s => (s.name === "Hóa Kỵ" || s.name === "Lưu Hóa Kỵ") && s.source === "annual");
      
      if (hasNatalKy) {
        // Just an approximation. Proper facts should check if it's the SAME physical star.
        collisionKind = "same-palace-natal-monthly";
      } else if (hasAnnualKy) {
        collisionKind = "same-palace-annual-monthly";
      }
    }
  }

  return {
    contributions,
    collisionKind,
    diagnostics
  };
}
