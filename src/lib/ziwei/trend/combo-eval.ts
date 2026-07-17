/**
 * Evaluator cách cục declarative — đọc COMBO_RULES, áp predicate theo id.
 * Nguồn điều kiện: cach_cuc_tu_vi.txt.
 */

import type { ChartData, ChartPalace, ChartStar } from "@/types/chart";
import { baseStarName, isAnnualStar } from "../star-classification";
import { COMBO_RULES, type ComboRule } from "./combo-rules";
import { isMutagenStar, mutagenKind } from "./util";
import { GIAI_CUU_NAMES } from "./star-energy";
import { XUNG_CHIEU } from "./zones";

export interface FrameRow {
  palace: ChartPalace;
  role: "focus" | "tam-hop" | "xung";
  weight: number;
}

export interface ComboHit {
  rule: ComboRule;
  reason: string;
}

interface StarLoc {
  base: string;
  name: string;
  branch: string;
  palaceName: string;
  role: FrameRow["role"];
  brightness?: string;
  star: ChartStar;
}

function collectStars(frame: FrameRow[], includeAnnual: boolean): StarLoc[] {
  const out: StarLoc[] = [];
  for (const { palace, role } of frame) {
    for (const star of palace.stars ?? []) {
      if (!includeAnnual && isAnnualStar(star)) continue;
      out.push({
        base: baseStarName(star.name),
        name: star.name,
        branch: palace.branch,
        palaceName: palace.name,
        role,
        brightness: star.brightness,
        star,
      });
    }
  }
  return out;
}

function isCatBright(b?: string): boolean {
  return b === "Miếu" || b === "Vượng" || b === "Đắc";
}
function isHam(b?: string): boolean {
  return b === "Hãm";
}
function isKy(s: StarLoc): boolean {
  return (
    s.base === "Hóa Kỵ" ||
    /Hóa Kỵ/.test(s.name) ||
    (isMutagenStar(s.star) && mutagenKind(s.star) === "Kỵ")
  );
}
function isLoc(s: StarLoc): boolean {
  return (
    s.base === "Lộc Tồn" ||
    s.base === "Hóa Lộc" ||
    (isMutagenStar(s.star) && mutagenKind(s.star) === "Lộc")
  );
}
function isQuyen(s: StarLoc): boolean {
  return (
    s.base === "Hóa Quyền" ||
    (isMutagenStar(s.star) && mutagenKind(s.star) === "Quyền")
  );
}
function isKhoa(s: StarLoc): boolean {
  return (
    s.base === "Hóa Khoa" ||
    (isMutagenStar(s.star) && mutagenKind(s.star) === "Khoa")
  );
}
function hasBase(stars: StarLoc[], ...names: string[]): boolean {
  return names.every((n) => stars.some((s) => s.base === n));
}
function hasAny(stars: StarLoc[], ...names: string[]): boolean {
  return names.some((n) => stars.some((s) => s.base === n));
}
function ofBase(stars: StarLoc[], name: string): StarLoc[] {
  return stars.filter((s) => s.base === name);
}

const LUC_SAT = [
  "Kình Dương",
  "Đà La",
  "Hỏa Tinh",
  "Linh Tinh",
  "Địa Không",
  "Địa Kiếp",
  "Thiên Không",
];

function neighborBranches(branch: string): [string, string] | null {
  const ring = [
    "Dần",
    "Mão",
    "Thìn",
    "Tỵ",
    "Ngọ",
    "Mùi",
    "Thân",
    "Dậu",
    "Tuất",
    "Hợi",
    "Tý",
    "Sửu",
  ];
  const i = ring.indexOf(branch);
  if (i < 0) return null;
  return [ring[(i + 11) % 12]!, ring[(i + 1) % 12]!];
}

function nhiHopBranch(branch: string): string | null {
  // Nhị hợp: Tý-Sửu, Dần-Hợi, Mão-Tuất, Thìn-Dậu, Tỵ-Thân, Ngọ-Mùi
  const map: Record<string, string> = {
    Tý: "Sửu",
    Sửu: "Tý",
    Dần: "Hợi",
    Hợi: "Dần",
    Mão: "Tuất",
    Tuất: "Mão",
    Thìn: "Dậu",
    Dậu: "Thìn",
    Tỵ: "Thân",
    Thân: "Tỵ",
    Ngọ: "Mùi",
    Mùi: "Ngọ",
  };
  return map[branch] ?? null;
}

type Pred = (
  stars: StarLoc[],
  frame: FrameRow[],
  chart: ChartData,
) => string | null;

