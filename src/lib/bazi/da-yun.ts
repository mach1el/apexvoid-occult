import { STEMS, BRANCHES } from "../calendar/sexagenary";
import { findExactTermJd, SOLAR_TERMS } from "../calendar/solar-terms";
import { getSolarLongitude } from "../calendar/solar-terms";
import { Pillar } from "../calendar/sexagenary";

/**
 * Tính số tuổi bắt đầu khởi Đại Vận (Khởi Vận)
 * @param birthTime Thời gian sinh (UTC)
 * @param isYangGender Dương Nam / Âm Nữ (true) hoặc Âm Nam / Dương Nữ (false)
 */
export function getDaYunStartAge(birthTime: Date, isYangGender: boolean): number {
  const birthJd = birthTime.getTime() / 86400000 + 2440587.5;
  const currentSolarLon = getSolarLongitude(birthJd);
  
  // Xác định tiết chính (đầu tháng) trước và sau giờ sinh
  // Các tiết chính có longitude: 315, 345, 15, 45, ...
  const majorTerms = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];
  
  // Tìm Tiết Chính trước (pastTerm) và sau (nextTerm)
  let pastTermLon = 315;
  let nextTermLon = 345;
  
  let offset = currentSolarLon - 315;
  if (offset < 0) offset += 360;
  
  const monthIndex = Math.floor(offset / 30);
  pastTermLon = majorTerms[monthIndex] ?? 315;
  nextTermLon = majorTerms[(monthIndex + 1) % 12] ?? 345;
  
  // Tính JDN của 2 tiết này trong năm sinh (có thể vắt qua năm)
  const currentYear = birthTime.getUTCFullYear();
  let pastTermJd = findExactTermJd(currentYear, pastTermLon);
  if (pastTermJd > birthJd) {
    // Nếu tiết trước lại nằm sau ngày sinh (do năm sinh), ta lấy năm trước
    pastTermJd = findExactTermJd(currentYear - 1, pastTermLon);
  }
  
  let nextTermJd = findExactTermJd(currentYear, nextTermLon);
  if (nextTermJd < birthJd) {
    // Nếu tiết sau lại nằm trước ngày sinh, ta lấy năm sau
    nextTermJd = findExactTermJd(currentYear + 1, nextTermLon);
  }

  // Số ngày chênh lệch
  const daysDiff = isYangGender ? (nextTermJd - birthJd) : (birthJd - pastTermJd);
  
  // 3 ngày = 1 năm tuổi
  const age = Math.round(daysDiff / 3);
  // Tuổi khởi vận tối thiểu là 1, tuổi tính theo tuổi mụ (cộng 1) hoặc tính tròn năm.
  // Thường người ta dùng (days / 3), nếu 0 thì tính là 1 tuổi. 
  return Math.max(1, age);
}

/**
 * Tính chuỗi 10 Đại Vận
 * @param monthPillar Can chi tháng sinh
 * @param isYangGender Thuận hay nghịch
 * @param startAge Tuổi khởi vận
 */
export function getDaYun(monthPillar: Pillar, isYangGender: boolean, startAge: number) {
  const yunList = [];
  const stemIdx = STEMS.indexOf(monthPillar.stem);
  const branchIdx = BRANCHES.indexOf(monthPillar.branch);
  
  const step = isYangGender ? 1 : -1;
  
  for (let i = 1; i <= 10; i++) {
    const sIdx = (stemIdx + i * step + 120) % 10;
    const bIdx = (branchIdx + i * step + 120) % 12;
    
    yunList.push({
      pillar: { stem: STEMS[sIdx] ?? "", branch: BRANCHES[bIdx] ?? "" },
      ageStart: startAge + (i - 1) * 10,
      ageEnd: startAge + i * 10 - 1
    });
  }
  
  return yunList;
}
