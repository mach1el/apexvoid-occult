import type { ValidationResult, ValidationIssue } from "./types";

export function validateExtractions(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const extractions = data.extractions.extractions || [];
  
  const ids = new Set();
  extractions.forEach((e: any, i: number) => {
    if (!e.extractionId) issues.push({ code: "EXT_MISSING_ID", path: `extractions[${i}]`, message: "Missing extractionId", severity: "error" });
    else if (ids.has(e.extractionId)) issues.push({ code: "EXT_DUPLICATE_ID", path: `extractions[${i}]`, message: "Duplicate extractionId", severity: "error" });
    else ids.add(e.extractionId);
    
    if (!e.locator) issues.push({ code: "EXT_MISSING_LOCATOR", path: `extractions[${i}]`, message: "Missing locator", severity: "error" });
  });

  return { valid: issues.length === 0, issues };
}
