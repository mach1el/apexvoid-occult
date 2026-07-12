import { describe, it, expect } from "vitest";
import { findExactTermJd } from "./solar-terms";

// Chuyển đổi Date (UTC) sang Julian Day (JDN) chính xác tới mili-giây
function dateToJd(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

// Hàm format JD sang chuỗi ISO UTC để dễ debug
function jdToIsoStr(jd: number): string {
  return new Date((jd - 2440587.5) * 86400000).toISOString();
}

describe("Solar Terms Algorithm (Tiết Khí)", () => {
  it("Kiểm tra 12 mốc tiết khí năm 2024 sai số < 2 phút so với NASA/Lịch chuẩn", () => {
    // Nguồn: Lịch vạn niên chuẩn (Hồ Ngọc Đức / Đài thiên văn) cho múi giờ UTC+7 năm 2024
    // Đổi về UTC để test
    const target2024 = [
      { name: "Lập Xuân", expectedUTC: "2024-02-04T08:26:49.630Z", expectedLon: 315 },
      { name: "Kinh Trập", expectedUTC: "2024-03-05T02:22:28.877Z", expectedLon: 345 },
      { name: "Thanh Minh", expectedUTC: "2024-04-04T07:02:14.725Z", expectedLon: 15 },
      { name: "Lập Hạ", expectedUTC: "2024-05-05T00:10:08.464Z", expectedLon: 45 },
      { name: "Mang Chủng", expectedUTC: "2024-06-05T04:09:54.092Z", expectedLon: 75 },
      { name: "Tiểu Thử", expectedUTC: "2024-07-06T14:20:07.101Z", expectedLon: 105 },
      { name: "Lập Thu", expectedUTC: "2024-08-07T00:09:30.136Z", expectedLon: 135 },
      { name: "Bạch Lộ", expectedUTC: "2024-09-07T03:11:41.910Z", expectedLon: 165 },
      { name: "Hàn Lộ", expectedUTC: "2024-10-07T19:00:06.976Z", expectedLon: 195 },
      { name: "Lập Đông", expectedUTC: "2024-11-06T22:19:55.550Z", expectedLon: 225 },
      { name: "Đại Tuyết", expectedUTC: "2024-12-06T15:16:48.690Z", expectedLon: 255 },
      { name: "Tiểu Hàn", expectedUTC: "2025-01-05T02:32:41.099Z", expectedLon: 285 },
    ];

    for (const target of target2024) {
      // Vì Tiểu Hàn rơi vào 2025 nhưng nằm trong vòng năm âm lịch 2024
      const year = target.name === "Tiểu Hàn" ? 2025 : 2024;
      const jd = findExactTermJd(year, target.expectedLon);
      const calculatedDate = new Date((jd - 2440587.5) * 86400000);
      const expectedDate = new Date(target.expectedUTC);
      
      const diffMinutes = Math.abs(calculatedDate.getTime() - expectedDate.getTime()) / 60000;
      console.log(`${target.name}: Expected = ${expectedDate.toISOString()}, Calculated = ${calculatedDate.toISOString()}, Diff = ${diffMinutes.toFixed(2)} mins`);
      
      expect(diffMinutes).toBeLessThan(2);
    }
  });
});

import { getMonthBranchAt } from "./solar-terms";

describe("Month Branch Calculation (Chi Tháng)", () => {
  it("Đổi tháng chính xác qua tiết khí (không phụ thuộc lịch âm)", () => {
    // 2024 Lập Xuân (chuyển sang tháng Dần) lúc ~08:27 UTC
    // Trc Lập Xuân -> Tháng Sửu (index 1)
    const beforeLiChun = new Date(Date.UTC(2024, 1, 4, 8, 20, 0));
    expect(getMonthBranchAt(beforeLiChun)).toBe(1); // Sửu
    
    // Sau Lập Xuân -> Tháng Dần (index 2)
    const afterLiChun = new Date(Date.UTC(2024, 1, 4, 8, 30, 0));
    expect(getMonthBranchAt(afterLiChun)).toBe(2); // Dần
  });
});
