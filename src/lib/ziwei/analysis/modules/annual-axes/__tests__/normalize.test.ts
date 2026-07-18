import { describe, expect, it } from "vitest";
import { loadAnnualAxesKnowledgeV0 } from "../../../knowledge/annual-axes";
import { normalizeAnnualAxes } from "../normalize";

describe("normalizeAnnualAxes — annual-calibration-fixtures.v0", () => {
  const loaded = loadAnnualAxesKnowledgeV0();
  if (!loaded.ok) throw new Error("annual axes knowledge failed to load");
  const { scoringProfile, calibrationFixtures } = loaded.knowledge;

  it.each(calibrationFixtures.cases)("$fixtureId — $label", (fixture) => {
    const result = normalizeAnnualAxes(fixture.rawAxes, scoringProfile);

    expect(result.score).toBeCloseTo(fixture.expected.score, 1);
    expect(result.intensity).toBe(fixture.expected.intensity);
    expect(result.conflict).toBe(fixture.expected.conflict);
    expect(result.normalizedAxes.support).toBeCloseTo(fixture.expected.normalized.support, 5);
    expect(result.normalizedAxes.pressure).toBeCloseTo(fixture.expected.normalized.pressure, 5);
    expect(result.normalizedAxes.stability).toBeCloseTo(fixture.expected.normalized.stability, 5);
    expect(result.normalizedAxes.activation).toBeCloseTo(fixture.expected.normalized.activation, 5);
  });
});
