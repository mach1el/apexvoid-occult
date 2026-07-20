import type { ValidationResult, ValidationIssue } from "./types";

export function validateFixtureMaterialization(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fixtures = data.fixtures.fixtures || [];
  
  fixtures.forEach((f: any, i: number) => {
    if (!f.fixtureId) issues.push({ code: "FIX_MISSING_ID", path: `fixtures[${i}]`, message: "Missing fixtureId", severity: "error" });
    else if (f.fixtureId.startsWith("FIX-")) issues.push({ code: "FIX_INVALID_ID", path: `fixtures[${i}]`, message: "Cannot use FIX-* ids. Use HK-FIX-*", severity: "error" });
    
    if (f.approved !== undefined || f.reviewed !== undefined || f.researchReady === true || f.researchReady === false) {
      issues.push({ code: "FIX_DERIVED_STATUS", path: `fixtures[${i}]`, message: "Cannot contain derived status booleans", severity: "error" });
    }
    
    if (f.inputFacts?.minimalFactSet?.includes("fact1")) {
      issues.push({ code: "FIX_PLACEHOLDER_FACT", path: `fixtures[${i}]`, message: "Contains placeholder fact1", severity: "error" });
    }
    
    if (f.researchQuestion === "Test") {
      issues.push({ code: "FIX_PLACEHOLDER_QUESTION", path: `fixtures[${i}]`, message: "Contains placeholder Test", severity: "error" });
    }
  });

  return { valid: issues.length === 0, issues };
}
