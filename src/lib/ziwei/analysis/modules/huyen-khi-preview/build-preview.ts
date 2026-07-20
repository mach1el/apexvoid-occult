import type { ChartData, School } from "@/types/chart";
import {
  factsForPalace,
  normalizeNatalFacts,
  type NatalZiweiFact,
} from "../../facts";
import { makeDiagnostic, sortDiagnostics } from "./diagnostics";
import { oppositePalaceIndex, trinePalaceIndexes } from "./geometry";
import {
  emptyDimensionStates,
  type HuyenKhiPreviewDiagnostic,
  type HuyenKhiPreviewPalace,
  type HuyenKhiPreviewResult,
  type HuyenKhiPreviewStar,
  type HuyenKhiPreviewTransformation,
  type HuyenKhiPreviewVoidMarker,
} from "./types";

const VERSIONS = {
  contractVersion: "0.1.0",
  adapterVersion: "0.1.0",
  copyVersion: "0.1.0",
} as const;

function compareByFactId(a: { factId: string }, b: { factId: string }): number {
  return a.factId.localeCompare(b.factId);
}

function toStar(fact: NatalZiweiFact): HuyenKhiPreviewStar | null {
  if (fact.kind !== "star" || !fact.starName || !fact.canonicalStarName) return null;
  return {
    factId: fact.id,
    starName: fact.starName,
    canonicalStarName: fact.canonicalStarName,
    brightness: fact.brightness,
  };
}

function toTransformation(fact: NatalZiweiFact): HuyenKhiPreviewTransformation | null {
  if (fact.kind !== "transformation" || !fact.transformation || !fact.targetStar) {
    return null;
  }
  return {
    factId: fact.id,
    transformation: fact.transformation,
    targetStar: fact.targetStar,
  };
}

function toVoid(fact: NatalZiweiFact): HuyenKhiPreviewVoidMarker | null {
  if (fact.kind !== "void-marker" || !fact.voidType) return null;
  return {
    factId: fact.id,
    voidType: fact.voidType,
  };
}

function unavailableResult(
  school: School,
  diagnostics: HuyenKhiPreviewDiagnostic[],
): HuyenKhiPreviewResult {
  return {
    module: "huyen-khi",
    mode: "research-preview",
    evaluatorStatus: "not-promoted",
    status: "unavailable",
    school,
    palaces: [],
    diagnostics: sortDiagnostics(diagnostics),
    versions: VERSIONS,
  };
}

/**
 * Build a natal-only Huyền Khí research preview.
 * No scores, no evaluator states, no temporal facts.
 */
