/**
 * Năng lượng từng sao theo công thức 6 bước:
 *   E_star = P_csv × M_pos × M_nh
 *
 * P_csv lấy từ star-scores.csv. Ngũ hành sao lấy từ engine.elementForStar
 * (không dùng cột element CSV — lệch phái).
 */

import type { ChartStar } from "@/types/chart";
import { findStarScore, type StarScoreRow } from "./star-scores";
import { baseStarName } from "../star-classification";
import { extractBaseElement } from "./zones";

const GENERATES: Record<string, string> = {
  Kim: "Thủy",
  Thủy: "Mộc",
  Mộc: "Hỏa",
  Hỏa: "Thổ",
  Thổ: "Kim",
};
const CONTROLS: Record<string, string> = {
  Kim: "Mộc",
  Mộc: "Thổ",
  Thổ: "Thủy",
  Thủy: "Hỏa",
  Hỏa: "Kim",
};

export type Brightness = "Miếu" | "Vượng" | "Đắc" | "Bình" | "Hãm";

export function parseBrightness(raw?: string): Brightness | null {
  if (!raw) return null;
  if (raw === "Miếu" || raw === "Vượng" || raw === "Đắc" || raw === "Bình" || raw === "Hãm") {
    return raw;
  }
  return null;
}

/** M_pos — chỉ Tier 1 chính tinh. */
export function brightnessPosFactor(bright: Brightness | null, tier: number): number {
  if (tier !== 1) return 1;
  if (bright === "Miếu") return 1.2;
  if (bright === "Vượng") return 1.1;
  return 1;
}

/**
 * Chọn cột CSV theo độ sáng.
 * Spec: Miếu/Vượng/Đắc → dac; Hãm → ham; Bình/khác → base.
 */
export function csvAnchor(
  row: StarScoreRow,
  bright: Brightness | null,
): { value: number; key: "dac" | "ham" | "base" } {
  if (bright === "Miếu" || bright === "Vượng" || bright === "Đắc") {
    return { value: row.dac, key: "dac" };
  }
  if (bright === "Hãm") return { value: row.ham, key: "ham" };
  return { value: row.base, key: "base" };
}

/**
 * M_nh — chỉ Tier 1 & 2.
 * Mệnh sinh Sao / Đồng hành / Sao sinh Mệnh: ×1.2
 * Mệnh khắc Sao: ×0.9
 * Sao khắc Mệnh: ×0.7
 */
export function starElementFactor(
  starElement: string,
  menhNapAm: string,
  tier: number,
): { factor: number; note: string } {
  if (tier > 2) return { factor: 1, note: "" };
  const menh = extractBaseElement(menhNapAm);
  if (!starElement || !menh) return { factor: 1, note: "" };

  const thuan =
    starElement === menh ||
    GENERATES[starElement] === menh ||
    GENERATES[menh] === starElement;
  if (thuan) return { factor: 1.2, note: "thuận mệnh" };
  if (CONTROLS[menh] === starElement) {
    return { factor: 0.9, note: "mệnh khắc sao" };
  }
  if (CONTROLS[starElement] === menh) {
    return { factor: 0.7, note: "sao khắc mệnh" };
  }
  return { factor: 1, note: "" };
}

export interface StarEnergy {
  base: string;
  row: StarScoreRow;
  bright: Brightness | null;
  /** P_csv × M_pos × M_nh (chưa nhân W_cung). */
  energy: number;
  mPos: number;
  mNh: number;
  anchor: "dac" | "ham" | "base";
  note: string;
}

export function computeStarEnergy(
  star: ChartStar,
  menhNapAm: string,
  elementForStar: (name: string) => string,
): StarEnergy | null {
  const base = baseStarName(star.name);
  const row = findStarScore(base) ?? findStarScore(star.name);
  if (!row) return null;

  const bright = parseBrightness(star.brightness);
  const anchor = csvAnchor(row, bright);
  const mPos = brightnessPosFactor(bright, row.tier);
  const starEl = elementForStar(base) || elementForStar(star.name);
  const { factor: mNh, note } = starElementFactor(starEl, menhNapAm, row.tier);
  const energy = anchor.value * mPos * mNh;

  return {
    base,
    row,
    bright,
    energy,
    mPos,
    mNh,
    anchor: anchor.key,
    note,
  };
}

/**
 * Phân luồng Cát/Hung từ năng lượng đã tính.
 * - Hãm chính tinh (E≤0) → Hung |E|
 * - E > 0 → Cát
 * - E < 0 → Hung |E|
 * - E = 0 → bỏ
 */
export function routeStarEnergy(
  energy: StarEnergy,
): { layer: "cat" | "hung"; points: number } | null {
  const { energy: e, bright, row } = energy;
  if (row.tier === 1 && bright === "Hãm") {
    return { layer: "hung", points: Math.abs(e) };
  }
  if (e > 0) return { layer: "cat", points: e };
  if (e < 0) return { layer: "hung", points: Math.abs(e) };
  return null;
}

/** Sao cứu giải dùng cho Đại Giải Ách / Khoa Chế Không. */
export const GIAI_CUU_NAMES = [
  "Thiên Quan",
  "Thiên Phúc",
  "Thiên Giải",
  "Địa Giải",
  "Ân Quang",
  "Thiên Quý",
  "Thiên Đức",
  "Phúc Đức",
  "Nguyệt Đức",
  "Giải Thần",
  "Long Đức",
] as const;

export const SAT_KHONG_HOA = [
  "Thiên Không",
  "Địa Không",
  "Địa Kiếp",
  "Hỏa Tinh",
  "Linh Tinh",
] as const;
