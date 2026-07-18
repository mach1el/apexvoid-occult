/** Shared contracts for Zi Wei analysis modules. */

import { isAnnualAxesV02Enabled, isPalaceOverviewV1Enabled } from "../feature-flags";
import { loadAnnualAxesKnowledgeV0 } from "../knowledge/annual-axes";
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
  if (module === "palace-overview") {
    if (!isPalaceOverviewV1Enabled()) {
      return { status: "unavailable", module, reason: "rebuilding" };
    }
    const loaded = loadPalaceOverviewKnowledgeV1();
    if (!loaded.ok) {
      if (import.meta.env.DEV) {
        console.warn("[palace-overview] invalid knowledge", loaded.issues);
      }
      return { status: "unavailable", module, reason: "invalid-knowledge" };
    }
    return { status: "available", module, version: loaded.knowledge.profile.version };
  }

  if (module === "annual-axes") {
    if (!isAnnualAxesV02Enabled()) {
      return { status: "unavailable", module, reason: "rebuilding" };
    }
    const loaded = loadAnnualAxesKnowledgeV0();
    if (!loaded.ok) {
      if (import.meta.env.DEV) {
        console.warn("[annual-axes] invalid knowledge", loaded.issues);
      }
      return { status: "unavailable", module, reason: "invalid-knowledge" };
    }
    return {
      status: "available",
      module,
      version: `${loaded.knowledge.scoringProfile.profileId}@${loaded.knowledge.scoringProfile.schemaVersion}`,
    };
  }

  // major-fortune and monthly-flow intentionally remain "rebuilding" —
  // their scoring engines exist but no UI has been published yet.
  return { status: "unavailable", module, reason: "rebuilding" };
}

export const ANALYSIS_MODULES: ZiweiAnalysisModule[] = [
  "palace-overview",
  "annual-axes",
  "major-fortune",
  "monthly-flow",
];
