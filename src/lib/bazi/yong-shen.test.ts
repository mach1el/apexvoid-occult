import { expect, test } from "vitest";
import { generateBaziChart } from "./bazi-engine";
import { calculateElementStrength } from "./element-strength";
import { determineYongShen } from "./yong-shen";

test("YongShen PhuUc logic", () => {
  const chart = generateBaziChart(new Date("1990-01-01T12:00:00Z"), 105.8, 420, "M");
  const strength = calculateElementStrength(chart);
  const result = determineYongShen(strength);
  
  expect(result.method).toBe("phu-uc");
  expect(["vượng", "nhược", "trung hòa"]).toContain(result.dayMasterVerdict);
  expect(result.reasoning.length).toBeGreaterThan(0);
  
  if (result.dayMasterVerdict !== "trung hòa") {
    expect(result.hyThan.length).toBeGreaterThan(0);
  }
});
