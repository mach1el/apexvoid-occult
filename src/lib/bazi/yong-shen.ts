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
    dungThan = [generating]; // Ấn
    hyThan = [dm]; // Tỷ Kiếp
    kyThan = [generated, overcoming, overcomeBy]; // Thực/Thương, Tài, Quan/Sát
    reasoning.push(`Dụng Thần (Hành sinh trợ chính): ${generating} (Ấn).`);
    reasoning.push(`Hỷ Thần (Hành tương trợ phụ): ${dm} (Tỷ/Kiếp).`);
    reasoning.push(`Kỵ Thần (Hành làm hao tổn hoặc khắc chế): ${generated} (Thực/Thương), ${overcoming} (Tài), ${overcomeBy} (Quan/Sát).`);
  } else if (verdict === "vượng") {
    reasoning.push("Cục diện Nhật Chủ Vượng, cần tiết chế (Ức) để cân bằng.");
    dungThan = [generated, overcoming]; // Thực/Thương, Tài
    hyThan = [overcomeBy]; // Quan/Sát
    kyThan = [generating, dm]; // Ấn, Tỷ Kiếp
    reasoning.push(`Dụng Thần (Hành làm hao tổn Nhật Chủ): ${generated} (Thực/Thương), ${overcoming} (Tài).`);
    reasoning.push(`Hỷ Thần (Hành chế ngự Nhật Chủ): ${overcomeBy} (Quan/Sát).`);
    reasoning.push(`Kỵ Thần (Hành sinh trợ thêm): ${generating} (Ấn), ${dm} (Tỷ/Kiếp).`);
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
