import { useEffect, useMemo, useState } from "react";
import type { ChartData, School } from "@/types/chart";
import {
  analyzeMajorFortuneOrdinalV03,
  type MajorFortuneOrdinalV03Analysis,
  type MajorFortuneProductionResult,
} from "@/lib/ziwei/analysis/modules/major-fortune/v0.3-ordinal-adapter";
import { analyzeMajorFortuneTimelineV03 } from "@/lib/ziwei/analysis/modules/major-fortune/v0.3-ordinal-timeline";
import { MajorFortuneTimelineChart } from "./MajorFortuneTimelineChart";
import "./major-fortune-v03.css";

export type { MajorFortuneProductionResult };

export interface MajorFortuneSectionProps {
  chart: ChartData;
  school: School;
  /** Optional precomputed single-cycle analysis for tests. */
  analysis?: MajorFortuneOrdinalV03Analysis;
}

function moduleStateLabelVi(analysis: MajorFortuneOrdinalV03Analysis): string {
  if (analysis.adapterStatus === "unavailable" || !analysis.result) return "Không khả dụng";
  if (analysis.result.status === "partial" || analysis.adapterStatus === "partial") {
    return "Thiếu dữ liệu";
  }
  return "Đã đánh giá";
}

/**
 * Production Major Fortune V0.3 section with lifetime timeline.
 * Layout: header → chart → compact selection summary → pillars.
 */
