import { calculateBazi, BaziChart } from "./pillars";
import { getHiddenStems, HiddenStem } from "./hidden-stems";
import { getTenGod } from "./ten-gods";
import { getDaYun, getDaYunStartAge } from "./da-yun";
import { Pillar } from "../calendar/sexagenary";

export interface DaYunPillar {
  pillar: Pillar;
  ageStart: number;
  ageEnd: number;
}

export interface BaziFullChart extends BaziChart {
  startAge: number;
  daYun: DaYunPillar[];
  hiddenStems: {
    year: HiddenStem[];
    month: HiddenStem[];
    day: HiddenStem[];
    hour: HiddenStem[];
  };
  tenGods: {
    year: string;
    month: string;
    hour: string;
  };
}

/**
 * Tính toàn bộ lá số Bát Tự (Tứ trụ, Tàng can, Thập thần, Đại vận)
 */
export function generateBaziChart(date: Date, longitude: number, gender: "M" | "F"): BaziFullChart {
  const chart = calculateBazi(date, longitude, gender);
  
  const startAge = getDaYunStartAge(date, chart.isYangGender);
  const daYun = getDaYun(chart.month, chart.isYangGender, startAge);
  
  const dayMaster = chart.day.stem;
  
  return {
    ...chart,
    startAge,
    daYun,
    hiddenStems: {
      year: getHiddenStems(chart.year.branch),
      month: getHiddenStems(chart.month.branch),
      day: getHiddenStems(chart.day.branch),
      hour: getHiddenStems(chart.hour.branch),
    },
    tenGods: {
      year: getTenGod(dayMaster, chart.year.stem),
      month: getTenGod(dayMaster, chart.month.stem),
      hour: getTenGod(dayMaster, chart.hour.stem),
    }
  };
}
