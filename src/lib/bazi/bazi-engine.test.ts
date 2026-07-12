import { describe, it, expect } from "vitest";
import { generateBaziChart } from "./bazi-engine";

describe("Bazi Full Engine Calculation", () => {
  it("Tính toàn bộ lá số Bát Tự sau Lập Xuân 2024", () => {
    const date = new Date(Date.UTC(2024, 1, 4, 9, 0, 0)); // 04/02/2024 lúc 16:00:00 UTC+7
    const chart = generateBaziChart(date, 105.8, 420, "M");
    
    // Tứ trụ
    expect(chart.details.year.pillar.stem).toBe("Giáp");
    expect(chart.details.year.pillar.branch).toBe("Thìn");
    expect(chart.details.month.pillar.stem).toBe("Bính");
    expect(chart.details.month.pillar.branch).toBe("Dần");
    expect(chart.details.day.pillar.stem).toBe("Mậu");
    expect(chart.details.day.pillar.branch).toBe("Tuất");
    expect(chart.details.hour.pillar.stem).toBe("Canh");
    expect(chart.details.hour.pillar.branch).toBe("Thân");
    
    // Nạp Âm
    expect(chart.details.year.nayin).toBe("Phú Đăng Hoả");
    expect(chart.details.day.nayin).toBe("Bình Địa Mộc");
    
    // Tuần Không (Giáp Ngọ -> Thìn, Tị)
    expect(chart.voids).toEqual(["Thìn", "Tị"]);
    
    // Thai Nguyên (Bính Dần -> Đinh Tị)
    expect(chart.derived.conception.pillar.stem).toBe("Đinh");
    expect(chart.derived.conception.pillar.branch).toBe("Tị");
    
    // Mệnh Cung (Tháng Dần=3, Giờ Thân=9. 14 - (3+9) = 2 -> Sửu. Giáp Kỷ -> Bính Dần... -> Đinh Sửu)
    expect(chart.derived.lifePalace.pillar.stem).toBe("Đinh");
    expect(chart.derived.lifePalace.pillar.branch).toBe("Sửu");
    
    // Đại Vận Khởi Vận
    // Dương Nam, đi thuận. Lập Xuân (4/2), tiết tiếp là Kinh Trập (~5/3).
    // Khoảng cách ~ 30 ngày. Tuổi khởi vận ~ 10.
    expect(chart.luck.startAgeYear).toBeGreaterThanOrEqual(9);
    expect(chart.luck.startAgeYear).toBeLessThanOrEqual(11);
    
    // Thập Thần
    // Ngày Mậu (Thổ Dương). Năm Giáp (Mộc Dương) -> Thất Sát.
    expect(chart.details.year.tenGod).toBe("Thất Sát");
    // Tháng Bính (Hoả Dương) -> Thiên Ấn.
    expect(chart.details.month.tenGod).toBe("Thiên Ấn");
    // Giờ Canh (Kim Dương) -> Thực Thần.
    expect(chart.details.hour.tenGod).toBe("Thực Thần");
  });
});
