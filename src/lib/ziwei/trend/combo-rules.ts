/**
 * Catalog cách cục Đại vận — SSOT điểm + điều kiện.
 *
 * Nguồn: `cach_cuc_tu_vi.txt` (thầy chốt điểm/điều kiện).
 * Kiến trúc pipeline: công thức 6 bước Đại vận.
 *
 * KHÔNG nhúng rule phán bệnh / tử vong / tuổi thọ (AGENTS §8):
 * loại CAT_09, HUNG_10, HUNG_11, HUNG_14, REL_05 khỏi catalog này.
 */

export type ComboLayer = "cat" | "hung";

export type ComboScope =
  | "tp4c"
  | "dong"
  | "focus"
  | "giap"
  | "nhi-hop"
  | "phu-the";

export type ComboEffect =
  | { kind: "add" }
  /** Nhân toàn bộ điểm Cát đã cộng trước combo (HUNG_08). */
  | { kind: "halve-cat" }
  /** Giảm 50% hung của Không/Kiếp/Hỏa/Linh trong khung (SPEC_04). */
  | { kind: "halve-sat-hung" }
  /** Giảm 50% hung Trường Sinh·Tuyệt (SPEC_02). */
  | { kind: "halve-tuyet-hung" }
  /** Hệ số Tuần/Triệt môi trường (SPEC_01 / SPEC_05). */
  | { kind: "tuan-factor"; factor: number };

export interface ComboRule {
  id: string;
  label: string;
  layer: ComboLayer;
  points: number;
  scope: ComboScope;
  /** Nhóm mutual-exclusion: cùng group chỉ lấy 1 hit mạnh nhất. */
  group?: string;
  effect?: ComboEffect;
  /** Ghi chú điều kiện — evaluator đọc id để áp predicate chuyên biệt. */
  notes: string;
  source: "cach_cuc_tu_vi.txt";
}

/**
 * Danh sách rule được phép chạy.
 * Predicate chi tiết nằm trong `combo-eval.ts` (khớp id).
 */
