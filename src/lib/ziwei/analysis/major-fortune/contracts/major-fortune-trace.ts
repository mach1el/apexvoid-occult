export interface CalculationTraceEntry {
  traceId: string;
  stage: string;
  operation: string;

  inputRefs: string[];
  policyId: string;
  sourceRefs: string[];

  outputPath: string;
  outputValue: unknown;

  deterministic: true;
}