const PREDICATES: Record<string, Pred> = {
  CAT_01(stars) {
    const tu = ofBase(stars, "Tử Vi").some((s) => s.brightness === "Miếu" || s.brightness === "Vượng");
    const phu = ofBase(stars, "Thiên Phủ").some((s) => s.brightness === "Miếu" || s.brightness === "Vượng");
    if (!(tu || phu)) return null;
    if (!hasBase(stars, "Tả Phụ", "Hữu Bật")) return null;
    return "Tử/Phủ Miếu·Vượng + Tả Hữu";
  },
  CAT_02(stars) {
    const spt = ["Thất Sát", "Phá Quân", "Tham Lang"];
    if (!spt.every((n) => ofBase(stars, n).some((s) => isCatBright(s.brightness)))) return null;
    const hoaLinhDac = ["Hỏa Tinh", "Linh Tinh"].some((n) =>
      ofBase(stars, n).some((s) => isCatBright(s.brightness)),
    );
    const tuHoaCat = stars.some((s) => isLoc(s) || isQuyen(s) || isKhoa(s));
    if (!hoaLinhDac && !tuHoaCat) return null;
    return "Sát Phá Tham Miếu/Đắc + Hỏa Linh/Tứ Hóa";
  },
  CAT_03(stars) {
    // Cát/Hung độc lập: Không/Kiếp/Đà/Linh cộng Hung riêng, không hủy Tam Hóa.
    if (!(stars.some(isLoc) && stars.some(isQuyen) && stars.some(isKhoa))) {
      return null;
    }
    return "Tam Hóa Liên Châu";
  },
  CAT_04(stars) {
    const need = ["Thiên Cơ", "Thái Âm", "Thiên Đồng", "Thiên Lương"];
    if (!need.every((n) => ofBase(stars, n).some((s) => isCatBright(s.brightness)))) return null;
    return "Cơ Nguyệt Đồng Lương Miếu/Đắc";
  },
  CAT_05(stars, frame) {
    const duong = ofBase(stars, "Thái Dương").find((s) => s.branch === "Ngọ" || s.branch === "Tỵ");
    const am = ofBase(stars, "Thái Âm").find((s) => s.branch === "Tý" || s.branch === "Hợi");
    if (!duong || !am) return null;
    const axis = frame.some((r) => ["Mệnh", "Quan Lộc", "Tài Bạch"].includes(r.palace.name));
    if (!axis) return null;
    return "Nhật Nguyệt Tịnh Minh";
  },
  CAT_06(stars) {
    const cu = ofBase(stars, "Cự Môn").find((s) => s.branch === "Tý" || s.branch === "Ngọ");
    if (!cu) return null;
    if (!(stars.some(isLoc) || stars.some(isKhoa) || hasBase(stars, "Lộc Tồn"))) return null;
    return "Thạch Trung Ẩn Ngọc";
  },
  CAT_07(stars) {
    for (const branch of ["Sửu", "Mùi"]) {
      const same = stars.filter((s) => s.branch === branch);
      if (!hasBase(same, "Tham Lang", "Vũ Khúc")) continue;
      if (same.some(isLoc) || same.some(isQuyen) || hasBase(same, "Hỏa Tinh")) {
        return `Tham Vũ đồng hành ${branch}`;
      }
    }
    return null;
  },
  CAT_08(stars) {
    if (!stars.some(isLoc)) return null;
    const ma = ofBase(stars, "Thiên Mã").find((s) => !isHam(s.brightness));
    if (!ma) return null;
    return "Lộc Mã Giao Trì";
  },
  CAT_10(stars) {
    const mui = stars.filter((s) => s.branch === "Mùi");
    if (!hasBase(mui, "Liêm Trinh", "Thất Sát")) return null;
    if (!(mui.some(isLoc) || hasBase(mui, "Tả Phụ") || hasBase(mui, "Hữu Bật"))) return null;
    return "Hùng Tú Càn Nguyên";
  },
  CAT_11(stars) {
    if (!hasBase(stars, "Thái Dương", "Thiên Lương", "Văn Xương")) return null;
    if (!stars.some(isLoc)) return null;
    return "Dương Lương Xương Lộc";
  },
  CAT_12(stars) {
    const need = ["Thiên Khôi", "Thiên Việt", "Văn Xương", "Văn Khúc"];
    if (!need.every((n) => ofBase(stars, n).some((s) => isCatBright(s.brightness) || !s.brightness))) {
      return null;
    }
    return "Bộ Tứ Văn Tinh";
  },
  CAT_13(stars) {
    if (!hasBase(stars, "Phục Binh", "Tướng Quân", "Quốc Ấn")) return null;
    if (!ofBase(stars, "Thiên Hình").some((s) => isCatBright(s.brightness) || !isHam(s.brightness))) {
      return null;
    }
    return "Binh Hình Tướng Ấn";
  },
  CAT_14(stars) {
    if (!hasBase(stars, "Tấu Thư", "Văn Xương", "Văn Khúc")) return null;
    if (!stars.some(isKhoa)) return null;
    return "Tấu Thư Xương Khúc";
  },
  CAT_15(stars, frame) {
    const focus = frame.find((r) => r.role === "focus");
    if (!focus) return null;
    const focusStars = stars.filter((s) => s.branch === focus.palace.branch);
    const hop = nhiHopBranch(focus.palace.branch);
    if (!hop) return null;
    const hopStars = stars.filter((s) => s.branch === hop);
    const focusLoc = focusStars.some(isLoc);
    const hopLoc = hopStars.some(isLoc);
    if (!(focusLoc && hopLoc)) return null;
    return "Minh Lộc Ám Lộc";
  },
  CAT_16(stars, frame) {
    const focus = frame.find((r) => r.role === "focus");
    if (!focus) return null;
    if (!["Mệnh", "Tài Bạch", "Quan Lộc"].includes(focus.palace.name)) return null;
    const nb = neighborBranches(focus.palace.branch);
    if (!nb) return null;
    const left = stars.filter((s) => s.branch === nb[0]);
    const right = stars.filter((s) => s.branch === nb[1]);
    const leftQ = left.some(isQuyen);
    const rightL = right.some(isLoc);
    const leftL = left.some(isLoc);
    const rightQ = right.some(isQuyen);
    if ((leftQ && rightL) || (leftL && rightQ)) return "Giáp Quyền Giáp Lộc";
    return null;
  },
  CAT_GIAI_ACH(stars) {
    const count = GIAI_CUU_NAMES.filter((n) => hasBase(stars, n)).length;
    if (count < 4) return null;
    return `Đại Giải Ách (${count} sao cứu giải)`;
  },

  HUNG_01(stars) {
    if (!hasBase(stars, "Vũ Khúc", "Văn Xương", "Linh Tinh", "Đà La")) return null;
    if (!ofBase(stars, "Đà La").some((s) => isHam(s.brightness) || !s.brightness)) return null;
    return "Linh Xương Đà Vũ";
  },
  HUNG_02(stars) {
    const tu = ofBase(stars, "Tử Vi").find((s) => s.branch === "Mão" || s.branch === "Dậu");
    if (!tu || !hasBase(stars, "Tham Lang")) return null;
    if (!hasAny(stars, "Địa Không", "Địa Kiếp")) return null;
    return "Đế Ngộ Hung Đồ";
  },
  HUNG_03(stars) {
    const spt = ["Thất Sát", "Phá Quân", "Tham Lang"];
    if (!spt.every((n) => ofBase(stars, n).length > 0)) return null;
    if (!spt.some((n) => ofBase(stars, n).some((s) => isHam(s.brightness)))) {
      return null;
    }
    const hungCompanion = stars.some(
      (s) =>
        isKy(s) ||
        LUC_SAT.includes(s.base) ||
        s.base === "Bạch Hổ" ||
        s.base === "Tang Môn" ||
        s.base === "Phi Liêm" ||
        s.base === "Lưu Hà",
    );
    if (!hungCompanion) return null;
    return "Sát Phá Tham Hãm ngộ sát/Kỵ";
  },
  HUNG_04(stars) {
    if (!stars.some(isLoc)) return null;
    const destroy =
      hasAny(stars, "Địa Không", "Địa Kiếp") ||
      stars.some((s) => isKy(s) && (isHam(s.brightness) || true));
    if (!destroy) return null;
    return "Lộc Phùng Xung Phá";
  },
  HUNG_05(stars, frame) {
    const duong = ofBase(stars, "Thái Dương").find(
      (s) => isHam(s.brightness) && ["Tuất", "Hợi", "Tý"].includes(s.branch),
    );
    const am = ofBase(stars, "Thái Âm").find(
      (s) => isHam(s.brightness) && ["Mão", "Thìn", "Tỵ"].includes(s.branch),
    );
    if (!duong || !am) return null;
    const hasVoid = frame.some((r) =>
      (r.palace.stars ?? []).some((s) => s.name === "Tuần" || s.name === "Triệt"),
    );
    if (hasVoid || stars.some(isKhoa)) return null;
    return "Nhật Nguyệt Phản Bối";
  },
  HUNG_06(stars, frame) {
    if (!hasBase(stars, "Thiên Mã")) return null;
    const hit =
      hasBase(stars, "Đà La") ||
      stars.some(isKy) ||
      frame.some((r) =>
        (r.palace.stars ?? []).some((s) => s.name === "Tuần" || s.name === "Triệt"),
      );
    if (!hit) return null;
    return "Mã Chiết Túc";
  },
  HUNG_07(stars) {
    const cu = ofBase(stars, "Cự Môn").find((s) => isHam(s.brightness));
    if (!cu) return null;
    if (!stars.some(isKy)) return null;
    if (!hasAny(stars, "Đà La", "Thiên Hình")) return null;
    return "Cự Kỵ / Ám thượng gia ám";
  },
  HUNG_08(stars) {
    const majorOk = stars.some(
      (s) =>
        s.star.layer === "major" &&
        (s.brightness === "Miếu" || s.brightness === "Vượng"),
    );
    if (!majorOk) return null;
    const satHam = ["Địa Không", "Địa Kiếp", "Hỏa Tinh", "Linh Tinh"].some((n) =>
      ofBase(stars, n).some((s) => isHam(s.brightness) || !s.brightness),
    );
    if (!satHam) return null;
    return "Cát Xứ Tàng Hung";
  },
  HUNG_09(stars) {
    if (!hasBase(stars, "Thiên Khốc", "Thiên Hư", "Tang Môn", "Bạch Hổ")) return null;
    return "Khốc Hư Tang Hổ";
  },
  HUNG_12(stars, frame) {
    const scope = frame.filter((r) =>
      ["Mệnh", "Quan Lộc", "Tật Ách"].includes(r.palace.name),
    );
    const scoped = stars.filter((s) =>
      scope.some((r) => r.palace.branch === s.branch),
    );
    if (!hasBase(scoped, "Liêm Trinh", "Thiên Hình", "Kình Dương", "Bạch Hổ")) {
      return null;
    }
    return "Hình Tù Giáp Ấn";
  },
  HUNG_13(stars) {
    if (!hasAny(stars, "Đào Hoa", "Hồng Loan")) return null;
    if (stars.some(isKhoa)) return null;
    const bad =
      hasAny(stars, "Địa Kiếp", "Thiên Riêu") ||
      stars.some(isKy) ||
      ofBase(stars, "Tham Lang").some((s) => isHam(s.brightness));
    if (!bad) return null;
    return "Đào Hoa Sát";
  },

  REL_01(stars, frame) {
    const pt = frame.find((r) => r.palace.name === "Phu Thê");
    if (!pt) return null;
    const local = stars.filter((s) => s.branch === pt.palace.branch);
    // Cho phép hội trên TP4C nếu focus là Phu Thê hoặc Phu Thê trong frame
    const pool = local.length ? local : stars;
    if (!hasBase(pool, "Đào Hoa", "Hồng Loan") || !hasAny(pool, "Thiên Hỷ", "Thiên Hỉ")) {
      return null;
    }
    return "Đào Hồng Hỷ Cát";
  },
  REL_02(stars, frame) {
    const pt = frame.find((r) => r.palace.name === "Phu Thê");
    if (!pt) return null;
    const local = stars.filter((s) => s.branch === pt.palace.branch);
    if (!hasBase(local, "Cô Thần", "Quả Tú", "Điếu Khách")) return null;
    if (
      !(
        local.some(isKy) ||
        ofBase(local, "Thái Âm").some((s) => isHam(s.brightness)) ||
        ofBase(local, "Thái Dương").some((s) => isHam(s.brightness))
      )
    ) {
      return null;
    }
    return "Cô Quả Khách Kỵ";
  },
  REL_03(stars, frame) {
    const pt = frame.find((r) => r.palace.name === "Phu Thê");
    if (!pt) return null;
    const local = stars.filter((s) => s.branch === pt.palace.branch);
    const thamLiem = local.filter(
      (s) =>
        (s.base === "Tham Lang" || s.base === "Liêm Trinh") &&
        isHam(s.brightness) &&
        (s.branch === "Tỵ" || s.branch === "Hợi"),
    );
    if (thamLiem.length < 2 && !(hasBase(local, "Tham Lang", "Liêm Trinh"))) return null;
    if (!hasAny(local, "Đào Hoa", "Hồng Loan")) return null;
    return "Tham Liêm Đào Hồng";
  },
  REL_04(stars, frame) {
    const pt = frame.find((r) => r.palace.name === "Phu Thê");
    if (!pt) return null;
    const local = stars.filter((s) => s.branch === pt.palace.branch);
    if (!hasBase(local, "Lộc Tồn", "Thiên Mã")) return null;
    return "Lộc Mã Phu Thê";
  },

  SPEC_01(stars, frame) {
    const focus = frame.find((r) => r.role === "focus");
    if (!focus) return null;
    const majors = (focus.palace.stars ?? []).filter((s) => s.layer === "major");
    if (majors.length > 0) return null;
    const khong = ["Tuần", "Triệt", "Địa Không", "Thiên Không"];
    const count = khong.filter((n) =>
      stars.some((s) => s.base === n || s.name === n),
    ).length;
    if (count < 2) return null;
    return `VCD Đắc ${count} Không`;
  },
  SPEC_02(stars, frame) {
    const focus = frame.find((r) => r.role === "focus");
    if (!focus || focus.palace.changSheng !== "Tuyệt") return null;
    const local = stars.filter((s) => s.branch === focus.palace.branch);
    if (
      !(
        local.some(isLoc) ||
        local.some(isKhoa) ||
        hasAny(local, "Ân Quang", "Thiên Quý", "Thiên Đức")
      )
    ) {
      return null;
    }
    return "Tuyệt Xứ Phùng Sinh";
  },
  SPEC_03(stars) {
    const luong = ofBase(stars, "Thiên Lương");
    const ma = ofBase(stars, "Thiên Mã").filter(
      (s) =>
        isHam(s.brightness) &&
        ["Tỵ", "Hợi", "Dần", "Thân"].includes(s.branch),
    );
    if (!luong.length || !ma.length) return null;
    return "Lương Mã Phiêu Lãng";
  },
  SPEC_04(stars) {
    const khoa = stars.some(isKhoa);
    const giai = GIAI_CUU_NAMES.filter((n) => hasBase(stars, n)).length;
    if (!khoa && giai < 3) return null;
    if (!hasAny(stars, "Địa Không", "Địa Kiếp", "Thiên Không", "Hỏa Tinh", "Linh Tinh")) {
      return null;
    }
    return "Khoa Chế Không";
  },
  SPEC_05(stars, frame) {
    const focus = frame.find((r) => r.role === "focus");
    if (!focus) return null;
    const local = stars.filter((s) => s.branch === focus.palace.branch);
    const hamMajor = local.some(
      (s) => s.star.layer === "major" && isHam(s.brightness),
    );
    const satHam = local.filter(
      (s) => LUC_SAT.includes(s.base) && isHam(s.brightness),
    ).length;
    if (!hamMajor && satHam < 3) return null;
    const hasVoid = (focus.palace.stars ?? []).some(
      (s) => s.name === "Tuần" || s.name === "Triệt",
    );
    if (!hasVoid) return null;
    return "Phản Vi Kỳ Cách";
  },
};

