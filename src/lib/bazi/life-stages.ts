import { BRANCHES, STEM_POLARITY } from "../calendar/sexagenary";
import { BaziConventions, DEFAULT_CONVENTIONS } from "./conventions";

export const LIFE_STAGES = [
  "Trường Sinh", // 0
  "Mộc Dục",     // 1
  "Quan Đới",    // 2
  "Lâm Quan",    // 3
  "Đế Vượng",    // 4
  "Suy",         // 5
  "Bệnh",        // 6
  "Tử",          // 7
  "Mộ",          // 8
  "Tuyệt",       // 9
  "Thai",        // 10
  "Dưỡng"        // 11
];

/**
 * Trả về vị trí (index của BRANCHES: Tý=0, Sửu=1...) mà can X bắt đầu mốc "Trường Sinh".
 */
export function getLifeStageStartBranchIndex(stem: string, conventions: BaziConventions = DEFAULT_CONVENTIONS): number {
  const isYang = (STEM_POLARITY[stem] ?? 1) > 0;
  
  if (!conventions.yinLifeStageReverse && !isYang) {
    // Nếu can Âm đi thuận giống Dương, thì Ất giống Giáp, Đinh/Kỷ giống Bính/Mậu...
    const mapYang: Record<string, string> = {
      "Ất": "Giáp",
      "Đinh": "Bính",
      "Kỷ": "Mậu",
      "Tân": "Canh",
      "Quý": "Nhâm"
    };
    stem = mapYang[stem] ?? stem;
  }

  // Khởi Trường Sinh (index của BRANCHES: Tý=0, Sửu=1, Dần=2, Mão=3, Thìn=4, Tị=5, Ngọ=6, Mùi=7, Thân=8, Dậu=9, Tuất=10, Hợi=11)
  const startMap: Record<string, number> = {
    // Dương
    "Giáp": 11, // Hợi
    "Bính": 2,  // Dần
    "Mậu": 2,   // Dần
    "Canh": 5,  // Tị
    "Nhâm": 8,  // Thân
    
    // Âm (chỉ dùng khi yinLifeStageReverse = true)
    "Ất": 6,    // Ngọ
    "Đinh": 9,  // Dậu
    "Kỷ": 9,    // Dậu
    "Tân": 0,   // Tý
    "Quý": 3    // Mão
  };

  return startMap[stem] ?? 0;
}

/**
 * Tính Vòng Trường Sinh của một can tại một chi cụ thể.
 * @param stem Can gốc (thường là Nhật Chủ hoặc can của bản thân)
 * @param branch Chi cần xem (ví dụ: chi ngày, chi tháng, hoặc chi đại vận)
 */
export function getLifeStage(stem: string, branch: string, conventions: BaziConventions = DEFAULT_CONVENTIONS): string {
  const startBranchIndex = getLifeStageStartBranchIndex(stem, conventions);
  const targetBranchIndex = BRANCHES.indexOf(branch);
  
  if (targetBranchIndex === -1) return "Unknown";

  const isYang = (STEM_POLARITY[stem] ?? 1) > 0;
  
  // Hướng đi: Dương thuận, Âm nghịch (nếu bật cờ)
  const direction = (!isYang && conventions.yinLifeStageReverse) ? -1 : 1;
  
  // Tính khoảng cách từ startBranchIndex đến targetBranchIndex
  let steps = (targetBranchIndex - startBranchIndex) * direction;
  steps = steps % 12;
  if (steps < 0) steps += 12;
  
  return LIFE_STAGES[steps] ?? "Unknown";
}
