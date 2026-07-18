import type { AnnualAxisResult, AnnualAxisEvidence } from "@/lib/ziwei/analysis/modules/annual-axes";
import { ANNUAL_AXIS_BAND_LABEL_VI, ANNUAL_AXIS_LABEL_VI } from "./labels";
import type { AnnualAxisDomain } from "@/lib/ziwei/analysis";

const CATEGORY_LABEL_VI: Record<AnnualAxisEvidence["category"], string> = {
  star: "Sao",
  mutagen: "Tứ Hóa",
  "focal-marker": "Điểm chú",
  "annual-focus": "Trọng tâm năm",
  interaction: "Tương tác",
};

const ROLE_LABEL_VI: Record<AnnualAxisEvidence["frameRole"], string> = {
  focus: "Bản cung",
  opposite: "Đối cung",
  trine: "Tam hợp",
};

const LAYER_LABEL_VI: Record<AnnualAxisEvidence["layer"], string> = {
  annual: "Lưu niên",
  "major-fortune": "Đại vận",
  "natal-activated": "Bản mệnh",
};

function EvidenceLine({ e }: { e: AnnualAxisEvidence }) {
  return (
    <li>
      <strong>{e.targetPalaceName}</strong> · {CATEGORY_LABEL_VI[e.category]} ·{" "}
      {ROLE_LABEL_VI[e.frameRole]} · {LAYER_LABEL_VI[e.layer]}
    </li>
  );
}

export interface AnnualAxisDetailProps {
  domain: AnnualAxisDomain;
  axis: AnnualAxisResult;
  onClose: () => void;
}

/**
 * Deterministic detail modal — no prediction prose. Renders the axis's
 * band, top drivers, and provenance versions verbatim from the analyzer
 * output. When the axis is unavailable, only reason codes are shown.
 */
export function AnnualAxisDetail({ domain, axis, onClose }: AnnualAxisDetailProps) {
  const label = ANNUAL_AXIS_LABEL_VI[domain];

  return (
    <div className="annual-axis-detail" role="region" aria-label={`Chi tiết ${label}`}>
      <h4 className="annual-axis-detail__title">Chi tiết · {label}</h4>

      {axis.status === "available" ? (
        <>
          <p className="annual-axis-detail__band">
            {ANNUAL_AXIS_BAND_LABEL_VI[axis.band]} · Điểm {axis.score.toFixed(1)}
          </p>

          <section className="annual-axis-detail__section">
            <h5>Trục cường độ / xung đột</h5>
            <ul>
              <li>Cường độ: {axis.intensity}</li>
              <li>Xung đột: {axis.conflict}</li>
            </ul>
          </section>

          <section className="annual-axis-detail__section">
            <h5>Hỗ trợ nổi bật</h5>
            <ul>
              {axis.topSupportDrivers.length === 0 ? (
                <li>—</li>
              ) : (
                axis.topSupportDrivers.map((e) => <EvidenceLine key={e.id} e={e} />)
              )}
            </ul>
          </section>

          <section className="annual-axis-detail__section">
            <h5>Áp lực nổi bật</h5>
            <ul>
              {axis.topPressureDrivers.length === 0 ? (
                <li>—</li>
              ) : (
                axis.topPressureDrivers.map((e) => <EvidenceLine key={e.id} e={e} />)
              )}
            </ul>
          </section>
        </>
      ) : (
        <section className="annual-axis-detail__section">
          <h5>Trạng thái</h5>
          <ul>
            {axis.reasonCodes.length === 0 ? (
              <li>Chưa đủ dữ liệu</li>
            ) : (
              axis.reasonCodes.map((code) => <li key={code}>{code}</li>)
            )}
          </ul>
        </section>
      )}

      <button
        type="button"
        className="annual-axis-detail__close"
        onClick={onClose}
        aria-label="Đóng chi tiết"
      >
        Đóng
      </button>
    </div>
  );
}
