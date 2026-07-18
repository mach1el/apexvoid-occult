export type DiagnosticCode = 
  | "MISSING_REQUIRED_POLICY"
  | "UNSUPPORTED_SCHOOL_RULE"
  | "AMBIGUOUS_AGE_BOUNDARY"
  | "SOURCE_NOT_ACCEPTED"
  | "CONFLICTING_POLICY_SELECTION"
  | "UNRESOLVED_FORTUNE_STEM"
  | "LAYER_CONTAMINATION_DETECTED";

export interface CalculationDiagnostic {
  code: DiagnosticCode;
  severity: "info" | "warning" | "error";
  message: string;
  context?: Record<string, unknown>;
}

export interface UnresolvedCalculationIssue {
  issueId: string;
  description: string;
  affectedFields: string[];
}
