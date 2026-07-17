/**
 * Năng lượng từng sao:
 *   E_star = P_csv × M_pos
 *
 * P_csv lấy từ star-scores.csv. KHÔNG còn hệ số Ngũ Hành Bản Mệnh (M_nh) —
 * thầy chốt bỏ 2026-07-18: trả lại 100% sức mạnh sao theo đúng độ sáng
 * Miếu/Vượng/Đắc/Hãm và Combo Cách Cục, không chiết khấu theo quan hệ
 * Ngũ Hành sao–Mệnh nữa.
 */

import type { ChartStar } from "@/types/chart";
import { findStarScore, type StarScoreRow } from "./star-scores";
import { baseStarName } from "../star-classification";

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

export interface StarEnergy {
  base: string;
  row: StarScoreRow;
  bright: Brightness | null;
  /** P_csv × M_pos (chưa nhân W_cung). */
  energy: number;
  mPos: number;
  anchor: "dac" | "ham" | "base";
}

export function computeStarEnergy(star: ChartStar): StarEnergy | null {
  const base = baseStarName(star.name);
  const row = findStarScore(base) ?? findStarScore(star.name);
  if (!row) return null;

  const bright = parseBrightness(star.brightness);
  const anchor = csvAnchor(row, bright);
  const mPos = brightnessPosFactor(bright, row.tier);
  const energy = anchor.value * mPos;

  return {
    base,
    row,
    bright,
    energy,
    mPos,
    anchor: anchor.key,
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
