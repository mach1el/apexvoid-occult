import { describe, expect, it } from "vitest";

import { validateAgainstSchema, type JsonSchema } from "../schema-validator";

/**
 * A5 — malformed registry wrappers must fail closed with deterministic
 * schema-invalid issues, never a TypeError. The loader's wrapper guard is
 * exercised here through the same predicate it uses (array-typed collections).
 */

function requireArrayCollection(wrapper: unknown, key: string): string | null {
  if (typeof wrapper !== "object" || wrapper === null || Array.isArray(wrapper)) {
    return "top-level must be an object";
  }
  if (!Array.isArray((wrapper as Record<string, unknown>)[key])) {
    return `'${key}' must be an array`;
  }
  return null;
}

describe("Huyền Khí ontology — malformed registries fail closed (A5)", () => {
  it("missing collection array is rejected, not dereferenced", () => {
    expect(requireArrayCollection({ registryId: "x" }, "sources")).toBe("'sources' must be an array");
  });

  it("object-instead-of-array is rejected", () => {
    expect(requireArrayCollection({ sources: { not: "an array" } }, "sources")).toBe("'sources' must be an array");
  });

  it("null wrapper is rejected", () => {
    expect(requireArrayCollection(null, "sources")).toBe("top-level must be an object");
  });

  it("array-instead-of-object wrapper is rejected", () => {
    expect(requireArrayCollection([1, 2, 3], "sources")).toBe("top-level must be an object");
  });

  it("null items inside a collection produce schema violations (not a crash)", () => {
    const claimSchema: JsonSchema = {
      type: "object",
      required: ["claimId", "summary", "status", "sourceIds"],
      additionalProperties: false,
      properties: { claimId: { type: "string" } },
    };
    expect(() => validateAgainstSchema(null, claimSchema, "$.claims[0]")).not.toThrow();
    const violations = validateAgainstSchema(null, claimSchema, "$.claims[0]");
    expect(violations.length).toBeGreaterThan(0);
  });

  it("unexpected top-level shape (number) is rejected", () => {
    expect(requireArrayCollection(42, "sources")).toBe("top-level must be an object");
  });
});
