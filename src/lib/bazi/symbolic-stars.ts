import { Pillar } from "../calendar/sexagenary";
import { BaziConventions, DEFAULT_CONVENTIONS } from "./conventions";

export interface SymbolicStar {
  name: string;
  sourceType: "DayStem" | "YearStem" | "DayBranch" | "YearBranch";
  sourceValue: string;
}

/**
 * Tìm các Thần Sát (9 loại) ứng với một chi đích (targetBranch),
 * lấy hệ quy chiếu từ Trụ Ngày và Trụ Năm.
 */
export function getSymbolicStars(
  targetBranch: string,
  dayPillar: Pillar,
  yearPillar: Pillar,
  conventions: BaziConventions = DEFAULT_CONVENTIONS
): SymbolicStar[] {
  const stars: SymbolicStar[] = [];

  // 1. Thiên Ất Quý Nhân (Từ Can Ngày & Can Năm)
  const addQuyNhan = (stem: string, sourceType: "DayStem" | "YearStem") => {
    let qnBranches: string[] = [];
    if (conventions.quyNhanVariant === "B") {
      if (["Giáp", "Mậu", "Canh"].includes(stem)) qnBranches = ["Sửu", "Mùi"];
      else if (["Ất", "Kỷ"].includes(stem)) qnBranches = ["Tý", "Thân"];
      else if (["Bính", "Đinh"].includes(stem)) qnBranches = ["Hợi", "Dậu"];
      else if (["Nhâm", "Quý"].includes(stem)) qnBranches = ["Mão", "Tị"];
      else if (stem === "Tân") qnBranches = ["Ngọ", "Dần"];
    } else {
      // Variant A (Phổ biến, Tử Vi hay dùng)
      if (["Giáp", "Mậu"].includes(stem)) qnBranches = ["Sửu", "Mùi"];
      else if (["Ất", "Kỷ"].includes(stem)) qnBranches = ["Tý", "Thân"];
      else if (["Bính", "Đinh"].includes(stem)) qnBranches = ["Hợi", "Dậu"];
      else if (["Nhâm", "Quý"].includes(stem)) qnBranches = ["Mão", "Tị"];
      else if (["Canh", "Tân"].includes(stem)) qnBranches = ["Ngọ", "Dần"];
    }
    if (qnBranches.includes(targetBranch)) stars.push({ name: "Thiên Ất Quý Nhân", sourceType, sourceValue: stem });
  };
  addQuyNhan(dayPillar.stem, "DayStem");
  addQuyNhan(yearPillar.stem, "YearStem");

  // 2. Lộc Thần (Lâm Quan của Can)
  const getLoc = (stem: string) => {
    const map: Record<string, string> = {
      "Giáp": "Dần", "Ất": "Mão", "Bính": "Tị", "Đinh": "Ngọ", "Mậu": "Tị",
      "Kỷ": "Ngọ", "Canh": "Thân", "Tân": "Dậu", "Nhâm": "Hợi", "Quý": "Tý"
    };
    return map[stem];
  };
  if (getLoc(dayPillar.stem) === targetBranch) stars.push({ name: "Lộc Thần", sourceType: "DayStem", sourceValue: dayPillar.stem });
  if (getLoc(yearPillar.stem) === targetBranch) stars.push({ name: "Lộc Thần", sourceType: "YearStem", sourceValue: yearPillar.stem });

  // 3. Dương Nhận (Kình Dương - Đế Vượng của Dương Can, một số phái dùng cả Âm Can tiến 1 từ Lộc)
  // Ở đây dùng chuẩn Bát Tự cơ bản: Kình Dương chủ yếu dùng cho Dương Can (Đế Vượng).
  // Bản của Uyên Hải Tử Bình: Giáp->Mão, Bính/Mậu->Ngọ, Canh->Dậu, Nhâm->Tý.
  // Các can âm: Ất->Dần, Đinh/Kỷ->Tị, Tân->Thân, Quý->Hợi.
  const getNhan = (stem: string) => {
    const map: Record<string, string> = {
      "Giáp": "Mão", "Ất": "Dần", "Bính": "Ngọ", "Đinh": "Tị", "Mậu": "Ngọ",
      "Kỷ": "Tị", "Canh": "Dậu", "Tân": "Thân", "Nhâm": "Tý", "Quý": "Hợi"
    };
    return map[stem];
  };
  if (getNhan(dayPillar.stem) === targetBranch) stars.push({ name: "Dương Nhận", sourceType: "DayStem", sourceValue: dayPillar.stem });

  // 4. Văn Xương (Thực Thần Lâm Quan)
  const getVanXuong = (stem: string) => {
    const map: Record<string, string> = {
      "Giáp": "Tị", "Ất": "Ngọ", "Bính": "Thân", "Đinh": "Dậu", "Mậu": "Thân",
      "Kỷ": "Dậu", "Canh": "Hợi", "Tân": "Tý", "Nhâm": "Dần", "Quý": "Mão"
    };
    return map[stem];
  };
  if (getVanXuong(dayPillar.stem) === targetBranch) stars.push({ name: "Văn Xương", sourceType: "DayStem", sourceValue: dayPillar.stem });
  if (getVanXuong(yearPillar.stem) === targetBranch) stars.push({ name: "Văn Xương", sourceType: "YearStem", sourceValue: yearPillar.stem });

  // Các thần sát từ CHI (Đào Hoa, Dịch Mã, Hoa Cái, Kiếp Sát, Cô Thần, Quả Tú)
  const addBranchStars = (branch: string, sourceType: "DayBranch" | "YearBranch") => {
    // Tam Hợp cục
    const isDanNgoTuat = ["Dần", "Ngọ", "Tuất"].includes(branch);
    const isThanTyThin = ["Thân", "Tý", "Thìn"].includes(branch);
    const isTyDauSuu = ["Tị", "Dậu", "Sửu"].includes(branch);
    const isHoiMaoMui = ["Hợi", "Mão", "Mùi"].includes(branch);

    // Mùa (Tam Hội)
    const isXuan = ["Dần", "Mão", "Thìn"].includes(branch);
    const isHa = ["Tị", "Ngọ", "Mùi"].includes(branch);
    const isThu = ["Thân", "Dậu", "Tuất"].includes(branch);
    const isDong = ["Hợi", "Tý", "Sửu"].includes(branch);

    // 5. Đào Hoa (Hàm Trì)
    if (isDanNgoTuat && targetBranch === "Mão") stars.push({ name: "Đào Hoa", sourceType, sourceValue: branch });
    if (isThanTyThin && targetBranch === "Dậu") stars.push({ name: "Đào Hoa", sourceType, sourceValue: branch });
    if (isTyDauSuu && targetBranch === "Ngọ") stars.push({ name: "Đào Hoa", sourceType, sourceValue: branch });
    if (isHoiMaoMui && targetBranch === "Tý") stars.push({ name: "Đào Hoa", sourceType, sourceValue: branch });

    // 6. Dịch Mã
    if (isDanNgoTuat && targetBranch === "Thân") stars.push({ name: "Dịch Mã", sourceType, sourceValue: branch });
    if (isThanTyThin && targetBranch === "Dần") stars.push({ name: "Dịch Mã", sourceType, sourceValue: branch });
    if (isTyDauSuu && targetBranch === "Hợi") stars.push({ name: "Dịch Mã", sourceType, sourceValue: branch });
    if (isHoiMaoMui && targetBranch === "Tị") stars.push({ name: "Dịch Mã", sourceType, sourceValue: branch });

    // 7. Hoa Cái
    if (isDanNgoTuat && targetBranch === "Tuất") stars.push({ name: "Hoa Cái", sourceType, sourceValue: branch });
    if (isThanTyThin && targetBranch === "Thìn") stars.push({ name: "Hoa Cái", sourceType, sourceValue: branch });
    if (isTyDauSuu && targetBranch === "Sửu") stars.push({ name: "Hoa Cái", sourceType, sourceValue: branch });
    if (isHoiMaoMui && targetBranch === "Mùi") stars.push({ name: "Hoa Cái", sourceType, sourceValue: branch });

    // 8. Kiếp Sát
    if (isDanNgoTuat && targetBranch === "Hợi") stars.push({ name: "Kiếp Sát", sourceType, sourceValue: branch });
    if (isThanTyThin && targetBranch === "Tị") stars.push({ name: "Kiếp Sát", sourceType, sourceValue: branch });
    if (isTyDauSuu && targetBranch === "Dần") stars.push({ name: "Kiếp Sát", sourceType, sourceValue: branch });
    if (isHoiMaoMui && targetBranch === "Thân") stars.push({ name: "Kiếp Sát", sourceType, sourceValue: branch });

    // 9. Cô Thần & Quả Tú (Dựa vào mùa)
    if (isXuan && targetBranch === "Tị") stars.push({ name: "Cô Thần", sourceType, sourceValue: branch });
    if (isHa && targetBranch === "Thân") stars.push({ name: "Cô Thần", sourceType, sourceValue: branch });
    if (isThu && targetBranch === "Hợi") stars.push({ name: "Cô Thần", sourceType, sourceValue: branch });
    if (isDong && targetBranch === "Dần") stars.push({ name: "Cô Thần", sourceType, sourceValue: branch });

    if (isXuan && targetBranch === "Sửu") stars.push({ name: "Quả Tú", sourceType, sourceValue: branch });
    if (isHa && targetBranch === "Thìn") stars.push({ name: "Quả Tú", sourceType, sourceValue: branch });
    if (isThu && targetBranch === "Mùi") stars.push({ name: "Quả Tú", sourceType, sourceValue: branch });
    if (isDong && targetBranch === "Tuất") stars.push({ name: "Quả Tú", sourceType, sourceValue: branch });
  };

  // Ưu tiên theo conventions (bản in ra có thể sort theo Day hoặc Year)
  if (conventions.thanSatBase === "yearFirst") {
    addBranchStars(yearPillar.branch, "YearBranch");
    addBranchStars(dayPillar.branch, "DayBranch");
  } else {
    addBranchStars(dayPillar.branch, "DayBranch");
    addBranchStars(yearPillar.branch, "YearBranch");
  }

  // Khử trùng lặp (nếu Day và Year trùng nhau, ví dụ cùng là chi Dần, thì Thần sát chỉ in ra 1 lần với sourceType là cái ưu tiên trước)
  const uniqueStars: SymbolicStar[] = [];
  const seen = new Set<string>();
  for (const star of stars) {
    const key = `${star.name}_${star.sourceType}`;
    // Nếu chỉ muốn dedupe theo tên (không cần biết từ Day hay Year nếu trùng), dùng: const key = star.name;
    // Nhưng Bát tự thường quan trọng nguồn, ví dụ "Đào Hoa từ Năm" khác "Đào Hoa từ Ngày". Nên cứ để cả.
    if (!seen.has(key)) {
      seen.add(key);
      uniqueStars.push(star);
    }
  }

  return uniqueStars;
}
