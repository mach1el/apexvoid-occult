import { describe, it, expect } from "vitest";
import { generateBaziChart } from "./bazi-engine";

describe("Bazi Full Engine", () => {
  it("Tính chuẩn xác Tứ Trụ, Đại Vận, Thập Thần, Tàng Can", () => {
    // 04/02/2024 lúc 16:00:00 (UTC+7, VN) -> Nam
    const date = new Date(Date.UTC(2024, 1, 4, 9, 0, 0)); 
    const chart = generateBaziChart(date, 105.8, "M");
    
    // Tứ trụ
    expect(chart.year.stem).toBe("Giáp");
    expect(chart.year.branch).toBe("Thìn");
    expect(chart.day.stem).toBe("Mậu"); // Nhật chủ Mậu
    
    // Thập Thần của trụ năm (Nhật chủ Mậu hành Thổ, Can năm Giáp hành Mộc)
    // Mộc khắc Thổ, Giáp (Dương Mộc), Mậu (Dương Thổ). Cùng cực, khắc mình = Thất Sát.
    expect(chart.tenGods.year).toBe("Thất Sát");
    
    // Tàng Can của trụ Năm (Thìn)
    // Thìn chứa: Mậu, Ất, Quý
    expect(chart.hiddenStems.year.length).toBe(3);
    expect(chart.hiddenStems.year.some(h => h.stem === "Mậu")).toBe(true);
    expect(chart.hiddenStems.year.some(h => h.stem === "Ất")).toBe(true);
    expect(chart.hiddenStems.year.some(h => h.stem === "Quý")).toBe(true);
    
    // Khởi vận (dương nam, đi thuận)
    // Tính tuổi khởi vận (số ngày / 3).
    expect(chart.startAge).toBeGreaterThanOrEqual(1);
    expect(chart.startAge).toBeLessThan(12); // Không quá 12 tuổi (khoảng 30 ngày)
    
    // Đại vận
    expect(chart.daYun.length).toBe(10);
    // Vận đầu tiên từ tuổi khởi vận
    expect(chart.daYun[0]!.ageStart).toBe(chart.startAge);
    // Vận đi thuận từ tháng Bính Dần -> Đinh Mão
    expect(chart.daYun[0]!.pillar.stem).toBe("Đinh");
    expect(chart.daYun[0]!.pillar.branch).toBe("Mão");
  });
});
