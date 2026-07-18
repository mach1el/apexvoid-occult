import type { PalaceEvidence, PalaceEvidenceAxes } from "./types";
import { addAxes, emptyAxes } from "./types";

export function aggregateEvidence(evidence: PalaceEvidence[]): PalaceEvidenceAxes {
  return evidence.reduce(
    (acc, item) => addAxes(acc, item.axes),
    emptyAxes(),
  );
}

export function topDrivers(
  evidence: PalaceEvidence[],
  axis: "support" | "pressure",
  limit = 3,
): PalaceEvidence[] {
  return [...evidence]
    .filter((e) => e.axes[axis] > 0)
    .sort((a, b) => b.axes[axis] - a.axes[axis])
    .slice(0, limit);
}
