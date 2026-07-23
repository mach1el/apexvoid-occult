/**
 * Epsilon-safe scoreState for Major Fortune V0.2.
 *
 * Uses net capped delta and executable contribution mass — never sum(abs(pillarRaw)).
 */

export type MajorFortuneV02ScoreState =
  | "no-signal"
  | "balanced-signal"
  | "scored"
  | "partial-data"
  | "unavailable";

export const MF_V02_RAW_ZERO_EPSILON = 1e-9;

export function isEffectivelyZeroDelta(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  return Math.abs(value) <= MF_V02_RAW_ZERO_EPSILON;
}

export interface ClassifyMajorFortuneV02ScoreStateInput {
  /** Count of executable numeric contributions across all pillars. */
  matchedExecutableContributionCount: number;
  /** sum(pillar capped deltas) — preserves opposing signs. */
  netCappedDelta: number;
  /** sum(|executable contribution rawDelta|) — signal mass. */
  signalMass: number;
  hasPartialData: boolean;
  unavailable: boolean;
}

export function classifyMajorFortuneV02ScoreState(
  input: ClassifyMajorFortuneV02ScoreStateInput,
): MajorFortuneV02ScoreState {
  if (input.unavailable) return "unavailable";
  if (!Number.isFinite(input.netCappedDelta) || !Number.isFinite(input.signalMass)) {
    throw new Error(
      `V0.2 scoreState requires finite netCappedDelta/signalMass; got ${String(input.netCappedDelta)} / ${String(input.signalMass)}`,
    );
  }
  if (input.hasPartialData) return "partial-data";

  const netZero = isEffectivelyZeroDelta(input.netCappedDelta);
  if (input.matchedExecutableContributionCount === 0 && netZero) return "no-signal";
  if (input.matchedExecutableContributionCount > 0 && netZero) return "balanced-signal";
  return "scored";
}
