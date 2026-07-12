import { BRANCHES, getMonthStem, Pillar, STEMS } from "../calendar/sexagenary";

/**
 * Tính Thai Nguyên (Tháng thụ thai).
 * Theo Tử Bình, Thai Nguyên được tính bằng cách lấy Can của tháng sinh tiến 1, Chi của tháng sinh tiến 3.
 */
export function getConceptionPillar(monthPillar: Pillar): Pillar {
  const stemIndex = STEMS.indexOf(monthPillar.stem);
  const branchIndex = BRANCHES.indexOf(monthPillar.branch);

  if (stemIndex === -1 || branchIndex === -1) return { stem: "", branch: "" };

  const conceptionStemIndex = (stemIndex + 1) % 10;
  const conceptionBranchIndex = (branchIndex + 3) % 12;

  return {
    stem: STEMS[conceptionStemIndex] ?? "",
    branch: BRANCHES[conceptionBranchIndex] ?? ""
  };
}

/**
 * Tính Mệnh Cung.
 * Mệnh Cung có nhiều dị bản. Ở đây tạm thời dùng hệ Nguồn B:
 * Quy ước: Tý=1, Sửu=2, Dần=3, Mão=4, Thìn=5, Tị=6, Ngọ=7, Mùi=8, Thân=9, Dậu=10, Tuất=11, Hợi=12.
 * Chỉ số Mệnh Cung = 14 - (Chỉ số Tháng + Chỉ số Giờ).
 * Nếu kết quả <= 0 thì cộng 12. Nếu kết quả > 12 thì trừ 12 (thực tế 14 - x luôn <= 12 vì tháng >=1, giờ >=1).
 * Can Mệnh Cung: Dùng Ngũ Hổ Độn (tính từ Can Năm) để tìm Can của Chi Mệnh Cung (giống như tính tháng).
 * 
 * TODO pending review: Cân nhắc thêm cấu hình `conventions.ts` nếu cần hỗ trợ Nguồn A (Đếm Mão) 
 * hoặc các biến thể khác.
 * 
 * @param yearStem Can năm sinh (để độn can Mệnh Cung)
 * @param monthBranch Chi tháng sinh
 * @param hourBranch Chi giờ sinh
 */
export function getLifePalace(yearStem: string, monthBranch: string, hourBranch: string): Pillar {
  const monthIdx = BRANCHES.indexOf(monthBranch) + 1;
  const hourIdx = BRANCHES.indexOf(hourBranch) + 1;
  const yearStemIdx = STEMS.indexOf(yearStem);

  if (monthIdx === 0 || hourIdx === 0 || yearStemIdx === -1) return { stem: "", branch: "" };

  let lifePalaceBranchIdx = 14 - (monthIdx + hourIdx);
  while (lifePalaceBranchIdx <= 0) lifePalaceBranchIdx += 12;
  while (lifePalaceBranchIdx > 12) lifePalaceBranchIdx -= 12;

  // Trở lại index 0-11
  const lpBranchIndex = lifePalaceBranchIdx - 1;
  const lpBranch = BRANCHES[lpBranchIndex] ?? "";

  // Tìm can của Mệnh Cung bằng Ngũ Hổ Độn
  const lpStemIndex = getMonthStem(yearStemIdx, lpBranchIndex);
  const lpStem = STEMS[lpStemIndex] ?? "";

  return {
    stem: lpStem,
    branch: lpBranch
  };
}
