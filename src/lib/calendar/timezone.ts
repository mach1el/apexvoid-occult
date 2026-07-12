/**
 * Các hàm liên quan đến múi giờ, kinh độ và True Solar Time.
 */

import { BRANCHES } from "./sexagenary";

import { BaziConventions, DEFAULT_CONVENTIONS } from "../bazi/conventions";

/**
 * LỊCH SỬ MÚI GIỜ VIỆT NAM (Dành cho việc tra cứu):
 * 
 * - Trước 01/05/1911: Mỗi địa phương dùng giờ mặt trời riêng. Sài Gòn dùng UTC+7:06:30.
 * - 01/05/1911 - 31/12/1942: Cả nước dùng giờ Đông Dương: UTC+7:00.
 * - 01/01/1943 - 31/03/1945: Dùng múi giờ Tokyo: UTC+8:00.
 * - 01/04/1945 - 01/09/1945: Dùng UTC+9:00.
 * - 02/09/1945 - nay (Miền Bắc): Đa phần dùng UTC+7:00.
 * - 01/07/1955 - 31/12/1959 (Miền Nam): UTC+7:00.
 * - 01/01/1960 - 12/06/1975 (Miền Nam): UTC+8:00.
 * - Từ 13/06/1975 - nay: Cả nước thống nhất UTC+7:00.
 * 
 * Do sự phức tạp này, engine KHÔNG tự đoán múi giờ. Người dùng phải cung cấp `utcOffsetMinutes` rõ ràng.
 */

/**
 * Tính True Solar Time (thời gian mặt trời thật) từ giờ địa phương.
 * 
 * @param date Thời điểm giờ địa phương.
 * @param longitude Kinh độ nơi sinh (độ).
 * @param timezoneOffset Múi giờ chuẩn của giờ địa phương đó (ví dụ +7 cho VN).
 * @returns Date chứa True Solar Time tương ứng.
 */
export function getTrueSolarTime(date: Date, longitude: number, timezoneOffsetMinutes: number, conventions: BaziConventions = DEFAULT_CONVENTIONS): Date {
  // True Solar Time (TST) bằng UTC + Kinh độ * 4 phút + Equation of Time.
  // Ta trả về một Date object mà các hàm .getUTCHours(), .getUTCMinutes() của nó 
  // sẽ phản ánh chính xác giờ/phút của True Solar Time tại địa phương.
  
  const longitudeOffsetMinutes = longitude * 4;
  
  // Equation of Time (EoT) - Chênh lệch do quỹ đạo elip của Trái Đất và độ nghiêng trục Trái Đất.
  let equationOfTimeMinutes = 0;
  
  if (conventions.useEquationOfTime) {
    // Tính Equation of Time (EoT) dựa theo công thức của NOAA (kế thừa từ Meeus)
    const jdn = date.getTime() / 86400000 + 2440587.5;
    const T = (jdn - 2451545.0) / 36525.0; // Thế kỷ Julian
    const dr = Math.PI / 180;
    
    // Mean Longitude của Mặt Trời (độ)
    let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    // Mean Anomaly (độ)
    let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    
    // Tâm sai quỹ đạo Trái Đất
    const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    // Độ nghiêng trục Trái Đất (Mean Obliquity)
    const epsilon = 23.439291 - 0.013004167 * T - 0.00000016389 * T * T + 0.0000005036 * T * T * T;
    
    const y = Math.pow(Math.tan(epsilon / 2 * dr), 2);
    const L0_rad = L0 * dr;
    const M_rad = M * dr;
    
    // EoT tính bằng radian
    const eotRad = y * Math.sin(2 * L0_rad) 
                 - 2 * e * Math.sin(M_rad) 
                 + 4 * e * y * Math.sin(M_rad) * Math.cos(2 * L0_rad) 
                 - 0.5 * y * y * Math.sin(4 * L0_rad) 
                 - 1.25 * e * e * Math.sin(2 * M_rad);
                 
    // Chuyển từ radian sang phút thời gian (1 độ = 4 phút -> 1 rad = 4 * 180 / PI)
    equationOfTimeMinutes = eotRad * 4 * (180 / Math.PI);
  }
  
  const totalCorrectionMs = (longitudeOffsetMinutes + equationOfTimeMinutes) * 60 * 1000;
  
  return new Date(date.getTime() + totalCorrectionMs);
}

/**
 * Tìm chỉ số Địa Chi (0-11 tương ứng Tý-Hợi) của giờ.
 * Và xác định xem giờ này có được tính là ngày hôm sau hay không.
 */
export function getHourBranch(solarTime: Date, conventions: BaziConventions = DEFAULT_CONVENTIONS): { branchIndex: number, isNextDay: boolean } {
  const hours = solarTime.getUTCHours();
  const minutes = solarTime.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Tổng phút của ngày 0 - 1440
  // Tính branchIndex: 120 phút = 1 canh giờ.
  let branchIndex = Math.floor(((totalMinutes + 60) % 1440) / 120);
  
  let isNextDay = false;
  
  if (conventions.dayBoundary === "midnight") {
    if (conventions.earlyLateZi) {
      // Nếu dayBoundary = midnight VÀ có bật earlyLateZi
      // Từ 23:00 - 23:59: Vẫn tính Tý của ngày cũ
      if (hours === 23) {
        isNextDay = false; 
      }
    } else {
      // Nếu dayBoundary = midnight VÀ KHÔNG bật earlyLateZi
      // Tức là can ngày không đổi lúc 23h, nhưng Tý muộn lại tính thành Tý của ngày tiếp theo?!
      // Tử Bình thường nếu không chia Tý sớm/muộn thì luôn dùng dayBoundary=zi23. 
      // Nhưng nếu ai đó ép dùng midnight mà không chia Tý:
      if (hours === 23) {
        isNextDay = false;
      }
    }
  } else {
    // conventions.dayBoundary === "zi23" (Mặc định Bát Tự)
    // 23:00 - 01:00 đều là Tý của ngày mai.
    if (hours === 23) {
      isNextDay = true;
    }
  }
  
  return { branchIndex, isNextDay };
}
