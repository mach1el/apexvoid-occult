import { BaziFullChart } from "./bazi-engine";
import { BaziConventions, DEFAULT_CONVENTIONS } from "./conventions";
import { Element, ELEMENTS, getElement } from "./elements";

export interface ElementStrengthBreakdownItem {
  source: string; // "Thiên Can Năm", "Bản khí Chi Tháng", v.v.
  element: Element;
  points: number;
  reason: string; // Diễn giải: "1.0 (Bản khí) * 2.0 (Nguyệt Lệnh) * 1.2 (Trụ Tháng)"
}

export interface ElementStrength {
  method: string;
  scores: Record<Element, number>;
  normalized: Record<Element, number>; // Phần trăm
  dayMasterElement: Element;
  dayMasterStrength: { 
    score: number; 
    verdict: "vượng" | "trung hòa" | "nhược"; 
    threshold: number; 
    scorePercentage: number;
  };
  breakdown: ElementStrengthBreakdownItem[];
}

export function calculateElementStrength(
  chart: BaziFullChart,
  conventions: BaziConventions = DEFAULT_CONVENTIONS
): ElementStrength {
  const breakdown: ElementStrengthBreakdownItem[] = [];
  const scores: Record<Element, number> = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const weights = conventions.elementWeights;

  const dayMasterElement = getElement(chart.day.stem);

  // Helper để thêm điểm và ghi log
  const addScore = (
    element: Element,
    baseVal: number,
    baseName: string,
    pillarMultiplier: number,
    monthMultiplier: number,
    sourceName: string
  ) => {
    const total = baseVal * pillarMultiplier * monthMultiplier;
    scores[element] += total;

    const reasonParts = [`${baseVal} (${baseName})`];
    if (monthMultiplier !== 1.0) reasonParts.push(`${monthMultiplier} (Nguyệt Lệnh)`);
    if (pillarMultiplier !== 1.0) reasonParts.push(`${pillarMultiplier} (Trụ)`);

    breakdown.push({
      source: sourceName,
      element,
      points: parseFloat(total.toFixed(2)),
      reason: reasonParts.join(" * ") + ` = ${total.toFixed(2)}`
    });
  };

  const pillars = [
    { key: "year", name: "Năm", detail: chart.details.year, mult: weights.pillarMultipliers.year, isMonth: false },
    { key: "month", name: "Tháng", detail: chart.details.month, mult: weights.pillarMultipliers.month, isMonth: true },
    { key: "day", name: "Ngày", detail: chart.details.day, mult: weights.pillarMultipliers.day, isMonth: false },
    { key: "hour", name: "Giờ", detail: chart.details.hour, mult: weights.pillarMultipliers.hour, isMonth: false }
  ];

  for (const p of pillars) {
    const monthMult = p.isMonth ? weights.monthBranchMultiplier : 1.0;

    // Thiên can
    addScore(
      getElement(p.detail.pillar.stem),
      weights.heavenlyStem,
      "Thiên Can",
      p.mult,
      1.0, // Nguyệt lệnh thường chỉ áp dụng cho Chi (hoặc theo cấu hình, hiện tại để 1.0 cho Can)
      `Can ${p.name}`
    );

    // Địa chi (Tàng can)
    for (const hidden of p.detail.hiddenStems) {
      let roleWeight = 0;
      if (hidden.type === "Bản khí") roleWeight = weights.hiddenStems["Bản khí"];
      else if (hidden.type === "Trung khí") roleWeight = weights.hiddenStems["Trung khí"];
      else if (hidden.type === "Dư khí") roleWeight = weights.hiddenStems["Dư khí"];

      addScore(
        getElement(hidden.stem),
        roleWeight,
        hidden.type,
        p.mult,
        monthMult,
        `Tàng Can ${p.name} (${hidden.stem})`
      );
    }
  }

  // Chuẩn hoá % (Normalized)
  let totalScore = 0;
  for (const el of ELEMENTS) {
    totalScore += scores[el];
  }

  const normalized: Record<Element, number> = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  for (const el of ELEMENTS) {
    normalized[el] = totalScore > 0 ? (scores[el] / totalScore) * 100 : 0;
    // Làm tròn
    scores[el] = parseFloat(scores[el].toFixed(2));
    normalized[el] = parseFloat(normalized[el].toFixed(1));
  }

  // Tính độ Vượng/Nhược của Nhật Chủ
  // Theo pháp Phù Ức: Sức mạnh NC = Điểm cùng hành (Tỷ Kiếp) + Điểm hành sinh ra (Ấn)
  let dmScore = 0;
  for (const el of ELEMENTS) {
    // Nếu cùng hành (Tỷ/Kiếp) hoặc hành sinh ra NC (Ấn)
    // Ví dụ: NC là Mộc -> Ấn là Thủy
    if (el === dayMasterElement) {
      dmScore += scores[el];
    } else {
      // Kiểm tra hành này có sinh ra NC không
      // Theo elements.ts: getGeneratingElement("Thủy") -> "Mộc"
      let isGenerating = false;
      if (el === "Thủy" && dayMasterElement === "Mộc") isGenerating = true;
      if (el === "Mộc" && dayMasterElement === "Hỏa") isGenerating = true;
      if (el === "Hỏa" && dayMasterElement === "Thổ") isGenerating = true;
      if (el === "Thổ" && dayMasterElement === "Kim") isGenerating = true;
      if (el === "Kim" && dayMasterElement === "Thủy") isGenerating = true;

      if (isGenerating) {
        dmScore += scores[el];
      }
    }
  }

  const dmPercentage = totalScore > 0 ? (dmScore / totalScore) * 100 : 0;
  let verdict: "vượng" | "trung hòa" | "nhược" = "trung hòa";
  
  if (dmPercentage < 40) {
    verdict = "nhược";
  } else if (dmPercentage > 60) {
    verdict = "vượng";
  }

  return {
    method: "weighted-hidden-stems-v1",
    scores,
    normalized,
    dayMasterElement,
    dayMasterStrength: {
      score: parseFloat(dmScore.toFixed(2)),
      scorePercentage: parseFloat(dmPercentage.toFixed(1)),
      verdict,
      threshold: 50 // Threshold tham chiếu
    },
    breakdown
  };
}
