import type { MajorFortuneAdapterDiagnostics, MajorFortuneAdapterResolvedContext, AdapterEvidenceDraft } from "./types";
import type { MajorFortuneOrdinalPillarContext } from "../types";
import adapterPolicy from "./policy/adapter-policy.v0.3.json";

const SRC = ["SRC-MF-V03-ADAPTER-XF"];
const CLM = ["CLM-MF-V03-ADAPTER-XF"];

export function emitTuHoaSatTinh(
  ctx: MajorFortuneAdapterResolvedContext,
  diagnostics: MajorFortuneAdapterDiagnostics,
): { evidence: AdapterEvidenceDraft[]; context: MajorFortuneOrdinalPillarContext } {
  // severe-pressure-evidence intentionally disabled in Round 1.
  if (ctx.school === "nam-phai") {
    diagnostics.namPhaiTransformationBlocked.push(
      "Nam Phái Major Fortune transformations unavailable until Calculation Core supports them",
    );
    return {
      evidence: [],
      context: {
        availability: "partial-data",
        reasonCodes: ["nam-phai-transformations-unavailable-calculation-core"],
      },
    };
  }

  if (!ctx.fortuneStem) {
    return {
      evidence: [],
      context: {
        availability: "partial-data",
        reasonCodes: ["missing-fortune-stem"],
      },
    };
  }

  const evidence: AdapterEvidenceDraft[] = [];
  const cycleKey = `c${ctx.cycle.cycleIndex}-p${ctx.cycle.activePalaceIndex}`;
  const polarity = adapterPolicy.transformationPolarity as Record<
    string,
    { direction: "support" | "pressure"; strength: "normal" | "strong" }
  >;
  const aliases = adapterPolicy.calculationCoreMutagenAliases as Record<string, string>;

  for (const xf of ctx.transformations) {
    const canonicalType = aliases[xf.mutagen] ?? null;
    if (!canonicalType) {
      diagnostics.notes.push(`unknown-transformation-type:${xf.mutagen}`);
      continue;
    }
    const mapped = polarity[canonicalType];
    if (!mapped) {
      diagnostics.notes.push(`unmapped-transformation-polarity:${canonicalType}`);
      continue;
    }

    const targetPalace = xf.palace?.name ?? null;
    const targetIndex = xf.palace?.index;
    if (!targetPalace || targetIndex === undefined || !xf.starName || !xf.mutagen) {
      diagnostics.incompleteTransformationTuples.push(
        `${xf.mutagen}:${xf.starName ?? "?"}:missing-target`,
      );
      continue;
    }

    evidence.push({
      evidenceId: `mf-v03-xf-${cycleKey}-${canonicalType}-${xf.starName}-${targetIndex}`,
      physicalFactId: `mf-xf:${ctx.fortuneStem}:${canonicalType}:${xf.starName}:${targetIndex}`,
      physicalFactKind: "major-fortune-transformation",
      evidenceClusterId: `cluster-xf:${cycleKey}:${canonicalType}:${xf.starName}`,
      pillarId: "tu-hoa-sat-tinh",
      signalFamilyId: "major-fortune-transformations",
      direction: mapped.direction,
      strength: mapped.strength,
      temporalScope: "major-fortune",
      factIds: [
        `fortuneStem:${ctx.fortuneStem}`,
        `transformationType:${canonicalType}`,
        `transformedStar:${xf.starName}`,
        `targetPalace:${targetPalace}`,
        `coreMutagenLabel:${xf.mutagen}`,
      ],
      sourceIds: SRC,
      claimIds: CLM,
      policyStatus: "research-admitted",
      schoolScope: ["trung-chau"],
      reasonCode: `transformation:${canonicalType}`,
      transformationTuple: {
        fortuneStem: ctx.fortuneStem,
        transformationType: canonicalType,
        transformedStar: xf.starName,
        targetPalace,
      },
    });
  }

  return {
    evidence,
    context: { availability: "available" },
  };
}
