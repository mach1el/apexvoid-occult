import type { AnnualAxisDomain } from "@/lib/ziwei/analysis";
import type {
  MonthlyFlowBand,
  MonthlyFlowEvidence,
} from "@/lib/ziwei/analysis/modules/monthly-flow/types";

/** Domain order — matches annual axes contract order. */
export const DOMAIN_ORDER: readonly AnnualAxisDomain[] = [
  "health",
  "family",
  "wealth",
  "career",
  "social",
  "romance",
] as const;

export const DOMAIN_LABEL_VI: Record<AnnualAxisDomain, string> = {
  health: "Sức khỏe",
  family: "Gia đạo",
  wealth: "Tài lộc",
  career: "Công việc",
  social: "Giao hữu",
  romance: "Tình duyên",
};

export const BAND_LABEL_VI: Record<MonthlyFlowBand, string> = {
  guarded: "Cần thận trọng",
  balanced: "Cân bằng",
  supportive: "Thuận lợi",
  strong: "Rất thuận",
};

const STRUCTURAL_MARKER_LABEL_VI: Record<string, string> = {
  "monthly-focus-palace": "Cung trọng tâm tháng",
  "monthly-opposite-palace": "Đối cung tháng",
  "monthly-trine-palace": "Tam hợp tháng",
};

export function formatMonthShortLabel(lunarMonth: number, isLeapMonth: boolean): string {
  return isLeapMonth ? `Th.${lunarMonth} nhuận` : `Th.${lunarMonth}`;
}

export function formatMonthViewLabel(lunarMonth: number, isLeapMonth: boolean): string {
  return isLeapMonth
    ? `Tháng ${lunarMonth} nhuận âm lịch`
    : `Tháng ${lunarMonth} âm lịch`;
}

/** Display-only evidence label — star/name only, no rule or source IDs. */
export function evidenceDisplayLabel(evidence: MonthlyFlowEvidence): string {
  const { physicalFactId, targetNatalPalaceName } = evidence;

  if (physicalFactId.startsWith("star:")) {
    const starName = physicalFactId.split(":").slice(2).join(":");
    return `${starName} · ${targetNatalPalaceName}`;
  }

  if (physicalFactId.startsWith("monthly-transformation:")) {
    const parts = physicalFactId.split(":");
    const mutagen = parts[2] ?? "";
    const starName = parts.slice(3).join(":");
    return `Tứ Hóa ${mutagen} → ${starName} · ${targetNatalPalaceName}`;
  }

  if (physicalFactId.startsWith("major-transformation-context:")) {
    const parts = physicalFactId.split(":");
    const mutagen = parts[2] ?? "";
    const starName = parts.slice(3).join(":");
    return `Tứ Hóa Đại vận ${mutagen} → ${starName} · ${targetNatalPalaceName}`;
  }

  if (physicalFactId.startsWith("major-active-palace:")) {
    return `Cung Đại vận hoạt động · ${targetNatalPalaceName}`;
  }

  if (physicalFactId.startsWith("annual-star:")) {
    const starName = physicalFactId.split(":").slice(2).join(":");
    return `${starName} · ${targetNatalPalaceName}`;
  }

  if (physicalFactId.startsWith("annual-transformation-context:")) {
    const parts = physicalFactId.split(":");
    const mutagen = parts[2] ?? "";
    const starName = parts.slice(3).join(":");
    return `Tứ Hóa lưu niên ${mutagen} → ${starName} · ${targetNatalPalaceName}`;
  }

  if (physicalFactId.startsWith("structural:")) {
    const markerId = physicalFactId.split(":")[1] ?? "";
    const markerLabel = STRUCTURAL_MARKER_LABEL_VI[markerId] ?? "Kích hoạt cấu trúc";
    return `${markerLabel} · ${targetNatalPalaceName}`;
  }

  return targetNatalPalaceName;
}
