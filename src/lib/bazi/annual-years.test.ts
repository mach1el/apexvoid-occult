import { expect, test } from "vitest";
import { generateBaziChart } from "./bazi-engine";
import { getAnnualYears } from "./annual-years";
import { getAnnualPillar } from "./luck-pillars";
import { DEFAULT_CONVENTIONS } from "./conventions";

test("getAnnualYears should return correct number of years", () => {
  const chart = generateBaziChart(new Date("1990-01-01T12:00:00Z"), 105.8, 420, "M");
  
  // Mặc định từ năm sinh đến năm sinh + 80
  const annuals = getAnnualYears(chart);
  expect(annuals.length).toBe(81);
  expect(annuals[0]?.year).toBe(1990);
  expect(annuals[annuals.length - 1]?.year).toBe(2070);
  
  // Nominal age: sinh năm 1990, thì năm 1990 là 1 tuổi
  expect(annuals[0]?.age).toBe(1);
});

test("Chronological age calculation", () => {
  const chart = generateBaziChart(new Date("1990-01-01T12:00:00Z"), 105.8, 420, "M");
  const conventions = { ...DEFAULT_CONVENTIONS, annualAgeMethod: "chronological" as const };
  const annuals = getAnnualYears(chart, undefined, undefined, conventions);
  
  // Chronological age: sinh năm 1990, thì năm 1990 là 0 tuổi
  expect(annuals[0]?.age).toBe(0);
  expect(annuals[1]?.age).toBe(1);
});

test("Luck pillar index is correctly assigned", () => {
  const chart = generateBaziChart(new Date("1990-01-01T12:00:00Z"), 105.8, 420, "M");
  const annuals = getAnnualYears(chart);
  
  // Tìm năm khởi vận của đại vận đầu tiên (index 0)
  const lp0 = chart.luck.pillars[0];
  const startYear0 = lp0!.startDate.getFullYear();
  
  // Năm trước startYear0 thì index là -1
  const beforeStart = annuals.find(a => a.year === startYear0 - 1);
  if (beforeStart) {
    expect(beforeStart.luckPillarIndex).toBe(-1);
  }
  
  // Năm startYear0 thì index là 0
  const atStart = annuals.find(a => a.year === startYear0);
  expect(atStart?.luckPillarIndex).toBe(0);
});
