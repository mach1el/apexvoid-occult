import type { ValidationResult, ValidationIssue } from "./types";

export function validateCandidateRules(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rules = data.rules.rules || [];
  
  const ids = new Set();
  rules.forEach((r: any, i: number) => {
    if (r.effective !== false) issues.push({ code: "RULE_MUST_BE_NON_EFFECTIVE", path: `rules[${i}]`, message: "effective must be false", severity: "error" });
    
    if (!r.ruleId) issues.push({ code: "RULE_MISSING_ID", path: `rules[${i}]`, message: "Missing ruleId", severity: "error" });
    else if (ids.has(r.ruleId)) issues.push({ code: "RULE_DUPLICATE_ID", path: `rules[${i}]`, message: "Duplicate ruleId", severity: "error" });
    else ids.add(r.ruleId);
    
    if (!r.effects || r.effects.length === 0) {
      issues.push({ code: "RULE_NO_EFFECTS", path: `rules[${i}]`, message: "Rule must have effects", severity: "error" });
    }
  });

  return { valid: issues.length === 0, issues };
}