export function MajorFortuneSection({
  chart,
  school,
  analysis: analysisProp,
}: MajorFortuneSectionProps) {
  const timeline = useMemo(
    () => analyzeMajorFortuneTimelineV03(chart, { school }),
    [chart, school],
  );

  const defaultCycleIndex =
    timeline.currentCycleIndex ?? timeline.points[0]?.cycleIndex ?? null;

  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number | null>(
    defaultCycleIndex,
  );

  useEffect(() => {
    setSelectedCycleIndex(defaultCycleIndex);
  }, [defaultCycleIndex, chart, school]);

  const selectedPoint =
    timeline.points.find((p) => p.cycleIndex === selectedCycleIndex) ??
    timeline.points.find((p) => p.isCurrentCycle) ??
    timeline.points[0] ??
    null;

  const analysis = useMemo(() => {
    if (analysisProp && selectedPoint?.isCurrentCycle) return analysisProp;
    if (selectedPoint?.analysis) return selectedPoint.analysis;
    return analyzeMajorFortuneOrdinalV03(chart, { school });
  }, [analysisProp, chart, school, selectedPoint]);

  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const scoreText =
    analysis.result?.score == null ? "—" : analysis.result.score.toFixed(1);
  const bandText = analysis.display.bandLabelVi ?? "—";
  const coverage =
    analysis.display.scoringCoveragePercent == null
      ? "—"
      : `${analysis.display.scoringCoveragePercent}%`;
  const cycle = analysis.cycle;
  const viewingOther =
    selectedCycleIndex != null &&
    timeline.currentCycleIndex != null &&
    selectedCycleIndex !== timeline.currentCycleIndex;
  const schoolLabel = school === "nam-phai" ? "Nam Phái" : "Trung Châu";

  return (
    <section
      className="mf-v03"
      data-module="major-fortune"
      data-version="0.3.2"
      data-status={analysis.adapterStatus}
      aria-label="Đại Vận V0.3"
    >
      <header className="mf-v03__head">
        <div className="mf-v03__head-main">
          <h3 className="mf-v03__title">{analysis.display.title}</h3>
          <span className="mf-v03__badge">{analysis.display.experimentalBadge}</span>
          <span className="mf-v03__school-chip">{schoolLabel}</span>
        </div>
        {viewingOther && selectedPoint ? (
          <div className="mf-v03__viewing" role="status">
            <span>
              Đang xem: {selectedPoint.startAge}–{selectedPoint.endAge}
            </span>
            <button
              type="button"
              className="mf-v03__back-current"
              onClick={() => {
                if (timeline.currentCycleIndex != null) {
                  setSelectedCycleIndex(timeline.currentCycleIndex);
                }
              }}
            >
              Về chính vận
            </button>
          </div>
        ) : null}
      </header>

      {!selectedPoint ||
      (analysis.adapterStatus === "unavailable" && timeline.points.length === 0) ? (
        <p className="mf-v03__unavailable" role="status">
          {timeline.points.length === 0
            ? "Không có chu kỳ Đại Vận hợp lệ để đánh giá."
            : analysis.adapterDiagnostics.missingActiveMajorFortunePalace.length > 0
              ? "Không có cung Đại Vận đang hoạt động — không tạo điểm thay thế."
              : "Không thể đánh giá Đại Vận với dữ liệu hiện tại."}
        </p>
      ) : (
        <>
          <MajorFortuneTimelineChart
            timeline={timeline}
            selectedCycleIndex={selectedCycleIndex}
            onSelectCycle={setSelectedCycleIndex}
          />

          <div className="mf-v03__selection" aria-label="Tóm tắt điểm">
            <div className="mf-v03__score-block">
              <span className="mf-v03__score-value">{scoreText}</span>
              <span className="mf-v03__score-band">{bandText}</span>
            </div>
            <div className="mf-v03__meta-row">
              {cycle ? (
                <span className="mf-v03__meta-item">
                  {cycle.startAge}–{cycle.endAge} · {cycle.activePalaceName} (
                  {cycle.activePalaceBranch})
                </span>
              ) : null}
              <span className="mf-v03__meta-item">Độ phủ {coverage}</span>
              <span className="mf-v03__meta-item">{moduleStateLabelVi(analysis)}</span>
              {analysis.display.scoredPillarFractionLabel ? (
                <span className="mf-v03__meta-item">
                  {analysis.display.scoredPillarFractionLabel}
                </span>
              ) : null}
            </div>
            {analysis.display.namPhaiPartialTuHoaNote ? (
              <p className="mf-v03__partial-note" role="status">
                {analysis.display.namPhaiPartialTuHoaNote}
              </p>
            ) : null}
          </div>

          <div className="mf-v03__pillars" role="list">
            {analysis.display.pillarSummaries.map((pillar) => (
              <article
                key={pillar.pillarId}
                className="mf-v03__pillar"
                data-pillar={pillar.pillarId}
                data-state={pillar.state}
                role="listitem"
              >
                <h4 className="mf-v03__pillar-title">{pillar.labelVi}</h4>
                <p className="mf-v03__pillar-level">
                  {pillar.level == null
                    ? "—"
                    : pillar.level > 0
                      ? `+${pillar.level}`
                      : String(pillar.level)}{" "}
                  <span className="mf-v03__pillar-level-label">{pillar.levelLabelVi}</span>
                </p>
                <p className="mf-v03__pillar-meta">
                  Δ {pillar.delta.toFixed(1)} · {pillar.stateLabelVi}
                </p>
                {pillar.reasonLabels.length > 0 ? (
                  <p className="mf-v03__pillar-reason">{pillar.reasonLabels[0]}</p>
                ) : null}
              </article>
            ))}
          </div>

          <details
            className="mf-v03__details"
            open={evidenceOpen}
            onToggle={(e) => setEvidenceOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary>Chi tiết bằng chứng</summary>
            <ul className="mf-v03__evidence-list">
              {analysis.display.pillarSummaries.flatMap((p) =>
                p.evidenceLabels.map((label) => (
                  <li key={`${p.pillarId}:${label}`}>
                    <strong>{p.labelVi}:</strong> {label}
                  </li>
                )),
              )}
              {analysis.display.pillarSummaries.every((p) => p.evidenceLabels.length === 0) ? (
                <li>Không có bằng chứng được chấp nhận.</li>
              ) : null}
            </ul>
          </details>
        </>
      )}

      <p className="mf-v03__disclaimer">{analysis.display.disclaimer}</p>
    </section>
  );
}

/** @deprecated Prefer MajorFortuneSection */
export const MajorFortuneV03OrdinalSection = MajorFortuneSection;
export type MajorFortuneV03OrdinalSectionProps = MajorFortuneSectionProps;
