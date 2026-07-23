import { useCallback, useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type {
  MajorFortuneTimelinePoint,
  MajorFortuneTimelineResult,
} from "@/lib/ziwei/analysis/modules/major-fortune/v0.3-ordinal-timeline";
import { BAND_LABEL_VI } from "@/lib/ziwei/analysis/modules/major-fortune/v0.3-ordinal-adapter/display";

export interface MajorFortuneTimelineChartProps {
  timeline: MajorFortuneTimelineResult;
  selectedCycleIndex: number | null;
  onSelectCycle: (cycleIndex: number) => void;
}

const VIEW_W = 1000;
const VIEW_H = 300;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 30;
const PAD_B = 44;
const Y_MAX = 100;
const Y_TICKS = [0, 20, 40, 60, 80, 100];

function scoreToY(score: number): number {
  const plotH = VIEW_H - PAD_T - PAD_B;
  return PAD_T + plotH * (1 - score / Y_MAX);
}

function moduleStateLabel(point: MajorFortuneTimelinePoint): string {
  if (point.status === "unavailable") return "Không khả dụng";
  if (point.status === "partial") return "Thiếu dữ liệu";
  return "Đã đánh giá";
}

function tooltipLines(point: MajorFortuneTimelinePoint): string[] {
  const lines = [
    `${point.ageLabel} tuổi`,
    `Cung: ${point.activePalaceName} · ${point.activePalaceBranch}`,
    "",
  ];
  if (point.totalScore == null) {
    lines.push("Tổng điểm: —");
    lines.push("Nền ba trụ: —");
  } else {
    lines.push(`Tổng điểm: ${point.totalScore.toFixed(1)}`);
    lines.push(
      point.threePillarBaseScore == null
        ? "Nền ba trụ: —"
        : `Nền ba trụ: ${point.threePillarBaseScore.toFixed(1)}`,
    );
  }
  const tu = point.pillars?.["tu-hoa-sat-tinh"];
  if (tu?.state === "partial-data" || tu?.level == null) {
    lines.push("Tứ Hóa: Thiếu dữ liệu");
  } else if (point.totalScore != null && point.threePillarBaseScore != null) {
    const d = point.tuHoaDelta;
    lines.push(`Tứ Hóa: ${d > 0 ? "+" : ""}${d.toFixed(1)}`);
  } else {
    lines.push("Tứ Hóa: —");
  }
  const covPct = Math.round(point.scoringCoverageWeight * 100);
  lines.push(
    point.scoringCoverageWeight < 1
      ? `Độ phủ tính điểm: ${covPct}%`
      : `Độ phủ: ${covPct}%`,
  );
  lines.push(`Trạng thái: ${moduleStateLabel(point)}`);
  if (point.band) {
    lines.push(`Mức: ${BAND_LABEL_VI[point.band]}`);
  }
  return lines;
}

/**
 * Accessible SVG lifetime Major Fortune chart (no external chart library).
 */
export function MajorFortuneTimelineChart({
  timeline,
  selectedCycleIndex,
  onSelectCycle,
}: MajorFortuneTimelineChartProps) {
  const reactId = useId();
  const points = timeline.points;
  const [focusCycle, setFocusCycle] = useState<number | null>(null);
  const tipCycle = focusCycle ?? selectedCycleIndex;
  const tipPoint = points.find((p) => p.cycleIndex === tipCycle) ?? null;

  const layout = useMemo(() => {
    const n = Math.max(points.length, 1);
    const plotW = VIEW_W - PAD_L - PAD_R;
    const slot = plotW / n;
    return points.map((p, i) => {
      const cx = PAD_L + slot * (i + 0.5);
      const barW = Math.min(slot * 0.55, 42);
      return { point: p, cx, barW, slot };
    });
  }, [points]);

  const minWidthPx = Math.max(points.length * 72, 320);

  const onKeyNav = useCallback(
    (e: KeyboardEvent, cycleIndex: number) => {
      const idx = points.findIndex((p) => p.cycleIndex === cycleIndex);
      if (idx < 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = points[Math.min(idx + 1, points.length - 1)];
        if (next) onSelectCycle(next.cycleIndex);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = points[Math.max(idx - 1, 0)];
        if (prev) onSelectCycle(prev.cycleIndex);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectCycle(cycleIndex);
      } else if (e.key === "Home") {
        e.preventDefault();
        if (points[0]) onSelectCycle(points[0].cycleIndex);
      } else if (e.key === "End") {
        e.preventDefault();
        const last = points[points.length - 1];
        if (last) onSelectCycle(last.cycleIndex);
      }
    },
    [onSelectCycle, points],
  );

  if (points.length === 0) {
    return (
      <div className="mf-timeline mf-timeline--empty" role="status">
        Không có chu kỳ Đại Vận hợp lệ để hiển thị.
      </div>
    );
  }

  const plotBottom = VIEW_H - PAD_B;

  return (
    <div className="mf-timeline">
      <div className="mf-timeline__legend" aria-hidden="true">
        <span className="mf-timeline__swatch mf-timeline__swatch--total" />
        Tổng điểm V0.3
        <span className="mf-timeline__swatch mf-timeline__swatch--base" />
        Nền ba trụ
        <span className="mf-timeline__swatch mf-timeline__swatch--current" />
        Chính vận
      </div>
      <p className="mf-timeline__hint">Nền ba trụ chưa bao gồm ảnh hưởng Tứ Hóa.</p>

      <div
        className="mf-timeline__scroll"
        data-testid="mf-timeline-scroll"
        style={{ ["--mf-timeline-min-width" as string]: `${minWidthPx}px` }}
      >
        <svg
          className="mf-timeline__svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Biểu đồ Đại Vận theo chu kỳ tuổi"
        >
          <title>Đại Vận V0.3 — quỹ đạo theo chu kỳ</title>

          <g className="mf-timeline__grid">
            {Y_TICKS.map((t) => {
              const y = scoreToY(t);
              return (
                <line
                  key={t}
                  x1={PAD_L}
                  x2={VIEW_W - PAD_R}
                  y1={y}
                  y2={y}
                  className="mf-timeline__grid-line"
                />
              );
            })}
          </g>

          <g className="mf-timeline__y-axis" aria-hidden="true">
            {Y_TICKS.map((t) => (
              <text
                key={t}
                x={PAD_L - 8}
                y={scoreToY(t) + 4}
                textAnchor="end"
                className="mf-timeline__axis-label"
              >
                {t}
              </text>
            ))}
          </g>

          <g className="mf-timeline__bars-baseline">
            {layout.map(({ point, cx, barW }) => {
              if (point.threePillarBaseScore == null) {
                return (
                  <rect
                    key={`base-ph-${point.cycleIndex}`}
                    x={cx - barW * 0.28}
                    y={plotBottom - 4}
                    width={barW * 0.56}
                    height={4}
                    className="mf-timeline__bar-placeholder"
                  />
                );
              }
              const y = scoreToY(point.threePillarBaseScore);
              const h = Math.max(plotBottom - y, 0);
              return (
                <rect
                  key={`base-${point.cycleIndex}`}
                  x={cx - barW * 0.28}
                  y={y}
                  width={barW * 0.56}
                  height={h}
                  rx={4}
                  className="mf-timeline__bar-base"
                />
              );
            })}
          </g>

          <g className="mf-timeline__bars-total">
            {layout.map(({ point, cx, barW }) => {
              const selected = point.cycleIndex === selectedCycleIndex;
              const partial = point.status === "partial";
              if (point.totalScore == null) {
                return (
                  <g key={`tot-ph-${point.cycleIndex}`}>
                    <rect
                      x={cx - barW / 2}
                      y={plotBottom - 6}
                      width={barW}
                      height={6}
                      className="mf-timeline__bar-placeholder"
                      data-cycle={point.cycleIndex}
                      data-unavailable="true"
                    />
                  </g>
                );
              }
              const y = scoreToY(point.totalScore);
              const h = Math.max(plotBottom - y, 0);
              return (
                <rect
                  key={`tot-${point.cycleIndex}`}
                  x={cx - barW / 2}
                  y={y}
                  width={barW}
                  height={h}
                  rx={5}
                  className={[
                    "mf-timeline__bar-total",
                    selected ? "is-selected" : "",
                    partial ? "is-partial" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-cycle={point.cycleIndex}
                />
              );
            })}
          </g>

          <g className="mf-timeline__hit">
            {layout.map(({ point, cx, slot }) => (
              <rect
                key={`hit-${point.cycleIndex}`}
                x={cx - slot / 2}
                y={PAD_T}
                width={slot}
                height={VIEW_H - PAD_T - PAD_B + 28}
                className="mf-timeline__hit-area"
                tabIndex={0}
                role="button"
                aria-pressed={point.cycleIndex === selectedCycleIndex}
                aria-label={`${point.ageLabel} tuổi, cung ${point.activePalaceName}`}
                data-cycle={point.cycleIndex}
                onClick={() => onSelectCycle(point.cycleIndex)}
                onKeyDown={(e) => onKeyNav(e, point.cycleIndex)}
                onFocus={() => setFocusCycle(point.cycleIndex)}
                onBlur={() => setFocusCycle(null)}
                onMouseEnter={() => setFocusCycle(point.cycleIndex)}
                onMouseLeave={() => setFocusCycle(null)}
              />
            ))}
          </g>

          {layout.map(({ point, cx }) =>
            point.isCurrentCycle ? (
              <g
                key={`cur-${point.cycleIndex}`}
                className="mf-timeline__current-marker"
                aria-label={`Chính vận ${point.ageLabel} tuổi`}
              >
                <line
                  x1={cx}
                  x2={cx}
                  y1={PAD_T - 8}
                  y2={plotBottom}
                  className="mf-timeline__current-line"
                />
                <rect
                  x={cx - 36}
                  y={8}
                  width={72}
                  height={20}
                  rx={10}
                  className="mf-timeline__current-pill"
                />
                <text
                  x={cx}
                  y={22}
                  textAnchor="middle"
                  className="mf-timeline__current-pill-text"
                >
                  Chính vận
                </text>
              </g>
            ) : null,
          )}

          <g className="mf-timeline__x-axis">
            {layout.map(({ point, cx }) => {
              const isCurrent = point.isCurrentCycle;
              const isSelected = point.cycleIndex === selectedCycleIndex;
              return (
                <g key={`x-${point.cycleIndex}`}>
                  {isCurrent ? (
                    <rect
                      x={cx - 28}
                      y={plotBottom + 10}
                      width={56}
                      height={20}
                      rx={8}
                      className="mf-timeline__age-pill"
                    />
                  ) : null}
                  <text
                    x={cx}
                    y={plotBottom + 24}
                    textAnchor="middle"
                    className={[
                      "mf-timeline__age-label",
                      isSelected ? "is-selected" : "",
                      isCurrent ? "is-current" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {point.ageLabel}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {tipPoint ? (
        <div
          className="mf-timeline__tooltip"
          id={`${reactId}-tip`}
          role="status"
          data-testid="mf-timeline-tooltip"
        >
          {tooltipLines(tipPoint).map((line, i) =>
            line === "" ? <br key={`b-${i}`} /> : <div key={`${i}-${line}`}>{line}</div>,
          )}
        </div>
      ) : null}
    </div>
  );
}
