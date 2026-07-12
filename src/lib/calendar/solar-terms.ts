/**
 * Tính toán Tiết Khí (Solar Terms) dựa trên công thức Meeus mở rộng.
 * Đạt độ chính xác cao (< 1 phút sai số so với lịch chuẩn) nhờ sử dụng VSOP87D.
 */

import { VSOP87D_EARTH_L } from "./vsop87-earth";

/**
 * Tính Delta T (ΔT = TT - UT) bằng công thức đa thức của Espenak-Meeus (2006).
 * Nguồn: NASA Eclipse Web Site (https://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html)
 * 
 * @param year Năm
 * @param month Tháng (1-12)
 * @returns ΔT bằng giây
 */
export function getDeltaT(year: number, month: number): number {
  const y = year + (month - 0.5) / 12;
  let dt = 0;

  if (year < -500) {
    const u = (year - 1820) / 100;
    dt = -20 + 32 * u * u;
  } else if (year < 500) {
    const u = y / 100;
    dt = 10583.6 - 1014.41 * u + 33.78311 * u * u - 5.952053 * u * u * u
      - 0.1798452 * u * u * u * u + 0.022174192 * u * u * u * u * u + 0.0090316521 * u * u * u * u * u * u;
  } else if (year < 1600) {
    const u = (y - 1000) / 100;
    dt = 1574.2 - 556.01 * u + 71.23472 * u * u + 0.319781 * u * u * u
      - 0.8503463 * u * u * u * u - 0.005050998 * u * u * u * u * u + 0.0083572073 * u * u * u * u * u * u;
  } else if (year < 1700) {
    const t = y - 1600;
    dt = 120 - 0.9808 * t - 0.01532 * t * t + Math.pow(t, 3) / 7129;
  } else if (year < 1800) {
    const t = y - 1700;
    dt = 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t * t * t - Math.pow(t, 4) / 1174000;
  } else if (year < 1860) {
    const t = y - 1800;
    dt = 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t * t * t
      - 0.00037436 * t * t * t * t + 0.0000121272 * t * t * t * t * t - 0.0000001699 * t * t * t * t * t * t;
  } else if (year < 1900) {
    const t = y - 1860;
    dt = 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t * t * t
      - 0.0004473624 * t * t * t * t + Math.pow(t, 5) / 233174;
  } else if (year < 1920) {
    const t = y - 1900;
    dt = -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t;
  } else if (year < 1941) {
    const t = y - 1920;
    dt = 21.2 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
  } else if (year < 1961) {
    const t = y - 1950;
    dt = 29.07 + 0.407 * t - Math.pow(t, 2) / 233 + Math.pow(t, 3) / 2547;
  } else if (year < 1986) {
    const t = y - 1975;
    dt = 45.45 + 1.067 * t - Math.pow(t, 2) / 260 - Math.pow(t, 3) / 718;
  } else if (year < 2005) {
    const t = y - 2000;
    dt = 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * t * t * t * t
      + 0.00002373599 * Math.pow(t, 5);
  } else if (year < 2050) {
    const t = y - 2000;
    dt = 62.92 + 0.32217 * t + 0.005589 * t * t;
  } else if (year < 2150) {
    const u = (y - 1820) / 100;
    dt = -20 + 32 * Math.pow(u, 2) - 0.5628 * (2150 - y);
  } else {
    const u = (year - 1820) / 100;
    dt = -20 + 32 * u * u;
  }

  return dt;
}

/**
 * Tính kinh độ biểu kiến của Mặt Trời (Apparent Solar Longitude)
 * tại một thời điểm Julian Day Number (Universal Time).
 * Dựa trên Jean Meeus - Astronomical Algorithms (Ch. 32 & 25) sử dụng VSOP87D.
 * 
 * @param jdnUT Julian Day Number (UT)
 * @returns Kinh độ mặt trời biểu kiến (tính bằng độ, 0 - 360)
 */
