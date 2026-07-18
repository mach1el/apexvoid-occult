import type { AnnualAxesResult, AnnualAxisResult } from "@/lib/ziwei/analysis/modules/annual-axes";
import {
  ANNUAL_AXIS_BAND_LABEL_VI,
  ANNUAL_AXIS_DOMAIN_ORDER,
  ANNUAL_AXIS_LABEL_VI,
} from "./labels";

export interface AnnualAxisCardsProps {
  result: AnnualAxesResult;
  selectedDomain: string | null;
  onSelect: (domain: string) => void;
}

function formatDriverPreview(axis: AnnualAxisResult): string[] {
  if (axis.status !== "available") return [];
  const drivers = axis.topSupportDrivers.length > 0 ? axis.topSupportDrivers : axis.topPressureDrivers;
  return drivers
    .slice(0, 2)
    .map((e) => `${e.targetPalaceName} · ${e.category}`);
}

export function AnnualAxisCards({ result, selectedDomain, onSelect }: AnnualAxisCardsProps) {
  return (
    <ul className="annual-axes-cards" role="list">
      {ANNUAL_AXIS_DOMAIN_ORDER.map((domain) => {
        const axis = result.axes[domain];
        const isAvailable = axis.status === "available";
        const label = ANNUAL_AXIS_LABEL_VI[domain];
        const isActive = selectedDomain === domain;
        return (
          <li key={domain}>
            <button
              type="button"
              className={`annual-axes-card${isAvailable ? "" : " is-unavailable"}`}
              aria-pressed={isActive}
              disabled={!isAvailable}
              onClick={() => onSelect(domain)}
              data-domain={domain}
            >
              <div className="annual-axes-card__head">
                <span className="annual-axes-card__label">{label}</span>
                <span className="annual-axes-card__score">
                  {isAvailable ? axis.score.toFixed(1) : "—"}
                </span>
              </div>
              {isAvailable ? (
                <>
                  <div className="annual-axes-card__band">
                    {ANNUAL_AXIS_BAND_LABEL_VI[axis.band]}
                  </div>
                  <div className="annual-axes-card__meta">
                    <span>Cường độ {axis.intensity}</span>
                    <span>Xung đột {axis.conflict}</span>
                  </div>
                  {formatDriverPreview(axis).length > 0 ? (
                    <ul className="annual-axes-card__driver-preview">
                      {formatDriverPreview(axis).map((line, i) => (
                        <li key={`${domain}-driver-${i}`}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <div className="annual-axes-card__status">Chưa đủ dữ liệu</div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
