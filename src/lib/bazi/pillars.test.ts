import { describe, it, expect } from "vitest";
import { calculateBazi } from "./pillars";

describe("Bazi Four Pillars Calculation", () => {
  it("Tính đúng Bát Tự sau Lập Xuân 2024", () => {
    // Ngày 04/02/2024 lúc 16:00:00 (UTC+7, VN)
    // Lập Xuân 2024 là 15:26 (UTC+7), nên đây là SAU Lập Xuân.
    // Tức là thuộc năm Giáp Thìn, tháng Bính Dần.
    const date = new Date(Date.UTC(2024, 1, 4, 9, 0, 0)); // 16:00 UTC+7 = 09:00 UTC
    // Kinh độ Hà Nội ~105.8
    const chart = calculateBazi(date, 105.8, "M");
    
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
    const chart = calculateBazi(date, 105.8, "M");
    
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
    
    // Quý (Âm Thuỷ) + Nam -> Âm Nam (isYangGender = false)
    expect(chart.isYangGender).toBe(false);
  });
});
