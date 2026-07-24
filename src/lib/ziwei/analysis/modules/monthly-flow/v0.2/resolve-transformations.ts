import type { ChartData, ChartPalace as Palace, ChartStar as Star } from "@/types/chart";
import type { MonthlyTransformationContribution, MonthlyJiCollisionKind } from "./types";

function resolveFrameRelationship(focusIndex: number, targetIndex: number): "direct-focus" | "opposite" | "trine" | "outside" {
  const diff = (targetIndex - focusIndex + 12) % 12;
  if (diff === 0) return "direct-focus";
  if (diff === 6) return "opposite";
  if (diff === 4 || diff === 8) return "trine";
  return "outside";
}

export interface ResolveTransformationInput {
  chart: ChartData;
  targets: Array<{ mutagen: string; starName: string }>;
  focusPalaceIndex: number;
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
  
  // Weights & Base Deltas (Expert Authorized)
  const roleWeights = { "direct-focus": 1.0, "opposite": 0.8, "trine": 0.65, "outside": 0.0 };
  const baseDeltas = { "Lộc": 25, "Quyền": 15, "Khoa": 15, "Kỵ": -25 } as Record<string, number>;

  for (const target of input.targets) {
    // 1. Find physical natal star
    // Tứ hóa phải ứng lên các sao vật lý thật. Cần dò tìm sao này trong 12 cung.
    let foundPalaceIndex = -1;
    let foundStar: Star | null = null;
    let isDuplicate = false;

    for (const palace of input.chart.palaces) {
      // Loại trừ các sao Lưu, marker Hóa (vì ta đang tìm physical star)
      const stars = palace.stars ?? [];
      const star = stars.find(s => 
        s.name === target.starName && 
        !s.name.startsWith("Lưu ") &&
        !s.name.startsWith("Hóa ")
      );
      if (star) {
        if (foundPalaceIndex !== -1) {
          // Trùng nhiều cung -> diagnostic partial
          isDuplicate = true;
          diagnostics.partialReasons.push(`duplicate-physical-target-${target.starName}`);
        } else {
          foundPalaceIndex = palace.index;
          foundStar = star;
        }
      }
    }

    if (isDuplicate || foundPalaceIndex === -1 || !foundStar) {
      if (foundPalaceIndex === -1 && !isDuplicate) {
        diagnostics.partialReasons.push(`target-not-found-${target.starName}`);
      }
      continue;
    }

    // 2. Resolve relationship
    const rel = resolveFrameRelationship(input.focusPalaceIndex, foundPalaceIndex);
    const weight = roleWeights[rel];

    if (weight > 0) {
      const baseDelta = baseDeltas[target.mutagen] ?? 0;
      contributions.push({
        mutagen: target.mutagen,
        starName: target.starName,
        role: rel,
        baseMutagenDelta: baseDelta,
        roleWeight: weight,
        contribution: baseDelta * weight
      });
    }
  }
  
  return {
    contributions,
    collisionKind,
    diagnostics
  };
}