export function buildHuyenKhiPreview(
  chart: ChartData,
  options: { school: School },
): HuyenKhiPreviewResult {
  const { school } = options;
  const diagnostics: HuyenKhiPreviewDiagnostic[] = [];

  if (!chart.palaces || chart.palaces.length !== 12) {
    diagnostics.push(
      makeDiagnostic(
        "invalid-chart",
        `expected 12 palaces, got ${chart.palaces?.length ?? 0}`,
      ),
    );
    return unavailableResult(school, diagnostics);
  }

  const indexes = chart.palaces.map((p) => p.index).sort((a, b) => a - b);
  const uniqueIndexes = new Set(indexes);
  if (uniqueIndexes.size !== 12 || indexes.some((i, n) => i !== n)) {
    diagnostics.push(
      makeDiagnostic("invalid-chart", "palace indexes must be unique 0..11"),
    );
    return unavailableResult(school, diagnostics);
  }

  const { facts, duplicateIds } = normalizeNatalFacts(chart, { school });

  for (const id of [...duplicateIds].sort()) {
    diagnostics.push(
      makeDiagnostic("duplicate-natal-fact-id", `duplicate natal fact id ${id}`, {
        factId: id,
      }),
    );
  }

  for (const fact of facts) {
    if (fact.layer !== "natal") {
      diagnostics.push(
        makeDiagnostic("unsupported-natal-fact", `non-natal fact ${fact.id}`, {
          factId: fact.id,
          palaceIndex: fact.palaceIndex,
        }),
      );
    }
    if (fact.school !== school) {
      diagnostics.push(
        makeDiagnostic(
          "school-mismatch",
          `fact school ${fact.school} != requested ${school}`,
          { factId: fact.id, palaceIndex: fact.palaceIndex },
        ),
      );
    }
  }

  const menhPalaces = chart.palaces.filter((p) => p.isMenh);
  const thanPalaces = chart.palaces.filter((p) => p.isThan);

  if (menhPalaces.length === 0) {
    diagnostics.push(makeDiagnostic("missing-menh", "no Mệnh palace flagged"));
  } else if (menhPalaces.length > 1) {
    diagnostics.push(
      makeDiagnostic("multiple-menh", `found ${menhPalaces.length} Mệnh palaces`),
    );
  }

  if (thanPalaces.length === 0) {
    diagnostics.push(makeDiagnostic("missing-than", "no Thân palace flagged"));
  } else if (thanPalaces.length > 1) {
    diagnostics.push(
      makeDiagnostic("multiple-than", `found ${thanPalaces.length} Thân palaces`),
    );
  }

  const byIndex = new Map(chart.palaces.map((p) => [p.index, p]));
  const majorsByPalace = new Map<number, HuyenKhiPreviewStar[]>();

  for (let i = 0; i < 12; i += 1) {
    const palaceFacts = factsForPalace(facts, i);
    const majors: HuyenKhiPreviewStar[] = [];
    for (const fact of palaceFacts) {
      if (fact.kind === "star" && fact.starClass === "major") {
        const star = toStar(fact);
        if (star) majors.push(star);
      }
    }
    majors.sort(compareByFactId);
    majorsByPalace.set(i, majors);
  }

  const palaces: HuyenKhiPreviewPalace[] = [];

  for (let i = 0; i < 12; i += 1) {
    const palace = byIndex.get(i);
    if (!palace) {
      diagnostics.push(
        makeDiagnostic("missing-palace", `missing palace at index ${i}`, {
          palaceIndex: i,
        }),
      );
      continue;
    }

    const palaceFacts = factsForPalace(facts, i);
    const majorStars: HuyenKhiPreviewStar[] = [];
    const minorStars: HuyenKhiPreviewStar[] = [];
    const natalTransformations: HuyenKhiPreviewTransformation[] = [];
    const voidMarkers: HuyenKhiPreviewVoidMarker[] = [];
    let changShengStage: string | null = null;

    for (const fact of palaceFacts) {
      if (fact.kind === "star") {
        const star = toStar(fact);
        if (!star) continue;
        if (fact.starClass === "major") majorStars.push(star);
        else minorStars.push(star);
      } else if (fact.kind === "transformation") {
        const tf = toTransformation(fact);
        if (tf) natalTransformations.push(tf);
      } else if (fact.kind === "void-marker") {
        const v = toVoid(fact);
        if (v) voidMarkers.push(v);
      } else if (fact.kind === "chang-sheng" && fact.changShengStage) {
        changShengStage = fact.changShengStage;
      }
    }

    majorStars.sort(compareByFactId);
    minorStars.sort(compareByFactId);
    natalTransformations.sort(compareByFactId);
    voidMarkers.sort(compareByFactId);

    const opp = oppositePalaceIndex(i);
    const borrowedMajorStars = [...(majorsByPalace.get(opp) ?? [])];

    palaces.push({
      palaceIndex: i,
      palaceName: palace.name,
      branch: palace.branch,
      stem: palace.stem ?? null,
      isMenh: Boolean(palace.isMenh),
      isThan: Boolean(palace.isThan),
      changShengStage: changShengStage ?? palace.changSheng?.trim() ?? null,
      isVoChinhDieu: majorStars.length === 0,
      oppositePalaceIndex: opp,
      trinePalaceIndexes: trinePalaceIndexes(i),
      majorStars,
      minorStars,
      natalTransformations,
      voidMarkers,
      borrowedMajorStars,
      dimensionStates: emptyDimensionStates(),
      dimensionStateReason: "symbolic-evaluator-not-promoted",
    });
  }

  palaces.sort((a, b) => a.palaceIndex - b.palaceIndex);

  const blocking = new Set([
    "invalid-chart",
    "missing-menh",
    "multiple-menh",
    "missing-than",
    "multiple-than",
    "missing-palace",
  ]);
  const hasBlocking = diagnostics.some((d) => blocking.has(d.code));
  const hasSoft = diagnostics.some((d) => !blocking.has(d.code));

  let status: HuyenKhiPreviewResult["status"] = "available";
  if (palaces.length !== 12 || hasBlocking) status = "unavailable";
  else if (hasSoft) status = "partial";

  if (status === "unavailable" && palaces.length !== 12) {
    return unavailableResult(school, diagnostics);
  }

  return {
    module: "huyen-khi",
    mode: "research-preview",
    evaluatorStatus: "not-promoted",
    status,
    school,
    palaces: status === "unavailable" ? [] : palaces,
    diagnostics: sortDiagnostics(diagnostics),
    versions: VERSIONS,
  };
}
