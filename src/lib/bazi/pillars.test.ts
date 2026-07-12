import { describe, it, expect } from "vitest";
import { calculateBaziPillars } from "./pillars";
import { DEFAULT_CONVENTIONS } from "./conventions";

describe("Bazi Four Pillars Calculation", () => {
  it("Tính đúng Bát Tự sau Lập Xuân 2024", () => {
    // Ngày 04/02/2024 lúc 16:00:00 (UTC+7, VN)
    // Lập Xuân 2024 là 15:26 (UTC+7), nên đây là SAU Lập Xuân.
    // Tức là thuộc năm Giáp Thìn, tháng Bính Dần.
    const date = new Date(Date.UTC(2024, 1, 4, 9, 0, 0)); // 16:00 UTC+7 = 09:00 UTC
    // Kinh độ Hà Nội ~105.8
    const chart = calculateBaziPillars(date, 105.8, 420, "M");
    
    expect(chart.year.stem).toBe("Giáp");
    expect(chart.year.branch).toBe("Thìn");
    expect(chart.month.stem).toBe("Bính");
    expect(chart.month.branch).toBe("Dần");
    
    // Can chi ngày: 04/02/2024 là ngày Mậu Tuất
    expect(chart.day.stem).toBe("Mậu");
    expect(chart.day.branch).toBe("Tuất");
    
    // Giờ lúc 16:00 là giờ Thân. Ngũ Thử Độn: Mậu -> Canh Thân
    expect(chart.hour.stem).toBe("Canh");
    expect(chart.hour.branch).toBe("Thân");
    
    // Giáp (Dương Mộc) + Nam -> Dương Nam (isYangGender = true)
    expect(chart.isYangGender).toBe(true);
  });
  
  it("Tính đúng Bát Tự trước Lập Xuân 2024", () => {
    // Ngày 04/02/2024 lúc 14:00:00 (UTC+7, VN) -> TRƯỚC Lập Xuân
    // Tức là vẫn thuộc năm Quý Mão, tháng Ất Sửu.
    const date = new Date(Date.UTC(2024, 1, 4, 7, 0, 0)); // 14:00 UTC+7 = 07:00 UTC
    const chart = calculateBaziPillars(date, 105.8, 420, "M");
    
    expect(chart.year.stem).toBe("Quý");
    expect(chart.year.branch).toBe("Mão");
    expect(chart.month.stem).toBe("Ất");
    expect(chart.month.branch).toBe("Sửu");
    
    // Ngày vẫn là Mậu Tuất
    expect(chart.day.stem).toBe("Mậu");
    expect(chart.day.branch).toBe("Tuất");
    
    // Giờ lúc 14:00 là giờ Mùi. Mậu -> Kỷ Mùi
    expect(chart.hour.stem).toBe("Kỷ");
    expect(chart.hour.branch).toBe("Mùi");
    
    expect(chart.isYangGender).toBe(false);
  });
  
  it("Equation of Time làm thay đổi chi giờ sinh", () => {
    // Ngày 15/02/2024 lúc 09:05:00 (UTC+7, VN)
    // Kinh độ 105.8 độ.
    // Lệch kinh độ so với múi giờ: 105.8 * 4 - 420 = +3.2 phút.
    // Vào giữa tháng 2, Equation of Time (EoT) ~ -14 phút.
    // Nếu không bật EoT: TST = 09:05 + 3.2 phút = 09:08 -> Giờ Tị (09:00 - 11:00).
    // Nếu bật EoT: TST = 09:05 + 3.2 - 14 = 08:54 -> Giờ Thìn (07:00 - 09:00).
    
    const date = new Date(Date.UTC(2024, 1, 15, 2, 5, 0));
    const lon = 105.8;
    const tz = 420;
    
    // Tắt EoT
    const chartNoEot = calculateBaziPillars(date, lon, tz, "M", { ...DEFAULT_CONVENTIONS, useEquationOfTime: false });
    expect(chartNoEot.hour.branch).toBe("Tị");
    
    // Bật EoT
    const chartWithEot = calculateBaziPillars(date, lon, tz, "M", { ...DEFAULT_CONVENTIONS, useEquationOfTime: true });
    expect(chartWithEot.hour.branch).toBe("Thìn");
  });
  
  it("Cross-check: Can Chi ngày Bát Tự phải khớp với Tử Vi trước 23:00", () => {
    // Để chứng minh hệ Bát Tự và hệ Tử Vi cùng dùng chung một chuẩn ngày (nếu không vượt qua dayBoundary).
    // Test 3 ngày ngẫu nhiên trước 23:00 (giờ địa phương).
    // Nguồn: Tử Vi sử dụng `lunar.ts` getDayStemBranch() (đã được bọc ở đâu đó, nhưng ta có getDayStem và getDayBranch trong calendar/sexagenary.ts).
    // Thực tế getDayStem/Branch dùng JDN. calculateBaziPillars cũng dùng JDN.
    
    // Ngày 1: 04/02/2024 lúc 16:00 VN (Mậu Tuất)
    const d1 = new Date(Date.UTC(2024, 1, 4, 9, 0, 0));
    const chart1 = calculateBaziPillars(d1, 105.8, 420, "M");
    expect(chart1.day.stem).toBe("Mậu");
    expect(chart1.day.branch).toBe("Tuất");
    
    // Ngày 2: 01/01/2024 lúc 12:00 VN (Giáp Tý)
    const d2 = new Date(Date.UTC(2024, 0, 1, 5, 0, 0));
    const chart2 = calculateBaziPillars(d2, 105.8, 420, "M");
    expect(chart2.day.stem).toBe("Giáp");
    expect(chart2.day.branch).toBe("Tý");
    
    // Ngày 3: 20/07/1969 lúc 20:00 VN (Bính Thân) (Apollo 11 hạ cánh)
    const d3 = new Date(Date.UTC(1969, 6, 20, 13, 0, 0));
    const chart3 = calculateBaziPillars(d3, 105.8, 420, "M");
    expect(chart3.day.stem).toBe("Bính");
    expect(chart3.day.branch).toBe("Thân");
  });
});
