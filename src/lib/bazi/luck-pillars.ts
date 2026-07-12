import { BRANCHES, Pillar, STEMS } from "../calendar/sexagenary";
import { findExactTermJd, getSolarLongitude } from "../calendar/solar-terms";
import { getTrueSolarTime } from "../calendar/timezone";
import { BaziConventions, DEFAULT_CONVENTIONS } from "./conventions";

export interface LuckPillar {
  pillar: Pillar;
  startAgeYear: number;
  startAgeMonth: number;
  startAgeDay: number;
  startDate: Date; // Thời điểm thực tế (UTC) bước vào đại vận này
}

/**
 * Tính tuổi khởi vận chi tiết và chuỗi 10 Đại Vận.
 * 3 ngày = 1 năm (360 ngày). 1 ngày = 4 tháng (120 ngày). 1 giờ (canh giờ) = 10 ngày.
 * Tức là 1 ngày thực tế = 120 ngày tuổi vận.
 * Quy đổi: \Delta_days * 120 = Số ngày tuổi để bắt đầu khởi vận.
 * 
 * @param birthTime Thời gian sinh (UTC) đã tính True Solar Time nếu cần (hoặc dùng UTC gốc để tính tiết khí).
 * @param monthPillar Trụ tháng sinh
 * @param isYangGender Giới tính và Âm Dương để xác định chiều đi (True = Thuận, False = Nghịch)
 */
export function getLuckPillars(
  birthTime: Date,
  monthPillar: Pillar,
  isYangGender: boolean,
  conventions: BaziConventions = DEFAULT_CONVENTIONS
): { luckPillars: LuckPillar[], startAgeYear: number, startAgeMonth: number, startAgeDay: number, startDate: Date } {
  // 1. Tìm khoảng cách từ giờ sinh đến tiết khí tương ứng
  const birthJd = birthTime.getTime() / 86400000 + 2440587.5;
  const currentSolarLon = getSolarLongitude(birthJd);
  
  // Các mốc tiết khí (longitude: 315=Lập Xuân, 345=Kinh Trập, 15=Thanh Minh, 45=Lập Hạ...)
  const majorTerms = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];
  
  let offset = currentSolarLon - 315;
  if (offset < 0) offset += 360;
  
  const monthIndex = Math.floor(offset / 30);
  const pastTermLon = majorTerms[monthIndex] ?? 315;
  const nextTermLon = majorTerms[(monthIndex + 1) % 12] ?? 345;
  
  const currentYear = birthTime.getUTCFullYear();
  
  let pastTermJd = findExactTermJd(currentYear, pastTermLon);
  if (pastTermJd > birthJd) {
    pastTermJd = findExactTermJd(currentYear - 1, pastTermLon);
  }
  
  let nextTermJd = findExactTermJd(currentYear, nextTermLon);
  if (nextTermJd < birthJd) {
    nextTermJd = findExactTermJd(currentYear + 1, nextTermLon);
  }

  // Nếu đi thuận (Dương Nam, Âm Nữ), tính đến tiết kế tiếp.
  // Nếu đi nghịch (Âm Nam, Dương Nữ), tính lùi về tiết vừa qua.
  const daysDiff = isYangGender ? (nextTermJd - birthJd) : (birthJd - pastTermJd);
  
  // 2. Tính tuổi khởi vận (3 ngày = 1 năm = 360 ngày vận)
  // Quy đổi hệ số: 1 ngày thực tế = 120 ngày sinh mệnh
  const daysToStart = daysDiff * 120;
  
  // StartDate (UTC)
  const startDateMs = birthTime.getTime() + daysToStart * 86400000;
  const startDate = new Date(startDateMs);
  
  // Tuổi (năm, tháng, ngày)
  const startAgeYear = Math.floor(daysToStart / 360);
  const remainderDays = daysToStart - startAgeYear * 360;
  const startAgeMonth = Math.floor(remainderDays / 30);
  const startAgeDay = Math.floor(remainderDays % 30);

  // 3. Tính 10 Đại Vận
  const luckPillars: LuckPillar[] = [];
  const stemIdx = STEMS.indexOf(monthPillar.stem);
  const branchIdx = BRANCHES.indexOf(monthPillar.branch);
  const step = isYangGender ? 1 : -1;
  
  for (let i = 1; i <= 10; i++) {
    const sIdx = (stemIdx + i * step + 120) % 10;
    const bIdx = (branchIdx + i * step + 120) % 12;
    
    // Mỗi đại vận kéo dài 10 năm sinh mệnh (khoảng 10 năm thực tế)
    const ageStartMs = startDateMs + (i - 1) * 10 * 365.2422 * 86400000;
    
    luckPillars.push({
      pillar: { stem: STEMS[sIdx] ?? "", branch: BRANCHES[bIdx] ?? "" },
      startAgeYear: startAgeYear + (i - 1) * 10,
      startAgeMonth,
      startAgeDay,
      startDate: new Date(ageStartMs)
    });
  }
  
  return { luckPillars, startAgeYear, startAgeMonth, startAgeDay, startDate };
}

/**
 * Hàm tìm Lưu Niên của một năm Dương Lịch cụ thể (Lưu niên đổi ở Lập Xuân).
 */
export function getAnnualPillar(year: number): Pillar {
  // Mốc năm Giáp Tý là 1984
  const offset = year - 4;
  let stemIndex = offset % 10;
  if (stemIndex < 0) stemIndex += 10;
  
  let branchIndex = offset % 12;
  if (branchIndex < 0) branchIndex += 12;
  
  return {
    stem: STEMS[stemIndex] ?? "",
    branch: BRANCHES[branchIndex] ?? ""
  };
}
