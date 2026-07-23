import type { ChartPalace, ChartStar } from "@/types/chart";

export type StarPatternId =
  | "sat-pha-tham"
  | "co-nguyet-dong-luong"
  | "tu-vi-thien-phu"
  | "nhat-nguyet";

export type StarPatternCompatibility =
  | "same-pattern"
  | "cross-pattern"
  | "mixed-or-unsupported"
  | "missing-data";

export interface StarPatternCatalogEntry {
  patternId: StarPatternId;
  stars: readonly string[];
  mode: "all";
}

export const STAR_PATTERN_CATALOG: readonly StarPatternCatalogEntry[] = [
  { patternId: "sat-pha-tham", stars: ["Thất Sát", "Phá Quân", "Tham Lang"], mode: "all" },
  {
    patternId: "co-nguyet-dong-luong",
    stars: ["Thiên Cơ", "Thái Âm", "Thiên Đồng", "Thiên Lương"],
    mode: "all",
  },
  { patternId: "tu-vi-thien-phu", stars: ["Tử Vi", "Thiên Phủ"], mode: "all" },
  { patternId: "nhat-nguyet", stars: ["Thái Dương", "Thái Âm"], mode: "all" },
];

function natalStarNames(stars: readonly ChartStar[] | undefined): Set<string> {
  return new Set(
    (stars ?? []).filter((s) => (s.source ?? "natal") === "natal").map((s) => s.name),
  );
}

function setHasAll(present: ReadonlySet<string>, required: readonly string[]): boolean {
  return required.length > 0 && required.every((n) => present.has(n));
}

/**
 * Detect exactly one catalog pattern on a palace.
 * Multiple overlapping catalog hits → mixed; none → null.
 */
export function detectPalacePattern(
  palace: ChartPalace | null | undefined,
): { status: "identified"; patternId: StarPatternId } | { status: "mixed" } | { status: "none" } | { status: "missing-data" } {
  if (!palace) return { status: "missing-data" };
  const present = natalStarNames(palace.stars);
  if (present.size === 0) return { status: "missing-data" };
  const hits = STAR_PATTERN_CATALOG.filter((p) => setHasAll(present, p.stars)).map((p) => p.patternId);
  if (hits.length === 0) return { status: "none" };
  if (hits.length > 1) return { status: "mixed" };
  return { status: "identified", patternId: hits[0]! };
}

export function resolveStarPatternCompatibility(
  natalMenhPalace: ChartPalace | null | undefined,
  activeMajorFortunePalace: ChartPalace | null | undefined,
): {
  compatibility: StarPatternCompatibility;
  natalPatternId: StarPatternId | null;
  fortunePatternId: StarPatternId | null;
} {
  const natal = detectPalacePattern(natalMenhPalace);
  const fortune = detectPalacePattern(activeMajorFortunePalace);

  if (natal.status === "missing-data" || fortune.status === "missing-data") {
    return { compatibility: "missing-data", natalPatternId: null, fortunePatternId: null };
  }
  if (natal.status === "mixed" || fortune.status === "mixed" || natal.status === "none" || fortune.status === "none") {
    return {
      compatibility: "mixed-or-unsupported",
      natalPatternId: natal.status === "identified" ? natal.patternId : null,
      fortunePatternId: fortune.status === "identified" ? fortune.patternId : null,
    };
  }
  // both identified
  if (natal.patternId === fortune.patternId) {
    return {
      compatibility: "same-pattern",
      natalPatternId: natal.patternId,
      fortunePatternId: fortune.patternId,
    };
  }
  return {
    compatibility: "cross-pattern",
    natalPatternId: natal.patternId,
    fortunePatternId: fortune.patternId,
  };
}
