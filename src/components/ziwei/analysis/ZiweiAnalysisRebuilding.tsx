import type { ZiweiAnalysisModule, ZiweiAnalysisStatus } from "@/lib/ziwei/analysis";
import { getAnalysisStatus } from "@/lib/ziwei/analysis";
import "./analysis-rebuilding.css";

const TITLES: Record<ZiweiAnalysisModule, string> = {
  "palace-overview": "Cấu trúc 12 cung",
  "annual-axes": "Sáu trục khí vận năm",
  "major-fortune": "Xu hướng Đại vận",
  "monthly-flow": "Xu hướng Lưu Nguyệt",
};

export interface ZiweiAnalysisRebuildingProps {
  module: ZiweiAnalysisModule;
  title?: string;
  /** Pre-resolved status from the parent (e.g. school-aware annual-axes). */
  status?: ZiweiAnalysisStatus;
}

/**
 * Phase 0 placeholder — never renders numeric scores.
 */
export function ZiweiAnalysisRebuilding({
  module,
  title,
  status: resolvedStatus,
}: ZiweiAnalysisRebuildingProps) {
  const status = resolvedStatus ?? getAnalysisStatus(module);
  const heading = title ?? TITLES[module];

  return (
    <div
      className="ziwei-analysis-rebuilding"
      data-module={module}
      data-status={status.status}
      role="status"
      aria-live="polite"
    >
      <h3 className="ziwei-analysis-rebuilding__title">{heading}</h3>
      <p className="ziwei-analysis-rebuilding__body">
        Module vận khí đang được tái cấu trúc. Lá số và dữ liệu an sao không bị
        ảnh hưởng.
      </p>
    </div>
  );
}
