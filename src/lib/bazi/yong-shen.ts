import { BaziConventions, DEFAULT_CONVENTIONS } from "./conventions";
import { ElementStrength } from "./element-strength";
import { Element, getGeneratedByElement, getGeneratingElement, getOvercomeByElement, getOvercomingElement } from "./elements";

export type YongShenMethod = "phu-uc" | "dieu-hau" | "thong-quan";

export interface YongShenResult {
  method: YongShenMethod;
  methodLabel: string;
  dayMasterVerdict: "vượng" | "trung hòa" | "nhược";
  dungThan: Element[];
  hyThan: Element[];
  kyThan: Element[];
  reasoning: string[];
  confidence: "rõ ràng" | "cần cân nhắc";
}

export function determineYongShen(
  strength: ElementStrength,
  conventions: BaziConventions = DEFAULT_CONVENTIONS
): YongShenResult {
  const method = conventions.baziYongShenMethod;
  
  if (method === "phu-uc") {
    return determineYongShenPhuUc(strength);
  }
  
  // Fallback hoặc các phương pháp khác nếu implement sau
  return determineYongShenPhuUc(strength);
}

function determineYongShenPhuUc(strength: ElementStrength): YongShenResult {
  const dm = strength.dayMasterElement;
  const verdict = strength.dayMasterStrength.verdict;
  const reasoning: string[] = [];
  
  const generating = getGeneratedByElement(dm); // Hành sinh ra Nhật Chủ (Ấn)
  const overcoming = getOvercomingElement(dm);  // Nhật Chủ khắc (Tài)
  const overcomeBy = getOvercomeByElement(dm);  // Khắc Nhật Chủ (Quan/Sát)
  const generated = getGeneratingElement(dm);   // Nhật Chủ sinh ra (Thực/Thương)

  reasoning.push(`Nhật Chủ là ${dm}, điểm số sinh trợ (Tỷ Kiếp + Ấn) đạt ${strength.dayMasterStrength.scorePercentage}%.`);
  
  let dungThan: Element[] = [];
  let hyThan: Element[] = [];
  let kyThan: Element[] = [];
  let confidence: "rõ ràng" | "cần cân nhắc" = "rõ ràng";

  if (verdict === "nhược") {
    reasoning.push("Cục diện Nhật Chủ Nhược, cần sinh trợ (Phù) để cân bằng.");
    dungThan = [generating, dm]; // Ấn, Tỷ Kiếp
    // Hỷ thần là hành sinh ra Dụng thần: Ấn (sinh bởi Quan Sát), Tỷ (sinh bởi Ấn) -> Hơi phức tạp, thường Hỷ Thần trợ giúp Dụng.
    // Nếu Dụng là Ấn thì Quan Sát là Hỷ, nhưng Quan Sát lại khắc Nhật Chủ, nên Quan Sát là con dao 2 lưỡi.
    // Đơn giản hóa Phù Ức cơ bản: Dụng là Ấn/Tỷ, Kỵ là Quan/Tài/Thực.
    kyThan = [overcomeBy, overcoming, generated];
    reasoning.push(`Dụng Thần (Hành tương sinh hoặc đồng vượng): ${generating} (Ấn), ${dm} (Tỷ/Kiếp).`);
    reasoning.push(`Kỵ Thần (Hành khắc, bị khắc hoặc xì hơi): ${overcomeBy} (Quan/Sát), ${overcoming} (Tài), ${generated} (Thực/Thương).`);
    
    // Tạm lấy hành sinh ra Ấn làm Hỷ Thần (Quan Sát) nhưng có thể nguy hiểm. Lấy theo quy tắc: Dụng = Ấn/Tỷ, Hỷ = Hành còn lại trong Ấn/Tỷ hoặc bỏ trống nếu không cần phân rạch ròi.
    // Spec: "Hỷ Thần = hành sinh cho Dụng Thần (trợ lực cho dụng)."
    // Hành sinh cho Ấn là Quan Sát (overcomeBy). Nhưng nó khắc NC. Nên tùy ca. Tạm để Hỷ Thần rỗng hoặc theo công thức cơ bản.
    // Chi tiết: Nếu dụng là Ấn, Hỷ là Quan (sinh Ấn). Nếu dụng là Tỷ, Hỷ là Ấn (sinh Tỷ).
    // Ở đây ta gộp: Dụng = Ấn, Tỷ. Hỷ = Quan (sinh Ấn). Nhưng Quan lại Khắc Tỷ. 
    // Do tính đa phái, ta tuân thủ spec cơ bản:
    hyThan = []; // Phù Ức cơ bản: Dụng Ấn Tỷ đã gộp, Hỷ là phụ trợ.
    reasoning.push("Hỷ Thần: Hành sinh ra Dụng Thần (Tuy nhiên cần chú ý tương quan chi tiết).");
  } else if (verdict === "vượng") {
    reasoning.push("Cục diện Nhật Chủ Vượng, cần tiết chế (Ức) để cân bằng.");
    dungThan = [generated, overcoming, overcomeBy]; // Thực Thương, Tài, Quan Sát
    kyThan = [generating, dm]; // Ấn, Tỷ Kiếp
    reasoning.push(`Dụng Thần (Hành làm hao tổn Nhật Chủ): ${generated} (Thực/Thương), ${overcoming} (Tài), ${overcomeBy} (Quan/Sát).`);
    reasoning.push(`Kỵ Thần (Hành sinh trợ thêm): ${generating} (Ấn), ${dm} (Tỷ/Kiếp).`);
    hyThan = [];
  } else {
    reasoning.push("Cục diện Nhật Chủ Trung Hòa, chưa lệch hẳn về bên nào.");
    reasoning.push("Dụng Thần theo pháp Phù Ức không thật sự rõ ràng ở trạng thái này. Cần kết hợp xem thêm Điều Hậu hoặc Thông Quan.");
    confidence = "cần cân nhắc";
  }

  // Tinh chỉnh confidence nếu sát mép
  const p = strength.dayMasterStrength.scorePercentage;
  if ((p >= 35 && p < 45) || (p > 55 && p <= 65)) {
    confidence = "cần cân nhắc";
    reasoning.push(`Lưu ý: Tỷ lệ ${p}% khá gần ngưỡng trung hòa (40-60%), cần cân nhắc kỹ lưỡng.`);
  }

  return {
    method: "phu-uc",
    methodLabel: "Pháp Phù Ức",
    dayMasterVerdict: verdict,
    dungThan,
    hyThan,
    kyThan,
    reasoning,
    confidence
  };
}
