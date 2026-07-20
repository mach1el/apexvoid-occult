import { describe, it, expect } from "vitest";
import { validateTopicCoverage } from "../validate-topic-coverage";

describe("Rule Seed Validation", () => {
  it("requires exactly 28 topics", () => {
    expect(validateTopicCoverage({ topics: [] }).valid).toBe(false);
  });
});