export const COMBO_RULES: ComboRule[] = [
  // ── MODULE 1: Đại phúc đại quý ──
  {
    id: "CAT_01",
    label: "Quân Thần Khánh Hội",
    layer: "cat",
    points: 18,
    scope: "tp4c",
    notes: "Tử Vi hoặc Thiên Phủ Miếu/Vượng + Tả Phụ + Hữu Bật (+ Khôi/Việt/Lộc Tồn)",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_02",
    label: "Sát Phá Tham Cát Hóa",
    layer: "cat",
    points: 16,
    scope: "tp4c",
    group: "satPhaTham",
    notes: "Thất Sát/Phá Quân/Tham Lang Miếu·Vượng·Đắc + Hỏa/Linh Đắc hoặc Tứ Hóa cát",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_03",
    label: "Tam Hóa Liên Châu",
    layer: "cat",
    points: 16,
    scope: "tp4c",
    notes:
      "Đủ Hóa Khoa + Hóa Quyền + Hóa Lộc; Không/Kiếp/sát không hủy Cát (cộng Hung riêng)",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_04",
    label: "Cơ Nguyệt Đồng Lương",
    layer: "cat",
    points: 14,
    scope: "tp4c",
    notes: "Thiên Cơ + Thái Âm + Thiên Đồng + Thiên Lương Miếu/Vượng/Đắc (+ Xương Khúc/Khoa Quyền Lộc)",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_05",
    label: "Nhật Nguyệt Tịnh Minh",
    layer: "cat",
    points: 15,
    scope: "tp4c",
    notes: "Thái Dương ở Ngọ/Tỵ + Thái Âm ở Tý/Hợi chiếu Mệnh/Quan/Tài",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_06",
    label: "Thạch Trung Ẩn Ngọc",
    layer: "cat",
    points: 14,
    scope: "tp4c",
    notes: "Cự Môn Tý/Ngọ + Hóa Lộc / Hóa Khoa / Lộc Tồn",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_07",
    label: "Tham Vũ Đồng Hành",
    layer: "cat",
    points: 15,
    scope: "dong",
    notes: "Tham Lang + Vũ Khúc đồng cung Sửu/Mùi + Hóa Lộc/Quyền/Hỏa",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_08",
    label: "Lộc Mã Giao Trì",
    layer: "cat",
    points: 12,
    scope: "tp4c",
    notes: "Lộc Tồn hoặc Hóa Lộc + Thiên Mã Đắc đồng cung hoặc hợp chiếu",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_10",
    label: "Hùng Tú Càn Nguyên",
    layer: "cat",
    points: 14,
    scope: "dong",
    notes: "Liêm Trinh + Thất Sát đồng cung Mùi + Hóa Lộc / Tả Hữu",
    source: "cach_cuc_tu_vi.txt",
  },

  // ── MODULE 2: Văn chương / quyền ──
  {
    id: "CAT_11",
    label: "Dương Lương Xương Lộc",
    layer: "cat",
    points: 14,
    scope: "tp4c",
    notes: "Thái Dương + Thiên Lương + Văn Xương + Lộc Tồn/Hóa Lộc",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_12",
    label: "Bộ Tứ Văn Tinh",
    layer: "cat",
    points: 12,
    scope: "tp4c",
    notes: "Khôi + Việt + Xương + Khúc Miếu/Đắc",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_13",
    label: "Binh Hình Tướng Ấn",
    layer: "cat",
    points: 12,
    scope: "tp4c",
    notes: "Phục Binh + Thiên Hình Đắc + Tướng Quân + Quốc Ấn",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_14",
    label: "Tấu Thư Xương Khúc",
    layer: "cat",
    points: 10,
    scope: "tp4c",
    notes: "Tấu Thư + Văn Xương + Văn Khúc + Hóa Khoa",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_15",
    label: "Minh Lộc Ám Lộc",
    layer: "cat",
    points: 12,
    scope: "nhi-hop",
    notes: "Bản cung Hóa Lộc/Lộc Tồn, nhị hợp có Lộc còn lại",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "CAT_16",
    label: "Giáp Quyền Giáp Lộc",
    layer: "cat",
    points: 10,
    scope: "giap",
    notes: "Mệnh/Tài/Quan bị hai cung kề giáp Hóa Quyền và Hóa Lộc",
    source: "cach_cuc_tu_vi.txt",
  },

  // ── Đại Giải Ách (6-step + catalog SPEC_04 bonus điểm) ──
  {
    id: "CAT_GIAI_ACH",
    label: "Đại Giải Ách",
    layer: "cat",
    points: 12,
    scope: "tp4c",
    notes: "≥4 sao cứu giải (Quang/Quý/Quan/Phúc/Giải/Đức…) hội tụ TP4C",
    source: "cach_cuc_tu_vi.txt",
  },

  // ── MODULE 3–4: Hung (không gồm rule y tế/tử vong) ──
  {
    id: "HUNG_01",
    label: "Linh Xương Đà Vũ",
    layer: "hung",
    points: 20,
    scope: "tp4c",
    notes: "Vũ Khúc + Văn Xương + Linh Tinh + Đà La (Hãm)",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_02",
    label: "Đế Ngộ Hung Đồ",
    layer: "hung",
    points: 16,
    scope: "tp4c",
    notes: "Tử Vi Mão/Dậu + Tham Lang + Địa Không/Kiếp",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_03",
    label: "Sát Phá Tham Hãm ngộ Kỵ",
    layer: "hung",
    points: 18,
    scope: "tp4c",
    group: "satPhaTham",
    notes: "Thất Sát/Phá Quân/Tham Lang Hãm + Lục Sát/Hóa Kỵ",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_04",
    label: "Lộc Phùng Xung Phá",
    layer: "hung",
    points: 16,
    scope: "tp4c",
    notes: "Hóa Lộc/Lộc Tồn + Địa Không/Kiếp/Hóa Kỵ Hãm",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_05",
    label: "Nhật Nguyệt Phản Bối",
    layer: "hung",
    points: 15,
    scope: "tp4c",
    notes: "Thái Dương Hãm Tuất/Hợi/Tý + Thái Âm Hãm Mão/Thìn/Tỵ, không Tuần/Triệt/Khoa",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_06",
    label: "Mã Chiết Túc",
    layer: "hung",
    points: 14,
    scope: "tp4c",
    notes: "Thiên Mã + Đà La / Hóa Kỵ / Tuần Triệt",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_07",
    label: "Cự Kỵ / Ám Thượng Gia Ám",
    layer: "hung",
    points: 16,
    scope: "tp4c",
    notes: "Cự Môn Hãm + Hóa Kỵ + Đà La/Thiên Hình",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_08",
    label: "Cát Xứ Tàng Hung",
    layer: "hung",
    points: 14,
    scope: "tp4c",
    effect: { kind: "halve-cat" },
    notes: "Chính tinh Miếu/Vượng (+ Khoa Quyền Lộc) + Không Kiếp/Hỏa Linh Hãm",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_09",
    label: "Khốc Hư Tang Hổ",
    layer: "hung",
    points: 15,
    scope: "tp4c",
    notes: "Thiên Khốc + Thiên Hư + Tang Môn + Bạch Hổ",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_12",
    label: "Hình Tù Giáp Ấn",
    layer: "hung",
    points: 16,
    scope: "tp4c",
    notes: "Liêm Trinh + Thiên Hình + Kình Dương + Bạch Hổ ở Mệnh/Quan/Tật",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "HUNG_13",
    label: "Đào Hoa Sát",
    layer: "hung",
    points: 14,
    scope: "tp4c",
    notes: "Đào Hoa/Hồng Loan + Địa Kiếp/Thiên Riêu/Hóa Kỵ/Tham Lang Hãm, không Hóa Khoa",
    source: "cach_cuc_tu_vi.txt",
  },

  // ── MODULE 5: REL (không gồm REL_05 khắc phối) ──
  {
    id: "REL_01",
    label: "Đào Hồng Hỷ Cát",
    layer: "cat",
    points: 12,
    scope: "phu-the",
    notes: "Đào Hoa + Hồng Loan + Thiên Hỷ (+ Quý/Khoa Quyền) tại Phu Thê",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "REL_02",
    label: "Cô Quả Khách Kỵ",
    layer: "hung",
    points: 14,
    scope: "phu-the",
    notes: "Cô Thần + Quả Tú + Điếu Khách + Hóa Kỵ (hoặc Nhật/Nguyệt Hãm) ở Phu Thê",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "REL_03",
    label: "Tham Liêm Đào Hồng",
    layer: "hung",
    points: 12,
    scope: "phu-the",
    notes: "Tham Lang + Liêm Trinh Hãm Tỵ/Hợi + Đào/Hồng tại Phu Thê",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "REL_04",
    label: "Lộc Mã Phu Thê",
    layer: "cat",
    points: 12,
    scope: "phu-the",
    notes: "Lộc Tồn + Thiên Mã ở cung Phu Thê",
    source: "cach_cuc_tu_vi.txt",
  },

  // ── MODULE 6: SPEC overrides ──
  {
    id: "SPEC_01",
    label: "VCD Đắc Tam/Nhị Không",
    layer: "cat",
    points: 14,
    scope: "focus",
    effect: { kind: "tuan-factor", factor: 1.3 },
    notes: "Vô chính diệu + ≥2 Không (Tuần/Triệt/Địa Không/Thiên Không)",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "SPEC_02",
    label: "Tuyệt Xứ Phùng Sinh",
    layer: "cat",
    points: 12,
    scope: "focus",
    effect: { kind: "halve-tuyet-hung" },
    notes: "Cung Tuyệt + Lộc Tồn/Hóa Lộc/Quý Nhân/Hóa Khoa",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "SPEC_03",
    label: "Lương Mã Phiêu Lãng",
    layer: "hung",
    points: 10,
    scope: "tp4c",
    notes: "Thiên Lương + Thiên Mã Hãm tại Tỵ/Hợi/Dần/Thân",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "SPEC_04",
    label: "Khoa Chế Không",
    layer: "cat",
    points: 0,
    scope: "tp4c",
    effect: { kind: "halve-sat-hung" },
    notes: "Hóa Khoa hoặc ≥3 Giải Thần gặp Không/Kiếp/Hỏa — giảm 50% hung sát đó",
    source: "cach_cuc_tu_vi.txt",
  },
  {
    id: "SPEC_05",
    label: "Phản Vi Kỳ Cách",
    layer: "hung",
    points: 0,
    scope: "focus",
    effect: { kind: "tuan-factor", factor: 0.35 },
    notes: "Chính tinh Hãm hoặc ≥3 Lục Sát Hãm + Tuần/Triệt → giảm áp lực hung",
    source: "cach_cuc_tu_vi.txt",
  },
];

/** Rule bị loại vì AGENTS §8 — chỉ để audit/test không import nhầm. */
export const EXCLUDED_MEDICAL_COMBO_IDS = [
  "CAT_09", // Thọ Tinh — tuổi thọ
  "HUNG_10", // Thương Sứ — bệnh
  "HUNG_11", // Lộ Thượng Mai Thi — tử vong
  "HUNG_14", // Bệnh Phù — bệnh
  "REL_05", // Khốc Hư Tang Hổ Phu Thê — khắc phối/ốm
] as const;

export function comboRuleById(id: string): ComboRule | undefined {
  return COMBO_RULES.find((rule) => rule.id === id);
}
