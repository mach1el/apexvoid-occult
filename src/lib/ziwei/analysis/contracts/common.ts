/** Shared contracts for Zi Wei analysis modules. */

import { isPalaceOverviewV1Enabled } from "../feature-flags";
import { loadPalaceOverviewKnowledgeV1 } from "../knowledge";

export type ZiweiAnalysisModule =
  | "palace-overview"
  | "annual-axes"
  | "major-fortune"
  | "monthly-flow";

export type ZiweiAnalysisStatus =
  | {
      status: "unavailable";
      module: ZiweiAnalysisModule;
      reason: "rebuilding" | "invalid-knowledge";
    }
  | {
      status: "available";
      module: ZiweiAnalysisModule;
      version: string;
    };

export function getAnalysisStatus(
  module: ZiweiAnalysisModule,
): ZiweiAnalysisStatus {
  if (module !== "palace-overview") {
    return { status: "unavailable", module, reason: "rebuilding" };
  }

  if (!isPalaceOverviewV1Enabled()) {
    return { status: "unavailable", module, reason: "rebuilding" };
  }

  const loaded = loadPalaceOverviewKnowledgeV1();
  if (!loaded.ok) {
    if (import.meta.env.DEV) {
      console.warn(
        "[palace-overview] invalid knowledge",
        loaded.issues,
      );
    }
    return { status: "unavailable", module, reason: "invalid-knowledge" };
  }

  return {
    status: "available",
    module,
    version: loaded.knowledge.profile.version,
  };
}

export const ANALYSIS_MODULES: ZiweiAnalysisModule[] = [
  "palace-overview",
  "annual-axes",
  "major-fortune",
  "monthly-flow",
];
