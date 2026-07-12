import { STEM_ELEMENTS, STEM_POLARITY } from "../calendar/sexagenary";

/**
 * Tính mối quan hệ sinh khắc của Ngũ Hành
 * Trả về:
 * - "same": Cùng hành
 * - "produce": Hành 1 sinh Hành 2
 * - "producedBy": Hành 2 sinh Hành 1
 * - "control": Hành 1 khắc Hành 2
 * - "controlledBy": Hành 2 khắc Hành 1
 */
export function getElementRelation(element1: string, element2: string): string {
  if (element1 === element2) return "same";
  
  const produceMap: Record<string, string> = {
    "Mộc": "Hoả", "Hoả": "Thổ", "Thổ": "Kim", "Kim": "Thuỷ", "Thuỷ": "Mộc"
  };
  const controlMap: Record<string, string> = {
    "Mộc": "Thổ", "Thổ": "Thuỷ", "Thuỷ": "Hoả", "Hoả": "Kim", "Kim": "Mộc"
  };

  if (produceMap[element1] === element2) return "produce";
  if (produceMap[element2] === element1) return "producedBy";
  if (controlMap[element1] === element2) return "control";
  if (controlMap[element2] === element1) return "controlledBy";

  return "unknown";
}

/**
 * Tính Thập Thần của một can (targetStem) dựa trên Nhật Chủ (dayMasterStem).
 */
export function getTenGod(dayMasterStem: string, targetStem: string): string {
  const dmElement = STEM_ELEMENTS[dayMasterStem] ?? "";
  const targetElement = STEM_ELEMENTS[targetStem] ?? "";
  
  const dmPolarity = STEM_POLARITY[dayMasterStem] ?? 1;
  const targetPolarity = STEM_POLARITY[targetStem] ?? 1;
  
  const relation = getElementRelation(dmElement, targetElement);
  const samePolarity = dmPolarity === targetPolarity;

  switch (relation) {
    case "same":
      return samePolarity ? "Tỷ Kiên" : "Kiếp Tài";
    case "produce":
      return samePolarity ? "Thực Thần" : "Thương Quan";
    case "control":
      return samePolarity ? "Thiên Tài" : "Chính Tài";
    case "controlledBy":
      return samePolarity ? "Thất Sát" : "Chính Quan";
    case "producedBy":
      return samePolarity ? "Thiên Ấn" : "Chính Ấn";
    default:
      return "Unknown";
  }
}
