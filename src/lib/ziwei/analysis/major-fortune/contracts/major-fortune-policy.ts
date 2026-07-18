import type { MajorFortunePolicyTopic } from "./major-fortune-input";

export interface PolicyRule {
  type: string;
  parameters: Record<string, unknown>;
}

export interface MajorFortunePolicy {
  policyId: string;
  ruleId: string;
  topic: MajorFortunePolicyTopic;
  label: string;
  school: "bac-phai" | "nam-phai" | "mixed" | "custom" | "trung-chau" | "unresolved";
  status: "default" | "supported" | "experimental" | "rejected" | "unresolved";
  calculationImpact: boolean;
  interpretationImpact: boolean;
  rule: PolicyRule;
  sourceRefs: string[];
  claimRefs: string[];
  conflictsWith: string[];
  defaultReason?: string;
  overrideAllowed: boolean;
  implementationStatus: "not_started" | "implemented" | "tested";
  legacyRuntimeRefs?: string[];
  notes?: string;
}
