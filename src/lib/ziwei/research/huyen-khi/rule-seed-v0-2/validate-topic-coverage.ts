import type { ValidationResult, ValidationIssue } from "./types";

export function validateTopicCoverage(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const topics = data.topics.topics || [];
  
  if (!Array.isArray(topics)) {
    return { valid: false, issues: [{ code: "TOPIC_ARRAY", path: "topics", message: "topics must be an array", severity: "error" }] };
  }
  
  if (topics.length !== 28) {
    issues.push({ code: "TOPIC_COUNT", path: "topics", message: `Expected 28 topics, found ${topics.length}`, severity: "error" });
  }

  const ids = new Set();
  topics.forEach((t: any, i: number) => {
    if (!t.topicId) issues.push({ code: "TOPIC_MISSING_ID", path: `topics[${i}]`, message: "Topic missing topicId", severity: "error" });
    else if (ids.has(t.topicId)) issues.push({ code: "TOPIC_DUPLICATE_ID", path: `topics[${i}]`, message: `Duplicate topicId ${t.topicId}`, severity: "error" });
    else ids.add(t.topicId);
  });

  return { valid: issues.length === 0, issues };
}
