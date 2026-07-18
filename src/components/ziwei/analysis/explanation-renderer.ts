/** Map explanationKey → Vietnamese copy (no free-form reason parsing). */

const LABELS: Record<string, string> = {
  "major.borrowed-from-opposite": "Chính tinh mượn từ đối cung (VCD)",
  "void.borrow-context": "Bối cảnh vô chính diệu",
  "void.double-empty": "Vô chính diệu — đối cung cũng trống",
  "void.local-attenuation": "Suy giảm cục bộ Tuần/Triệt",
  "transform.Lộc": "Hóa Lộc gốc",
  "transform.Quyền": "Hóa Quyền gốc",
  "transform.Khoa": "Hóa Khoa gốc",
  "transform.Kỵ": "Hóa Kỵ gốc",
  "minor.strong-support": "Phụ tinh hỗ trợ mạnh",
  "minor.standard-support": "Phụ tinh hỗ trợ",
  "minor.academic-literary": "Nhóm văn học",
  "minor.wealth-resource": "Nhóm tài nguyên",
  "minor.movement-action": "Nhóm hành động",
  "minor.romance-visibility": "Nhóm duyên/hiển lộ",
  "minor.major-malefic": "Sát tinh chính",
  "minor.standard-pressure": "Áp lực phụ",
  "rule.rule-tu-phu-vu-tuong": "Cách cục Tử Phủ Vũ Tướng",
  "rule.rule-co-nguyet-dong-luong": "Cách cục Cơ Nguyệt Đồng Lương",
  "rule.rule-sat-pha-tham": "Cách cục Sát Phá Tham",
};

const PALACE_DOMAIN: Record<string, string> = {
  Mệnh: "bản thân, khí chất, khả năng tự chủ",
  "Phụ Mẫu": "nền hỗ trợ, cấp trên, giấy tờ",
  "Phúc Đức": "nội tâm, nền tinh thần, phúc khí",
  "Điền Trạch": "nền tảng, nhà cửa, tài sản cố định",
  "Quan Lộc": "công việc, vai trò, nghề nghiệp",
  "Nô Bộc": "mạng lưới, cộng sự, quan hệ xã hội",
  "Thiên Di": "môi trường ngoài, di chuyển, tương tác bên ngoài",
  "Tật Ách": "sức bền, áp lực, khả năng phục hồi",
  "Tài Bạch": "tài nguyên, thu nhập, quản trị tiền",
  "Tử Tức": "sản phẩm, sáng tạo, hậu thế",
  "Phu Thê": "quan hệ một-một, hợp tác",
  "Huynh Đệ": "người ngang hàng, nguồn lực gần",
};

export function renderExplanationKey(key: string, fallbackLabel: string): string {
  if (LABELS[key]) return LABELS[key]!;
  if (key.startsWith("major.")) {
    return `Chính tinh ${key.slice("major.".length)}`;
  }
  if (key.startsWith("chang-sheng.")) {
    return `Trường Sinh · ${key.slice("chang-sheng.".length)}`;
  }
  return fallbackLabel;
}

export function palaceDomainHint(palaceName: string): string | null {
  return PALACE_DOMAIN[palaceName] ?? null;
}
