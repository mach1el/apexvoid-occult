import type { CalculationTraceEntry } from "./major-fortune-trace";
import type { CalculationDiagnostic, UnresolvedCalculationIssue } from "./major-fortune-diagnostics";

export interface TransformationReference {
  mutagen: string;
  starName: string;
}

export interface MajorFortuneCalculationResult {
  schemaVersion: string;
  engineVersion: string;
  policyProfileId: string;

  cycle: {
    cycleIndex: number;
    sequenceNumber: number;
    startAge: number;
    endAge: number;
    startDate?: string;
    endDate?: string;
    direction: "forward" | "reverse";
  };

  position: {
    natalPalaceId: string;
    palaceBranch: string;
    palaceName: string;
  };

  derived: {
    fortuneStem?: string;
    fortuneTransformations?: TransformationReference[];
  };

  inheritedNatalContext: {
    stars: string[];
    palaceStateRefs: string[];
    structuralRelationRefs: string[];
  };

  trace: CalculationTraceEntry[];
  diagnostics: CalculationDiagnostic[];
  unresolved: UnresolvedCalculationIssue[];
}
