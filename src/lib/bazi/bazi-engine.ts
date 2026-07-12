import { calculateBaziPillars } from "./pillars";
import { getHiddenStems, HiddenStem } from "./hidden-stems";
import { getTenGod } from "./ten-gods";
import { getLuckPillars, LuckPillar } from "./luck-pillars";
import { BaziChart } from "./types";
import { BaziConventions, DEFAULT_CONVENTIONS } from "./conventions";
import { getLifeStage } from "./life-stages";
import { getNayin } from "./nayin";
import { getVoids, isVoid } from "./voids";
import { getConceptionPillar, getLifePalace } from "./derived-pillars";
import { getSymbolicStars, SymbolicStar } from "./symbolic-stars";
import { Pillar } from "../calendar/sexagenary";

export interface BaziPillarDetail {
  pillar: Pillar;
  nayin: string;
  isVoid: boolean;
  tenGod: string; // Đối với Can
  lifeStage: string;
  hiddenStems: { stem: string; type: string; tenGod: string }[];
  stars: SymbolicStar[];
}

export interface DerivedPillarDetail {
  name: string;
  pillar: Pillar;
  nayin: string;
  stars: SymbolicStar[];
}

export interface BaziFullChart extends BaziChart {
  details: {
    year: BaziPillarDetail;
    month: BaziPillarDetail;
    day: BaziPillarDetail;
    hour: BaziPillarDetail;
  };
  voids: [string, string]; // Tuần Không từ Trụ Ngày
  derived: {
    conception: DerivedPillarDetail; // Thai Nguyên
    lifePalace: DerivedPillarDetail; // Mệnh Cung
  };
  luck: {
    startAgeYear: number;
    startAgeMonth: number;
    startAgeDay: number;
    startDate: Date;
    pillars: LuckPillar[];
  };
}

/**
 * Tính toàn bộ lá số Bát Tự chi tiết.
 */
export function generateBaziChart(
  date: Date,
  longitude: number,
  utcOffsetMinutes: number,
  gender: "M" | "F",
  conventions: BaziConventions = DEFAULT_CONVENTIONS
): BaziFullChart {
  const chart = calculateBaziPillars(date, longitude, utcOffsetMinutes, gender, conventions);
  const dayMaster = chart.day.stem;

  const buildPillarDetail = (pillar: Pillar, isDayPillar = false): BaziPillarDetail => {
    const hidden = getHiddenStems(pillar.branch).map(h => ({
      stem: h.stem,
      type: h.type,
      tenGod: getTenGod(dayMaster, h.stem)
    }));

    return {
      pillar,
      nayin: getNayin(pillar),
      isVoid: isDayPillar ? false : isVoid(pillar.branch, chart.day), // Ngày thì không tự Không Vong của chính nó
      tenGod: isDayPillar ? "Nhật Chủ" : getTenGod(dayMaster, pillar.stem),
      lifeStage: getLifeStage(dayMaster, pillar.branch, conventions),
      hiddenStems: hidden,
      stars: getSymbolicStars(pillar.branch, chart.day, chart.year, conventions)
    };
  };

  const conceptionPillar = getConceptionPillar(chart.month);
  const lifePalacePillar = getLifePalace(chart.year.stem, chart.month.branch, chart.hour.branch);

  const luckInfo = getLuckPillars(date, chart.month, chart.isYangGender, conventions);

  return {
    ...chart,
    details: {
      year: buildPillarDetail(chart.year),
      month: buildPillarDetail(chart.month),
      day: buildPillarDetail(chart.day, true),
      hour: buildPillarDetail(chart.hour)
    },
    voids: getVoids(chart.day),
    derived: {
      conception: {
        name: "Thai Nguyên",
        pillar: conceptionPillar,
        nayin: getNayin(conceptionPillar),
        stars: getSymbolicStars(conceptionPillar.branch, chart.day, chart.year, conventions)
      },
      lifePalace: {
        name: "Mệnh Cung",
        pillar: lifePalacePillar,
        nayin: getNayin(lifePalacePillar),
        stars: getSymbolicStars(lifePalacePillar.branch, chart.day, chart.year, conventions)
      }
    },
    luck: {
      startAgeYear: luckInfo.startAgeYear,
      startAgeMonth: luckInfo.startAgeMonth,
      startAgeDay: luckInfo.startAgeDay,
      startDate: luckInfo.startDate,
      pillars: luckInfo.luckPillars
    }
  };
}
