import { useMemo } from "react";
import type { AnnualAxesResult, AnnualAxisResult } from "@/lib/ziwei/analysis/modules/annual-axes";
import { ANNUAL_AXIS_DOMAIN_ORDER, ANNUAL_AXIS_LABEL_VI } from "./labels";

const CX = 150;
const CY = 150;
const R = 112;

const AXIS_SHORT_LABEL: Record<string, string> = {
  health: "SK",
  family: "GĐ",
  wealth: "TL",
  career: "CV",
  social: "GH",
  romance: "TD",
};

function polar(index: number, total: number, radius: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  };
}

function polygonPoints(scores: Array<number | null>): string {
  return scores
    .map((score, i) => {
      const clamped = score == null ? 0 : Math.max(0, Math.min(100, score));
      const p = polar(i, scores.length, (clamped / 100) * R);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

export interface AnnualAxesRadarProps {
  result: AnnualAxesResult;
  selectedDomain: string | null;
  onSelect: (domain: string) => void;
}

/**
 * Six-axis radar for the annual axes result. Only available domains are
 * plotted as concrete points — unavailable domains land at zero on the
 * polygon (per the mission spec: never plot a score of 0 as if it were a
 * real evaluation) and are labelled with an em-dash badge on their axis.
 */
export function AnnualAxesRadar({ result, selectedDomain, onSelect }: AnnualAxesRadarProps) {
  const ordered = useMemo(() => {
    return ANNUAL_AXIS_DOMAIN_ORDER.map((domain): { domain: string; axis: AnnualAxisResult } => ({
      domain,
      axis: result.axes[domain],
    }));
  }, [result]);

  const scores = ordered.map(({ axis }) =>
    axis.status === "available" ? axis.score : null,
  );

  return (
    <div
      className="annual-axes-radar"
      data-module="annual-axes"
      role="figure"
      aria-label="Radar sáu trục khí vận năm"
    >
      <svg
        className="annual-axes-radar__svg"
        viewBox="0 0 300 300"
        role="img"
        aria-label="Radar sáu trục khí vận năm"
      >
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={Array.from({ length: 6 }, (_, i) => {
              const p = polar(i, 6, R * scale);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.18}
          />
        ))}
        {ordered.map((_, i) => {
          const p = polar(i, 6, R);
          return (
            <line
              key={`axis-${i}`}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="currentColor"
              strokeOpacity={0.14}
            />
          );
        })}
        <polygon
          points={polygonPoints(scores)}
          fill="color-mix(in srgb, currentColor 18%, transparent)"
          stroke="currentColor"
          strokeWidth={1.4}
        />
        {ordered.map(({ domain, axis }, i) => {
          const isAvailable = axis.status === "available";
          const score = isAvailable ? axis.score : 0;
          const p = polar(i, 6, (score / 100) * R);
          const label = polar(i, 6, R + 20);
          const isActive = selectedDomain === domain;
          const short = AXIS_SHORT_LABEL[domain] ?? domain.slice(0, 2).toUpperCase();
          const scoreLabel = isAvailable ? String(axis.score) : "—";
          return (
            <g
              key={domain}
              className={`annual-axes-radar__point${isActive ? " is-active" : ""}`}
              tabIndex={0}
              role="button"
              aria-pressed={isActive}
              aria-label={`${ANNUAL_AXIS_LABEL_VI[domain as keyof typeof ANNUAL_AXIS_LABEL_VI]} — điểm ${scoreLabel}`}
              onClick={() => onSelect(domain)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(domain);
                }
              }}
            >
              {/* invisible larger hit target for pointer/keyboard tap area */}
              <circle cx={p.x} cy={p.y} r={22} fill="transparent" pointerEvents="all" />
              {isAvailable ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 5 : 3.5}
                  fill="currentColor"
                />
              ) : (
                <circle
                  cx={CX}
                  cy={CY}
                  r={2.5}
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="2 3"
                />
              )}
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fill="currentColor"
              >
                {short}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
