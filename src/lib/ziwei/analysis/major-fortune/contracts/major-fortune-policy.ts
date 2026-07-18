export interface PolicyRule {
  type: string;
  parameters: Record<string, unknown>;
}

export interface MajorFortunePolicy {
  policyId: string;
  topic: string;
  label: string;
  school: "bac-phai" | "nam-phai" | "mixed" | "custom" | "trung-chau";
  status: "default" | "supported" | "experimental" | "rejected" | "unresolved";
  calculationImpact: boolean;
  interpretationImpact: boolean;
  rule: PolicyRule;
  sourceRefs: string[];
  conflictsWith: string[];
  defaultReason?: string;
  overrideAllowed: boolean;
}
