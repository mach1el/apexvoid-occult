import type { MajorFortuneAdapterDiagnostics, MajorFortuneAdapterResolvedContext, AdapterEvidenceDraft } from "./types";
import type { MajorFortuneOrdinalPillarContext } from "../types";
import adapterPolicy from "./policy/adapter-policy.v0.3.json";
import { natalPrincipalsInPalace } from "./resolve-context";

const SRC = ["SRC-MF-V03-ADAPTER-DIGNITY"];
const CLM = ["CLM-MF-V03-ADAPTER-DIGNITY"];

export function emitDiaLoi(
  ctx: MajorFortuneAdapterResolvedContext,
  diagnostics: MajorFortuneAdapterDiagnostics,
): { evidence: AdapterEvidenceDraft[]; context: MajorFortuneOrdinalPillarContext } {
  const principals = natalPrincipalsInPalace(ctx.natalStarsInActivePalace);
  if (principals.length === 0) {
    return {
      evidence: [],
      context: { availability: "available", reasonCodes: ["vo-chinh-dieu"] },
    };
  }

  const evidence: AdapterEvidenceDraft[] = [];
  let missingBrightness = false;
  let unsupported = false;

  for (const star of principals) {
    if (!star.brightness) {
      missingBrightness = true;
      continue;
    }
    const mapped = (adapterPolicy.dignityMapping as Record<string, { direction: "support" | "pressure"; strength: "normal" | "strong" } | null>)[
      star.brightness
    ];
    if (mapped === undefined) {
      unsupported = true;
      diagnostics.unsupportedBrightness.push(`${star.name}:${star.brightness}`);
      continue;
    }
    if (mapped === null) {
      // Bình → no evidence
      continue;
    }

    const cycleKey = `c${ctx.cycle.cycleIndex}-p${ctx.cycle.activePalaceIndex}`;
    evidence.push({
      evidenceId: `mf-v03-dig-${cycleKey}-${star.name}-${star.brightness}`,
      physicalFactId: `principal-dignity:${ctx.cycle.activePalaceIndex}:${star.name}:${star.brightness}`,
      physicalFactKind: "principal-star-dignity",
      evidenceClusterId: `cluster-dignity:${cycleKey}:${star.name}`,
      pillarId: "dia-loi",
      signalFamilyId: "principal-star-dignity",
      direction: mapped.direction,
      strength: mapped.strength,
      temporalScope: "major-fortune",
      factIds: [
        `star:${star.name}`,
        `brightness:${star.brightness}`,
        `palaceIndex:${ctx.cycle.activePalaceIndex}`,
      ],
      sourceIds: SRC,
      claimIds: CLM,
      policyStatus: "research-admitted",
      schoolScope: ["nam-phai", "trung-chau"],
      reasonCode: `dignity:${star.brightness}`,
    });
  }

  if (missingBrightness || unsupported) {
    return {
      evidence,
      context: {
        availability: "partial-data",
        reasonCodes: [
          ...(missingBrightness ? ["missing-brightness"] : []),
          ...(unsupported ? ["unsupported-brightness"] : []),
        ],
      },
    };
  }

  return {
    evidence,
    context: { availability: "available" },
  };
}
