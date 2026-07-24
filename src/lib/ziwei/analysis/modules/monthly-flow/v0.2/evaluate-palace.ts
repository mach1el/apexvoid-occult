import type { ChartPalace as Palace } from "@/types/chart";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface EvaluatedPalace {
  mainStarQualityDelta: number;
  majorSupportDelta: number;
  secondarySupportDelta: number;
  majorPressureDelta: number;
  voidMarkerDelta: number;
  elementRelationDelta: number;
  palaceRawDelta: number;
  
  diagnostics: {
    mainStarQualityStatus: "resolved" | "partial";
    elementRelationStatus: "resolved" | "partial";
    partialReasons: string[];
  };
}

export function evaluatePalace(
  palace: Palace, 
  chartElement: string | null | undefined
): EvaluatedPalace {
  const diagnostics: EvaluatedPalace["diagnostics"] = {
    mainStarQualityStatus: "resolved",
    elementRelationStatus: "resolved",
    partialReasons: []
  };

  const stars = palace.stars ?? [];

  // 1. Main Star Quality
  // Some charts use `layer: "Chính Tinh"`, some might use `type` depending on the adapter.
  // In `ChartStar`, layer usually denotes "Chính Tinh", "Phụ Tinh".
  const mainStars = stars.filter((s: any) => s.type === "Chính Tinh" || s.layer === "Chính Tinh");
  let mainStarQualityDelta = 0;

  if (mainStars.length === 0) {
    // VCD
    mainStarQualityDelta = -5;
    diagnostics.mainStarQualityStatus = "partial";
    diagnostics.partialReasons.push("tam-khong-policy-unresolved");
  } else {
    let sumDelta = 0;
    for (const star of mainStars) {
      if (["Miếu", "Vượng", "Đắc"].includes(star.brightness ?? "")) {
        sumDelta += 10;
      } else if (star.brightness === "Hãm") {
        sumDelta -= 10;
      }
    }
    mainStarQualityDelta = clamp(sumDelta, -10, 10);
  }

  // 2. Buckets
  const hasMajorSupport = stars.some((s: any) => 
    ["Thiên Khôi", "Thiên Việt", "Tả Phụ", "Hữu Bật", "Lộc Tồn", "Đào Hoa", "Hồng Loan"].includes(s.name)
  );
  const majorSupportDelta = hasMajorSupport ? 15 : 0;

  const hasSecondarySupport = stars.some((s: any) => 
    ["Ân Quang", "Thiên Quý", "Giải Thần", "Lưu Hóa Khoa", "Hóa Khoa"].includes(s.name)
  );
  const secondarySupportDelta = hasSecondarySupport ? 10 : 0;

  const hasMajorPressure = stars.some((s: any) => 
    ["Địa Không", "Địa Kiếp", "Kình Dương", "Đà La", "Thiên Hình", "Bạch Hổ", "Tang Môn", "Điếu Khách"].includes(s.name)
  );
  const majorPressureDelta = hasMajorPressure ? -15 : 0;

  // 3. Void Markers (Tuần/Triệt)
  const hasVoid = stars.some((s: any) => ["Tuần", "Triệt", "Tuần Không", "Triệt Lộ"].includes(s.name));
  const voidMarkerDelta = hasVoid ? -10 : 0;

  // 4. Element Relation
  let elementRelationDelta = 0;
  
  // Element mappings
  const sinhKhac: Record<string, Record<string, number>> = {
    "Kim": { "Thủy": 5, "Kim": 5, "Mộc": -5, "Hỏa": -5, "Thổ": 0 },
    "Mộc": { "Hỏa": 5, "Mộc": 5, "Thổ": -5, "Kim": -5, "Thủy": 0 },
    "Thủy": { "Mộc": 5, "Thủy": 5, "Hỏa": -5, "Thổ": -5, "Kim": 0 },
    "Hỏa": { "Thổ": 5, "Hỏa": 5, "Kim": -5, "Thủy": -5, "Mộc": 0 },
    "Thổ": { "Kim": 5, "Thổ": 5, "Thủy": -5, "Mộc": -5, "Hỏa": 0 },
  };

  const palaceElement = (palace as any).element;

  if (!chartElement || !palaceElement) {
    diagnostics.elementRelationStatus = "partial";
    diagnostics.partialReasons.push("element-relation-data-unavailable");
  } else {
    // Hành Cung (palace.element) sinh/khắc Bản Mệnh (chartElement)
    const map = sinhKhac[palaceElement];
    if (map && map[chartElement] !== undefined) {
      elementRelationDelta = map[chartElement]!;
    } else {
      diagnostics.elementRelationStatus = "partial";
      diagnostics.partialReasons.push("element-relation-invalid");
    }
  }

  const palaceRawDelta = 
    mainStarQualityDelta +
    majorSupportDelta +
    secondarySupportDelta +
    majorPressureDelta +
    voidMarkerDelta +
    elementRelationDelta;

  return {
    mainStarQualityDelta,
    majorSupportDelta,
    secondarySupportDelta,
    majorPressureDelta,
    voidMarkerDelta,
    elementRelationDelta,
    palaceRawDelta,
    diagnostics
  };
}