export function getSolarLongitude(jdnUT: number): number {
  // 1. Tính Delta T xấp xỉ
  const a = Math.floor(jdnUT + 0.5);
  const alpha = Math.floor((a - 1867216.25) / 36524.25);
  const b = a + 1 + alpha - Math.floor(alpha / 4);
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const f = Math.floor((c - e) / 30.6001);
  const month = f < 14 ? f - 1 : f - 13;
  const year = month > 2 ? d - 4716 : d - 4715;

  const dt = getDeltaT(year, month); // giây
  
  // 2. Julian Ephemeris Day (JDE)
  const jde = jdnUT + dt / 86400;

  // 3. Tính Julian Millennia từ J2000.0 (tau)
  const tau = (jde - 2451545.0) / 365250;

  // 4. Tính L (Heliocentric longitude of Earth)
  let L_earth = 0;
  let tau_power = 1;
  const keys = ["0", "1", "2", "3", "4", "5"] as const;
  
  for (const k of keys) {
    const terms = VSOP87D_EARTH_L[k];
    if (!terms) continue;
    let sum = 0;
    for (const term of terms) {
      if (term[0] !== undefined && term[1] !== undefined && term[2] !== undefined) {
        sum += term[0] * Math.cos(term[1] + term[2] * tau);
      }
    }
    L_earth += sum * (k === "0" ? 1 : tau_power);
    tau_power *= tau;
  }

  // 5. Geocentric longitude of the Sun (Theta)
  let Theta = L_earth + Math.PI;

  // Đổi sang độ và chuẩn hóa
  let ThetaDeg = (Theta * 180) / Math.PI;
  ThetaDeg = ThetaDeg % 360;
  if (ThetaDeg < 0) ThetaDeg += 360;

  // 6. Nutation & Aberration để ra Apparent Longitude
  const T = (jde - 2451545.0) / 36525; // Julian centuries
  const Omega = 125.04 - 1934.136 * T;
  const dr = Math.PI / 180;
  
  // Rút gọn của Nutation in longitude (Delta Psi) & Aberration
  let lambda = ThetaDeg - 0.00569 - 0.00478 * Math.sin(Omega * dr);

  lambda = lambda % 360;
  if (lambda < 0) lambda += 360;

  return lambda;
}

/**
 * Các mốc tiết khí (tính bằng kinh độ hoàng đạo)
 */
export const SOLAR_TERMS = [
  { name: "Xuân Phân", longitude: 0 },
  { name: "Thanh Minh", longitude: 15 },
  { name: "Cốc Vũ", longitude: 30 },
  { name: "Lập Hạ", longitude: 45 },
  { name: "Tiểu Mãn", longitude: 60 },
  { name: "Mang Chủng", longitude: 75 },
  { name: "Hạ Chí", longitude: 90 },
  { name: "Tiểu Thử", longitude: 105 },
  { name: "Đại Thử", longitude: 120 },
  { name: "Lập Thu", longitude: 135 },
  { name: "Xử Thử", longitude: 150 },
  { name: "Bạch Lộ", longitude: 165 },
  { name: "Thu Phân", longitude: 180 },
  { name: "Hàn Lộ", longitude: 195 },
  { name: "Sương Giáng", longitude: 210 },
  { name: "Lập Đông", longitude: 225 },
  { name: "Tiểu Tuyết", longitude: 240 },
  { name: "Đại Tuyết", longitude: 255 },
  { name: "Đông Chí", longitude: 270 },
  { name: "Tiểu Hàn", longitude: 285 },
  { name: "Đại Hàn", longitude: 300 },
  { name: "Lập Xuân", longitude: 315 },
  { name: "Vũ Thủy", longitude: 330 },
  { name: "Kinh Trập", longitude: 345 },
];

/**
 * Tìm thời điểm Julian Day chính xác khi Mặt Trời đạt kinh độ mục tiêu.
 * Sử dụng thuật toán Secant (cát tuyến) hoặc Binary Search.
 */
