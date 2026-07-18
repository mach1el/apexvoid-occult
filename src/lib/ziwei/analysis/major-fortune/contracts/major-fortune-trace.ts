export interface CalculationTraceEntry {
  traceId: string;
  stage: string;
  operation: string;

  inputRefs: string[];
  policyId: string;
  ruleId?: string;
  sourceRefs: string[];
  claimRefs?: string[];

  outputPath: string;
  outputValue: unknown;

  deterministic: true;
}
