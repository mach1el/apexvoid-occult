export type Element = "Mộc" | "Hỏa" | "Thổ" | "Kim" | "Thủy";

export const ELEMENTS: Element[] = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"];

export function getElement(char: string): Element {
  const wood = ["Giáp", "Ất", "Dần", "Mão"];
  const fire = ["Bính", "Đinh", "Tị", "Ngọ"];
  const earth = ["Mậu", "Kỷ", "Thìn", "Tuất", "Sửu", "Mùi"];
  const metal = ["Canh", "Tân", "Thân", "Dậu"];
  const water = ["Nhâm", "Quý", "Hợi", "Tý"];

  if (wood.includes(char)) return "Mộc";
  if (fire.includes(char)) return "Hỏa";
  if (earth.includes(char)) return "Thổ";
  if (metal.includes(char)) return "Kim";
  if (water.includes(char)) return "Thủy";
  
  // Trả về mặc định, không bao giờ chạy đến đây nếu input là can/chi hợp lệ
  return "Thổ";
}

/**
 * Lấy hành tương sinh (Ngũ hành sinh).
 * Mộc -> Hỏa -> Thổ -> Kim -> Thủy -> Mộc
 */
export function getGeneratingElement(element: Element): Element {
  switch (element) {
    case "Mộc": return "Hỏa";
    case "Hỏa": return "Thổ";
    case "Thổ": return "Kim";
    case "Kim": return "Thủy";
    case "Thủy": return "Mộc";
  }
}

/**
 * Lấy hành được tương sinh (Ngũ hành được sinh).
 * Hỏa được Mộc sinh, ...
 */
export function getGeneratedByElement(element: Element): Element {
  switch (element) {
    case "Mộc": return "Thủy";
    case "Hỏa": return "Mộc";
    case "Thổ": return "Hỏa";
    case "Kim": return "Thổ";
    case "Thủy": return "Kim";
  }
}

/**
 * Lấy hành bị khắc (Ngũ hành khắc).
 * Mộc -> Thổ -> Thủy -> Hỏa -> Kim -> Mộc
 */
export function getOvercomingElement(element: Element): Element {
  switch (element) {
    case "Mộc": return "Thổ";
    case "Hỏa": return "Kim";
    case "Thổ": return "Thủy";
    case "Kim": return "Mộc";
    case "Thủy": return "Hỏa";
  }
}

/**
 * Lấy hành đi khắc (Ngũ hành bị khắc).
 * Mộc bị Kim khắc, ...
 */
export function getOvercomeByElement(element: Element): Element {
  switch (element) {
    case "Mộc": return "Kim";
    case "Hỏa": return "Thủy";
    case "Thổ": return "Mộc";
    case "Kim": return "Hỏa";
    case "Thủy": return "Thổ";
  }
}