export function evaluateCombos(
  frame: FrameRow[],
  chart: ChartData,
  includeAnnual: boolean,
): ComboHit[] {
  const stars = collectStars(frame, includeAnnual);
  const hits: ComboHit[] = [];
  const usedGroups = new Set<string>();

  for (const rule of COMBO_RULES) {
    if (rule.group && usedGroups.has(rule.group)) continue;
    const pred = PREDICATES[rule.id];
    if (!pred) continue;
    const reason = pred(stars, frame, chart);
    if (!reason) continue;
    hits.push({ rule, reason });
    if (rule.group) usedGroups.add(rule.group);
  }
  return hits;
}

/** Palace có Hóa Khoa hoặc ≥3 sao cứu giải → kích hoạt lưới bảo hộ. */
export function palaceHasSalvation(palace: ChartPalace, includeAnnual: boolean): boolean {
  const stars = (palace.stars ?? []).filter(
    (s) => includeAnnual || !isAnnualStar(s),
  );
  const hasKhoa = stars.some(
    (s) =>
      baseStarName(s.name) === "Hóa Khoa" ||
      (isMutagenStar(s) && mutagenKind(s) === "Khoa"),
  );
  const giai = GIAI_CUU_NAMES.filter((n) =>
    stars.some((s) => baseStarName(s.name) === n),
  ).length;
  return hasKhoa || giai >= 3;
}

export { XUNG_CHIEU };
