/** Pillar clip helpers — raw may exceed cap; capped must never exceed cap. */

export const MF_V02_CLIP_EPSILON = 1e-9;

export interface PillarClipResult {
  rawDelta: number;
  cappedDelta: number;
  clipped: boolean;
}

export function applyPillarClip(rawDelta: number, cap: number): PillarClipResult {
  if (!Number.isFinite(rawDelta) || !Number.isFinite(cap) || cap < 0) {
    throw new Error(`invalid pillar clip inputs raw=${rawDelta} cap=${cap}`);
  }
  const cappedDelta = Math.min(cap, Math.max(-cap, rawDelta));
  const clipped = Math.abs(rawDelta) > cap + MF_V02_CLIP_EPSILON;
  if (Math.abs(cappedDelta) > cap + MF_V02_CLIP_EPSILON) {
    throw new Error(`cappedDelta ${cappedDelta} exceeds cap ${cap}`);
  }
  return { rawDelta, cappedDelta, clipped };
}

/** Hard-fail only when the clamped value escapes the cap (implementation bug). */
export function isCappedDeltaOutOfBounds(cappedDelta: number, cap: number): boolean {
  return Math.abs(cappedDelta) > cap + MF_V02_CLIP_EPSILON;
}
