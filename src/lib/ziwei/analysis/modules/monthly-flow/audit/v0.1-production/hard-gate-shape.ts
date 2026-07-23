/** Shared hard-gate zero targets for Monthly Flow V0.1 production. */
export const hardGateShape = {
  determinismFailures: 0,
  scoreBoundFailures: 0,
  duplicatePhysicalFactFailures: 0,
  missingSourceIds: 0,
  providerSchoolMismatch: 0,
  fabricatedLeapMonthCount: 0,
} as const;
