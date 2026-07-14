export interface Province {
  code: string;
  name: string;
  longitude: number;
}

export const PROVINCES: Province[] = [
  { code: "ha-noi", name: "Hà Nội", longitude: 105.85 },
  { code: "hai-phong", name: "Hải Phòng", longitude: 106.68 },
  { code: "quang-ninh", name: "Quảng Ninh (Hạ Long)", longitude: 107.08 },
  { code: "thanh-hoa", name: "Thanh Hóa", longitude: 105.78 },
  { code: "nghe-an", name: "Nghệ An (Vinh)", longitude: 105.68 },
  { code: "hue", name: "Huế", longitude: 107.60 },
  { code: "da-nang", name: "Đà Nẵng", longitude: 108.22 },
  { code: "quang-nam", name: "Quảng Nam (Tam Kỳ)", longitude: 108.48 },
  { code: "binh-dinh", name: "Bình Định (Quy Nhơn)", longitude: 109.22 },
  { code: "khanh-hoa", name: "Khánh Hòa (Nha Trang)", longitude: 109.19 },
  { code: "dak-lak", name: "Đắk Lắk (Buôn Ma Thuột)", longitude: 108.05 },
  { code: "lam-dong", name: "Lâm Đồng (Đà Lạt)", longitude: 108.44 },
  { code: "hcm", name: "TP. Hồ Chí Minh", longitude: 106.70 },
  { code: "dong-nai", name: "Đồng Nai (Biên Hòa)", longitude: 106.82 },
  { code: "brvt", name: "Bà Rịa–Vũng Tàu", longitude: 107.08 },
  { code: "can-tho", name: "Cần Thơ", longitude: 105.78 },
  { code: "an-giang", name: "An Giang (Long Xuyên)", longitude: 105.44 },
  { code: "ca-mau", name: "Cà Mau", longitude: 105.15 },
];

// Không nằm trong PROVINCES: không có kinh độ cố định, và kinh độ nhập tay
// (vd. sinh ở nước ngoài) có thể nằm ngoài khoảng kinh độ hợp lệ của Việt Nam.
export const MANUAL_PROVINCE_CODE = "khac";
export const MANUAL_PROVINCE_LABEL = "Khác / Nhập kinh độ thủ công";

export const DEFAULT_PROVINCE_CODE = "ha-noi";
export const DEFAULT_MANUAL_LONGITUDE = 105.8;

export function getProvinceByCode(code: string): Province | undefined {
  return PROVINCES.find((p) => p.code === code);
}

export function resolveLongitude(provinceCode: string, manualLongitude: number): number {
  if (provinceCode === MANUAL_PROVINCE_CODE) return manualLongitude;
  return (
    getProvinceByCode(provinceCode)?.longitude ??
    getProvinceByCode(DEFAULT_PROVINCE_CODE)!.longitude
  );
}
