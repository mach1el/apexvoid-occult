import { useEffect, useMemo, useState } from "react";
import type { ChartData, School } from "@/types/chart";
import type { AnnualAxisDomain } from "@/lib/ziwei/analysis";
import {
  analyzeAnnualAxes,
  type AnnualAxesResult,
} from "@/lib/ziwei/analysis/modules/annual-axes";
import { AnnualAxesRadar } from "./AnnualAxesRadar";
import { AnnualAxisCards } from "./AnnualAxisCards";
import { AnnualAxisDetail } from "./AnnualAxisDetail";
import {
  ANNUAL_AXIS_DOMAIN_ORDER,
  ANNUAL_FOCUS_MODE_LABEL_VI,
} from "./labels";
import "./annual-axes.css";

export interface AnnualAxesSectionProps {
  chart: ChartData;
  school: School;
  /** Precomputed analyzer result — passed in from the parent so the
   * potentially expensive `analyzeAnnualAxes` call can be memoized at
   * the ChartPage level (see mission spec). When omitted, this component
   * computes it locally as a fallback. */
  result?: AnnualAxesResult;
}

/**
 * Public Annual Axes V0.2 section. Shows the year header, focus summary,
 * six-axis radar, per-domain cards, and a deterministic detail block for
 * the selected domain. Emits no prediction prose — everything is derived
 * from the analyzer's numeric/evidence output.
 */
export function AnnualAxesSection({ chart, school, result }: AnnualAxesSectionProps) {
  const computed = useMemo(() => {
    if (result) return result;
    return analyzeAnnualAxes(chart, { school });
  }, [chart, school, result]);

  const [selectedDomain, setSelectedDomain] = useState<AnnualAxisDomain | null>(null);

  // Reset selection when the chart/school changes so a stale domain
  // detail from a different chart cannot linger on-screen.
  useEffect(() => {
    setSelectedDomain(null);
  }, [chart, school]);

  const activeDomain: AnnualAxisDomain | null =
    selectedDomain && ANNUAL_AXIS_DOMAIN_ORDER.includes(selectedDomain) ? selectedDomain : null;
  const activeAxis = activeDomain ? computed.axes[activeDomain] : null;

  const focus = computed.annualFocus;
  const capabilities = computed.capabilities;

  return (
    <section className="annual-axes-section" data-module="annual-axes" aria-label="Sáu trục khí vận năm">
      <header className="annual-axes-section__head">
        <h3 className="annual-axes-section__title">Sáu trục khí vận năm</h3>
        <span className="annual-axes-section__badge">Experimental</span>
        <span className="annual-axes-section__year">Năm {computed.annualYear}</span>
      </header>

      <p className="annual-axes-section__disclaimer">
        Điểm phản ánh mô hình phân tích cấu trúc lá số theo năm xem, không phải
        kết luận định mệnh. Trục "Tình duyên", "Giao hữu"… là các chiều đo
        định lượng của lá số, không dự đoán sự kiện.
      </p>

      {focus ? (
        <p className="annual-axes-section__focus">
          <span className="annual-axes-section__focus-label">Trọng tâm năm: </span>
          {ANNUAL_FOCUS_MODE_LABEL_VI[focus.mode]} · {focus.palaceName} ·{" "}
          {focus.palaceBranch}
          {focus.annualPalaceName ? ` (${focus.annualPalaceName})` : ""}
          {focus.frameBranches.length > 0 ? (
            <> · Khung {focus.frameBranches.join(" / ")}</>
          ) : null}
        </p>
      ) : (
        <p className="annual-axes-section__focus" data-focus="unavailable">
          <span className="annual-axes-section__focus-label">Trọng tâm năm: </span>
          Chưa đủ dữ liệu để xác định (
          {capabilities.primaryAnnualFocus === "small-limit" ? "Tiểu Hạn" : "Cung Mệnh lưu niên"}
          ).
        </p>
      )}

      <div className="annual-axes-section__body">
        <AnnualAxesRadar
          result={computed}
          selectedDomain={activeDomain}
          onSelect={(d) => setSelectedDomain((cur) => (cur === d ? null : (d as AnnualAxisDomain)))}
        />

        <div>
          <AnnualAxisCards
            result={computed}
            selectedDomain={activeDomain}
            onSelect={(d) => setSelectedDomain((cur) => (cur === d ? null : (d as AnnualAxisDomain)))}
          />
        </div>
      </div>

      {activeDomain && activeAxis ? (
        <AnnualAxisDetail
          domain={activeDomain}
          axis={activeAxis}
          onClose={() => setSelectedDomain(null)}
        />
      ) : null}
    </section>
  );
}
