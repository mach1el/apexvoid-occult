/**
 * Ba vùng địa chi cố định trên địa bàn Tử Vi.
 *
 * - mo (tứ mộ/khố): Thìn · Tuất · Sửu · Mùi — tụ, kho, thu liễm
 * - ma (tứ sinh/mã): Dần · Thân · Tỵ · Hợi — trường sinh + chỗ Thiên Mã
 * - bai (tứ bại/chính): Tý · Ngọ · Mão · Dậu — đế vượng / lộ rõ
 *
 * Nguồn định nghĩa: 紫微斗数 四墓 / 四生四马 / 四败 (zhycw, ziweicn).
 * KHÔNG dùng blog gọi nhầm Dần–Thân–Tỵ–Hợi là “tứ mộ”.
 */

export type BranchZone = "mo" | "ma" | "bai";

export const MO_BRANCHES = ["Thìn", "Tuất", "Sửu", "Mùi"] as const;
export const MA_BRANCHES = ["Dần", "Thân", "Tỵ", "Hợi"] as const;
export const BAI_BRANCHES = ["Tý", "Ngọ", "Mão", "Dậu"] as const;

const MO_SET = new Set<string>(MO_BRANCHES);
const MA_SET = new Set<string>(MA_BRANCHES);
const BAI_SET = new Set<string>(BAI_BRANCHES);

export function getBranchZone(branch: string): BranchZone | null {
  if (MO_SET.has(branch)) return "mo";
  if (MA_SET.has(branch)) return "ma";
  if (BAI_SET.has(branch)) return "bai";
  return null;
}

export function isMoBranch(branch: string): boolean {
  return MO_SET.has(branch);
}

export function isMaBranch(branch: string): boolean {
  return MA_SET.has(branch);
}

/** Nhãn tiếng Việt cho breakdown. */
export function zoneLabel(zone: BranchZone): string {
  if (zone === "mo") return "vùng mộ";
  if (zone === "ma") return "vùng mã";
  return "vùng bại";
}

export const XUNG_CHIEU: Record<string, string> = {
  Tý: "Ngọ",
  Sửu: "Mùi",
  Dần: "Thân",
  Mão: "Dậu",
  Thìn: "Tuất",
  Tỵ: "Hợi",
  Ngọ: "Tý",
  Mùi: "Sửu",
  Thân: "Dần",
  Dậu: "Mão",
  Tuất: "Thìn",
  Hợi: "Tỵ",
};

export const TAM_HOP: Record<string, string[]> = {
  Dần: ["Dần", "Ngọ", "Tuất"],
  Ngọ: ["Dần", "Ngọ", "Tuất"],
  Tuất: ["Dần", "Ngọ", "Tuất"],
  Thân: ["Thân", "Tý", "Thìn"],
  Tý: ["Thân", "Tý", "Thìn"],
  Thìn: ["Thân", "Tý", "Thìn"],
  Tỵ: ["Tỵ", "Dậu", "Sửu"],
  Dậu: ["Tỵ", "Dậu", "Sửu"],
  Sửu: ["Tỵ", "Dậu", "Sửu"],
  Hợi: ["Hợi", "Mão", "Mùi"],
  Mão: ["Hợi", "Mão", "Mùi"],
  Mùi: ["Hợi", "Mão", "Mùi"],
};

export type PairGeometry = "dong" | "xung" | "tam-hop";

/** Quan hệ hình học giữa hai chi trên địa bàn. */
export function pairGeometry(a: string, b: string): PairGeometry | null {
  if (a === b) return "dong";
  if (XUNG_CHIEU[a] === b) return "xung";
  const hop = TAM_HOP[a];
  if (hop && hop.includes(b) && a !== b) return "tam-hop";
  return null;
}

/** Hệ số lực cặp: đồng cung > xung > tam hợp. */
export function pairGeometryFactor(
  geometry: PairGeometry,
  tamHopFactor: number,
  xungFactor = 0.85,
): number {
  if (geometry === "dong") return 1;
  if (geometry === "xung") return xungFactor;
  return tamHopFactor;
}

export function geometryLabel(geometry: PairGeometry): string {
  if (geometry === "dong") return "đồng cung";
  if (geometry === "xung") return "xung chiếu";
  return "tam hợp";
}

export function getBranchElement(branch: string): string {
  if (["Dần", "Mão"].includes(branch)) return "Mộc";
  if (["Tỵ", "Ngọ"].includes(branch)) return "Hỏa";
  if (["Thân", "Dậu"].includes(branch)) return "Kim";
  if (["Hợi", "Tý"].includes(branch)) return "Thủy";
  return "Thổ"; // Thìn, Tuất, Sửu, Mùi
}

export interface DaiVanElementFactors {
  /** Hệ số nhân toàn cục cột Cát. */
  cat: number;
  /** Hệ số nhân toàn cục cột Hung. */
  hung: number;
  /** Nhãn phong thủy cho breakdown. */
  label: string;
}

/**
 * Hệ số môi trường Ngũ hành Đại vận (Cung ĐV vs Bản Mệnh).
 * Nguồn: công thức scoring đại vận — nhân toàn cục, không cộng trừ cơ học.
 * subject = ngũ hành cung đại vận; object = ngũ hành bản mệnh.
 */
export function getDaiVanElementFactors(
  palaceElement: string,
  menhElement: string,
): DaiVanElementFactors {
  const generates: Record<string, string> = {
    Kim: "Thủy",
    Thủy: "Mộc",
    Mộc: "Hỏa",
    Hỏa: "Thổ",
    Thổ: "Kim",
  };
  const controls: Record<string, string> = {
    Kim: "Mộc",
    Mộc: "Thổ",
    Thổ: "Thủy",
    Thủy: "Hỏa",
    Hỏa: "Kim",
  };

  // Đồng hành hoặc Cung sinh Mệnh → Thuận vận
  if (
    palaceElement === menhElement ||
    generates[palaceElement] === menhElement
  ) {
    return { cat: 1.2, hung: 0.8, label: "Tương Sinh / Thuận Vận" };
  }
  // Mệnh sinh Cung → Sinh Xuất
  if (generates[menhElement] === palaceElement) {
    return { cat: 1.0, hung: 1.0, label: "Sinh Xuất / Sinh Kế" };
  }
  // Mệnh khắc Cung → Khắc Xuất
  if (controls[menhElement] === palaceElement) {
    return { cat: 0.9, hung: 1.0, label: "Khắc Xuất / Chế Ngự" };
  }
  // Cung khắc Mệnh → Khắc Nhập
  if (controls[palaceElement] === menhElement) {
    return { cat: 0.75, hung: 1.25, label: "Khắc Nhập / Nghịch Vận" };
  }
  return { cat: 1.0, hung: 1.0, label: "Bình hòa" };
}

/** @deprecated Dùng getDaiVanElementFactors — giữ alias để không gãy import cũ. */
export function getElementRelationFactor(
  subject: string,
  object: string,
): number {
  return getDaiVanElementFactors(subject, object).cat;
}

export function extractBaseElement(napAm: string): string {
  if (!napAm) return "Thổ"; // Default
  if (napAm.includes("Kim")) return "Kim";
  if (napAm.includes("Mộc")) return "Mộc";
  if (napAm.includes("Thủy")) return "Thủy";
  if (napAm.includes("Hỏa")) return "Hỏa";
  if (napAm.includes("Thổ")) return "Thổ";
  return "Thổ";
}
