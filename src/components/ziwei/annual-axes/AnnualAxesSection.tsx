import { useEffect, useMemo, useState } from "react";
import type { ChartData, School } from "@/types/chart";
import type { AnnualAxisDomain } from "@/lib/ziwei/analysis";
import {
  analyzeAnnualAxes,
  type AnnualAxesResult,
  type AnnualAxisResult,
} from "@/lib/ziwei/analysis/modules/annual-axes";
import { AnnualAxesRadar } from "./AnnualAxesRadar";
import { AnnualAxisDetail } from "./AnnualAxisDetail";
import {
  ANNUAL_AXIS_DOMAIN_ORDER,
  ANNUAL_AXIS_BAND_LABEL_VI,
  ANNUAL_AXIS_LABEL_VI,
} from "./labels";
import "./annual-axes.css";

export interface AnnualAxesSectionProps {
  chart: ChartData;
  school: School;
  result?: AnnualAxesResult;
}

function hasAxisScore(
  axis: AnnualAxisResult,
): axis is Extract<AnnualAxisResult, { status: "available" | "partial-data" }> {
  return axis.status === "available" || axis.status === "partial-data";
}

function scoreStateDescription(
  axis: Extract<AnnualAxisResult, { status: "available" | "partial-data" }>,
): string | null {
  if (axis.status === "partial-data") return "Thiếu một phần dữ liệu";
  if (axis.engine !== "v0.8") return null;
  const trace = axis.scoreTrace;
  if (trace.formulaVersion !== "v0.8-annual-palace-weighted-score") return null;
  switch (trace.scoreState) {
    case "no-signal":
      return "Chưa có tín hiệu";
    case "balanced-signal":
      return "Cân bằng tín hiệu";
    case "partial-data":
      return "Thiếu một phần dữ liệu";
    case "unavailable":
      return "Không đủ dữ liệu";
    case "scored":
      return null;
  }
}

export function AnnualAxesSection({ chart, school, result }: AnnualAxesSectionProps) {
  const computed = useMemo(() => {
    if (result) return result;
    return analyzeAnnualAxes(chart, { school });
  }, [chart, school, result]);

  const [selectedDomain, setSelectedDomain] = useState<AnnualAxisDomain | null>(null);
  const [hoveredDomain, setHoveredDomain] = useState<AnnualAxisDomain | null>(null);

  useEffect(() => {
    setSelectedDomain(null);
    setHoveredDomain(null);
  }, [chart, school]);

  const activeDomain: AnnualAxisDomain | null = (() => {
    const candidate = selectedDomain ?? hoveredDomain;
    return candidate && ANNUAL_AXIS_DOMAIN_ORDER.includes(candidate) ? candidate : null;
  })();
  const activeAxis = activeDomain ? computed.axes[activeDomain] : null;

  function toggleDomain(domain: string) {
    setSelectedDomain((cur) => (cur === domain ? null : (domain as AnnualAxisDomain)));
  }

  const v08Axis =
    activeAxis &&
    hasAxisScore(activeAxis) &&
    activeAxis.engine === "v0.8"
      ? activeAxis
      : null;
  const v08Trace = v08Axis?.scoreTrace ?? null;

  return (
    <section className="annual-axes-section" data-module="annual-axes" aria-label="Sáu trục khí vận năm">
      <header className="annual-axes-section__head">
        <h3 className="annual-axes-section__title">Sáu trục khí vận năm</h3>
        <span className="annual-axes-section__year">Năm {computed.annualYear}</span>
      </header>

      <div className="annual-axes-section__body">
        <AnnualAxesRadar
          result={computed}
          selectedDomain={selectedDomain}
          activeDomain={activeDomain}
          onSelect={toggleDomain}
          onHover={(domain) => setHoveredDomain(domain as AnnualAxisDomain | null)}
        />

        {activeDomain && activeAxis && hasAxisScore(activeAxis) ? (
          <div className="annual-axes-section__tooltip" role="status">
            <strong className="annual-axes-section__tooltip-title">
              {ANNUAL_AXIS_LABEL_VI[activeDomain]}
            </strong>
            <p className="annual-axes-section__tooltip-summary">
              Điểm {activeAxis.score.toFixed(1)}
              {v08Axis ? (
                <>
                  {scoreStateDescription(v08Axis) ? (
                    <>
                      <br />
                      {scoreStateDescription(v08Axis)}
                    </>
                  ) : (
                    <>
                      <br />
                      {ANNUAL_AXIS_BAND_LABEL_VI[v08Axis.band]}
                    </>
                  )}
                  <br />
                  Cung trọng tâm: {v08Axis.scoreTrace.primary.palaceName}
                  <br />
                  Cung phối hợp:{" "}
                  {v08Axis.scoreTrace.cooperating.map((c) => c.palaceName).join(", ") || "—"}
                  <br />
                  Lưu Thái Tuế: {v08Axis.scoreTrace.isThaiTueHighlighted ? "Có" : "Không"}
                  {v08Axis.coverage ? (
                    <>
                      <br />
                      Độ phủ: {(v08Axis.coverage.resolvedWeight * 100).toFixed(0)}% /{" "}
                      {(v08Axis.coverage.totalWeight * 100).toFixed(0)}%
                    </>
                  ) : null}
                </>
              ) : activeAxis.engine === "v0.2" ? (
                <>
                  {" "}
                  · {ANNUAL_AXIS_BAND_LABEL_VI[activeAxis.band]}
                  <br />
                  Cường độ {activeAxis.intensity} · Xung đột {activeAxis.conflict}
                </>
              ) : null}
            </p>
          </div>
        ) : activeDomain && activeAxis && activeAxis.status === "unavailable" ? (
          <div className="annual-axes-section__tooltip" role="status">
            <strong className="annual-axes-section__tooltip-title">
              {ANNUAL_AXIS_LABEL_VI[activeDomain]}
            </strong>
            <p className="annual-axes-section__tooltip-summary">
              Không đủ dữ liệu
              {(activeAxis.reasonCodes ?? []).length > 0 ? (
                <>
                  <br />
                  {(activeAxis.reasonCodes ?? []).join(", ")}
                </>
              ) : null}
              {activeAxis.engine === "v0.8" && activeAxis.coverage?.missingPalaces?.length ? (
                <>
                  <br />
                  Thiếu: {activeAxis.coverage.missingPalaces.join(", ")}
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <p className="annual-axes-section__tooltip">
            Di chuột hoặc chọn một trục để xem chi tiết (dùng Tab + Enter trên
            bàn phím).
          </p>
        )}
      </div>

      {selectedDomain && computed.axes[selectedDomain] ? (
        <AnnualAxisDetail
          domain={selectedDomain}
          axis={computed.axes[selectedDomain]}
          onClose={() => setSelectedDomain(null)}
        />
      ) : null}
    </section>
  );
}