export function findExactTermJd(year: number, targetLongitude: number): number {
  // Lấy một thời điểm tương đối để mồi (Mặt trời đi ~0.9856 độ/ngày)
  // Ước lượng JD mồi từ Lập Xuân (tầm mùng 4 tháng 2 hàng năm)
  // Lập xuân = 315 độ. Mùa xuân bắt đầu ở J2000 (năm 2000) vào tầm JD 2451579
  
  // Ta có thể tìm kiếm tuyến tính từng ngày từ đầu năm (1/1)
  // Chuyển 1/1/year sang JD
  // Tính JD của mùng 1 tháng 1 năm đó để làm mốc dò
  const jd0 = Date.UTC(year, 0, 1) / 86400000 + 2440587.5;
  
  // Dò từng ngày đến khi vượt qua targetLongitude
  // Lưu ý: kinh độ qua 360 -> 0 cần xử lý cẩn thận.
  let jd = jd0;
  let prevL = getSolarLongitude(jd);
  
  for (let i = 0; i < 370; i++) {
    const l = getSolarLongitude(jd + i);
    let diff = l - prevL;
    if (diff < -180) diff += 360; // vượt mốc 360
    
    // Nếu điểm target nằm giữa prevL và l
    let targetDiff = targetLongitude - prevL;
    if (targetDiff < -180) targetDiff += 360;
    
    if (targetDiff >= 0 && targetDiff <= diff) {
      // Đã tìm thấy khoảng ngày chứa tiết khí.
      // Dùng Binary Search để tinh chỉnh trong 24 giờ (1 ngày)
      let low = jd + i - 1;
      let high = jd + i;
      
      // Sai số mong muốn: < 1 giây (1/86400 ngày ~ 0.00001)
      for (let step = 0; step < 25; step++) {
        let mid = (low + high) / 2;
        let midL = getSolarLongitude(mid);
        
        let dMid = midL - targetLongitude;
        if (dMid < -180) dMid += 360;
        if (dMid > 180) dMid -= 360;
        
        if (dMid > 0) {
          high = mid;
        } else {
          low = mid;
        }
      }
      return (low + high) / 2;
    }
    prevL = l;
  }
  throw new Error(`Cannot find solar term ${targetLongitude} in year ${year}`);
}

export interface SolarTermRecord {
  name: string;
  longitude: number;
  utc: Date;
}

/**
 * Tính 24 tiết khí trong một năm dương lịch.
 * @param year Năm dương lịch
 */
export function getSolarTerms(year: number): SolarTermRecord[] {
  const records: SolarTermRecord[] = [];
  for (const term of SOLAR_TERMS) {
    const jd = findExactTermJd(year, term.longitude);
    const ms = (jd - 2440587.5) * 86400000;
    records.push({
      name: term.name,
      longitude: term.longitude,
      utc: new Date(ms)
    });
  }
  // Sắp xếp theo thời gian tăng dần
  records.sort((a, b) => a.utc.getTime() - b.utc.getTime());
  return records;
}

/**
 * Trả về chi tháng (branch index 0-11, 2 = Dần, ...) tại thời điểm Date.
 * Bát Tự dùng 12 Tiết Chính để chuyển tháng.
 * Các tiết chính: Lập Xuân (315, Dần), Kinh Trập (345, Mão), Thanh Minh (15, Thìn), Lập Hạ (45, Tị), Mang Chủng (75, Ngọ), Tiểu Thử (105, Mùi), Lập Thu (135, Thân), Bạch Lộ (165, Dậu), Hàn Lộ (195, Tuất), Lập Đông (225, Hợi), Đại Tuyết (255, Tý), Tiểu Hàn (285, Sửu).
 */
export function getMonthBranchAt(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const lon = getSolarLongitude(jd);
  
  // Xác định tiết chính (Major solar terms). Tiết chính có kinh độ = 315, 345, 15, 45, 75, ...
  // Mỗi tháng Bát tự kéo dài qua 1 Tiết Chính và 1 Trung Khí (kinh độ tăng 30 độ)
  
  // Góc offset từ Lập Xuân (315 độ)
  let offset = lon - 315;
  if (offset < 0) offset += 360;
  
  // Tháng Dần bắt đầu ở Lập Xuân (315). Mỗi tháng 30 độ.
  const monthOffset = Math.floor(offset / 30);
  
  // Tháng Dần = chi Dần = index 2 trong BRANCHES.
  return (2 + monthOffset) % 12;
}
