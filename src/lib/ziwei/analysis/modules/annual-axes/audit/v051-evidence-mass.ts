/**
 * Evidence mass map helpers — row insertion vs aggregate merge are separate.
 */

import type { V051EvidenceMassBreakdown } from "./v051-types";

export function emptyEvidenceBreakdown(): V051EvidenceMassBreakdown {
  return { supportRaw: 0, pressureRaw: 0, count: 0 };
}

/** Insert one evidence row into a dimension map (count += 1). */
export function addEvidenceRow(
  map: Record<string, V051EvidenceMassBreakdown>,
  key: string,
  supportRaw: number,
  pressureRaw: number,
): void {
  const existing = map[key] ?? emptyEvidenceBreakdown();
  existing.supportRaw += supportRaw;
  existing.pressureRaw += pressureRaw;
  existing.count += 1;
  map[key] = existing;
}

/** Merge an already-aggregated breakdown (count += breakdown.count). */
export function mergeEvidenceBreakdown(
  map: Record<string, V051EvidenceMassBreakdown>,
  key: string,
  breakdown: V051EvidenceMassBreakdown,
): void {
  const existing = map[key] ?? emptyEvidenceBreakdown();
  existing.supportRaw += breakdown.supportRaw;
  existing.pressureRaw += breakdown.pressureRaw;
  existing.count += breakdown.count;
  map[key] = existing;
}

export function sumBreakdownCount(
  map: Record<string, V051EvidenceMassBreakdown>,
): number {
  return Object.values(map).reduce((s, v) => s + v.count, 0);
}

export function sumBreakdownSupport(
  map: Record<string, V051EvidenceMassBreakdown>,
): number {
  return Object.values(map).reduce((s, v) => s + v.supportRaw, 0);
}

export function sumBreakdownPressure(
  map: Record<string, V051EvidenceMassBreakdown>,
): number {
  return Object.values(map).reduce((s, v) => s + v.pressureRaw, 0);
}
