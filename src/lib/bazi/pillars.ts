import { getDayPillar, getHourStem, getMonthStem, Pillar, STEM_POLARITY } from "../calendar/sexagenary";
import { ConfigOptions, getHourBranch, getTrueSolarTime } from "../calendar/timezone";
import { findExactTermJd, getMonthBranchAt } from "../calendar/solar-terms";
import { STEMS, BRANCHES } from "../calendar/sexagenary";

export interface BaziChart {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  gender: "M" | "F";
  longitude: number;
  // Giới tính (Âm/Dương Nam/Nữ)
  isYangGender: boolean; // Dương Nam, Âm Nữ, v.v.
}

/**
 * Lấy Can Chi năm, chú ý chuyển năm Bát Tự ở Lập Xuân.
 */
function getYearPillar(date: Date): { pillar: Pillar, baziYear: number } {
  const currentYear = date.getUTCFullYear();
  // Lập xuân của năm nay
  const liChunJd = findExactTermJd(currentYear, 315);
  const liChunDate = new Date((liChunJd - 2440587.5) * 86400000);
  
  let baziYear = currentYear;
  if (date.getTime() < liChunDate.getTime()) {
    // Nếu trước Lập Xuân, tính là năm ngoái
    baziYear -= 1;
  }
  
  // Mốc năm Giáp Tý (1984, 1924, ...)
  // Năm 1984 là Giáp Tý (index 0, 0)
  // baziYear - 4 để cho năm 1984 - 4 = 1980 (nhằm dời offset cho 1984 chia hết cho 60 hoặc dễ tính modulo)
  // Thực tế: Giáp (0) ở năm kết thúc bằng 4 (1984, 2024).
  const offset = baziYear - 4;
  let stemIndex = offset % 10;
  if (stemIndex < 0) stemIndex += 10;
  
  let branchIndex = offset % 12;
  if (branchIndex < 0) branchIndex += 12;
  
  return {
    pillar: { stem: STEMS[stemIndex], branch: BRANCHES[branchIndex] },
    baziYear
  };
}

export function calculateBazi(date: Date, longitude: number, gender: "M" | "F", config?: ConfigOptions): BaziChart {
  // 1. Tính True Solar Time
  // UTC+7 (múi giờ mặc định của VN) thường được dùng trong lá số Tử Vi, nhưng Bát Tự dùng True Solar Time.
  // Nếu date là UTC Date, thì ta phải cộng timeZone offset, nhưng đợi chút...
  // date là Date object, getTrueSolarTime đòi hỏi giờ địa phương, nhưng thực tế True Solar Time không phụ thuộc timeZone!
  // Nó chỉ phụ thuộc vào thời điểm vũ trụ (UTC) và kinh độ.
  // Tuy nhiên, logic getTrueSolarTime đang nhận date, kinh độ, và timeZoneOffset để điều chỉnh so với giờ chuẩn.
  // Ta sửa lại cách tính TST chuẩn hơn ở timezone.ts, hoặc đơn giản truyền đúng.
  // Tạm lấy TST = UTC + kinh độ * 4 phút
  const tstMs = date.getTime() + longitude * 4 * 60 * 1000;
  const tst = new Date(tstMs);
  
  // 2. Trụ Năm
  // Dùng date gốc (UTC) vì Mặt Trời ở Lập Xuân là mốc vũ trụ chung.
  const { pillar: yearPillar, baziYear } = getYearPillar(date);
  
  // 3. Trụ Tháng
  const monthBranchIndex = getMonthBranchAt(date);
  const yearStemIndex = STEMS.indexOf(yearPillar.stem);
  const monthStemIndex = getMonthStem(yearStemIndex, monthBranchIndex);
  const monthPillar: Pillar = { stem: STEMS[monthStemIndex], branch: BRANCHES[monthBranchIndex] };
  
  // 4. Trụ Giờ (Tìm chi giờ và cờ qua ngày dựa trên giờ địa phương - True Solar Time)
  const { branchIndex: hourBranchIndex, isNextDay } = getHourBranch(tst, config);
  
  // 5. Trụ Ngày
  // Bát Tự dùng JDN để tìm can chi ngày. getDayPillar được thiết kế để nhận JD lúc 12h trưa UTC.
  // Ta muốn can chi ngày của TST (True Solar Time).
  // Vì TST đã được biểu diễn dưới dạng ms từ Epoch (ở Greenwich), 
  // ta chỉ cần lấy (tstMs) chia ra số ngày rồi dò.
  // JD của TST tại mốc 12h trưa Greenwich:
  const tstDayJd = (tstMs + (isNextDay ? 86400000 : 0)) / 86400000 + 2440587.5;
  const dayPillar = getDayPillar(tstDayJd + 0.5); 
  
  // 6. Hoàn thiện Trụ Giờ
  const dayStemIndex = STEMS.indexOf(dayPillar.stem);
  const hourStemIndex = getHourStem(dayStemIndex, hourBranchIndex);
  const hourPillar: Pillar = { stem: STEMS[hourStemIndex], branch: BRANCHES[hourBranchIndex] };
  
  // 7. Âm dương nam nữ
  const stemPol = STEM_POLARITY[yearPillar.stem];
  let isYangGender = false;
  if ((stemPol > 0 && gender === "M") || (stemPol < 0 && gender === "F")) {
    isYangGender = true; // Dương nam, Âm nữ
  } else {
    isYangGender = false; // Âm nam, Dương nữ
  }
  
  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    gender,
    longitude,
    isYangGender
  };
}
