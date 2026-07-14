/**
 * School Registry: Trung tâm cấu hình đa phái cho Bát Tự (Tứ Trụ).
 * Mọi quy ước khác biệt giữa các trường phái đều phải được định nghĩa ở đây.
 * Không hard-code các logic mang tính phái lẻ tẻ trong engine.
 */

export interface BaziConventions {
  /**
   * Thời điểm đổi ngày (ranh giới ngày).
   * - "zi23": Ngày mới bắt đầu từ 23:00 (giờ Tý). Can ngày đổi tại 23:00.
   * - "midnight": Ngày mới bắt đầu từ 00:00. Từ 23:00 đến 23:59 vẫn là can ngày cũ.
   * Default: "zi23"
   */
  dayBoundary: "zi23" | "midnight";
  
  /**
   * Có chia Tý sớm (00:00 - 01:00) và Tý muộn (23:00 - 00:00) hay không.
   * Nếu true, Tý muộn có can giờ tính theo ngày cũ, Tý sớm có can giờ tính theo ngày mới.
   * Lưu ý: Cái này thường đi kèm với dayBoundary="midnight".
   * Default: false
   */
  earlyLateZi: boolean;

  /**
   * Hiệu chỉnh Phương trình thời gian (Equation of Time) khi tính True Solar Time.
   * Do quỹ đạo Trái Đất hình elip, Mặt Trời có thể đi nhanh/chậm tối đa ±16 phút so với đồng hồ.
   * - true: Bật (tính chính xác TST).
   * - false: Tắt (chỉ dùng hiệu chỉnh kinh độ).
   * Default: true
   */
  useEquationOfTime: boolean;

  /**
   * Can âm đi nghịch vòng Trường Sinh.
   * - true: Phái cổ điển (Tử Bình Chân Thuyên), can âm đi nghịch.
   * - false: Một số phái hiện đại cho rằng can âm dương cùng hành thì cùng gốc, đều đi thuận.
   * Default: true
   */
  yinLifeStageReverse: boolean;

  /**
   * Dị bản bảng Thiên Ất Quý Nhân.
   * - "A": Giáp/Mậu -> Sửu/Mùi; Canh/Tân -> Ngọ/Dần (Khớp engine Tử Vi hiện có).
   * - "B": Dị bản "Giáp Mậu Canh Ngưu Dương" (Giáp/Mậu/Canh -> Sửu/Mùi).
   * Default: "A"
   */
  quyNhanVariant: "A" | "B";

  /**
   * Nguồn gốc khởi Thần Sát.
   * - "dayFirst": Khởi từ Chi Ngày (phái Tử Bình thường dùng).
   * - "yearFirst": Khởi từ Chi Năm (phái Bát Tự cổ thường dùng).
   * Engine sẽ tính cả 2 và gán nhãn, cấu hình này có thể dùng làm mốc ưu tiên mặc định.
   * Default: "dayFirst"
   */
  thanSatBase: "dayFirst" | "yearFirst";

  /**
   * Phương pháp luận Dụng / Hỷ / Kỵ Thần.
   * - "phu-uc": Phù Ức (Cân bằng Nhật Chủ)
   * - "dieu-hau": Điều Hậu (Hàn Noãn)
   * - "thong-quan": Thông Quan
   * Default: "phu-uc"
   */
  baziYongShenMethod: "phu-uc" | "dieu-hau" | "thong-quan";

  /**
   * Trọng số tính điểm Ngũ Hành.
   */
  elementWeights: {
    // Trọng số Thiên Can lộ ra
    heavenlyStem: number;
    // Trọng số Tàng Can theo role
    hiddenStems: {
      "Bản khí": number;
      "Trung khí": number;
      "Dư khí": number;
    };
    // Hệ số nhân cho Chi Tháng (Lệnh tháng)
    monthBranchMultiplier: number;
    // Trọng số cho từng Trụ
    pillarMultipliers: {
      year: number;
      month: number;
      day: number;
      hour: number;
    };
  };
}

export const DEFAULT_CONVENTIONS: BaziConventions = {
  dayBoundary: "zi23",
  earlyLateZi: false,
  useEquationOfTime: true,
  yinLifeStageReverse: true,
  quyNhanVariant: "A",
  thanSatBase: "dayFirst",
  baziYongShenMethod: "phu-uc",
  elementWeights: {
    heavenlyStem: 1.0,
    hiddenStems: {
      "Bản khí": 1.0,
      "Trung khí": 0.6,
      "Dư khí": 0.3,
    },
    monthBranchMultiplier: 2.0,
    pillarMultipliers: {
      year: 1.0,
      month: 1.2,
      day: 1.2,
      hour: 1.0,
    },
  },
};
