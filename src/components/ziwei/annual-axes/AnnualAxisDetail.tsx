import type {
  AnnualAxisResult,
  AnnualAxisEvidence,
  AnnualAxisV08Evidence,
} from "@/lib/ziwei/analysis/modules/annual-axes";
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

function formatStarList(
  facts: Array<{ starName: string; points: number; polarity: "positive" | "negative" }>,
  polarity: "positive" | "negative",
): string {
  const matched = facts.filter((f) => f.polarity === polarity);
  if (matched.length === 0) return "—";
  return matched
    .map((f) => {
      const pts = f.points;
      const signed = pts > 0 ? `+${pts}` : `${pts}`;
      return `${f.starName} (${signed})`;
    })
    .join(", ");
}

function formatWeightedEvidence(items: AnnualAxisV08Evidence[] | undefined): string {
  if (!items || items.length === 0) return "—";
  return items
    .map((e) => {
      const w = e.weightedContribution;
      const signed = w > 0 ? `+${w.toFixed(2)}` : w.toFixed(2);
      return `${e.exactMatchedStarName} (${signed})`;
    })
    .join(", ");
}

function v08ScoreStateLabel(
  scoreState: "scored" | "no-signal" | "balanced-signal" | "partial-data" | "unavailable",
  bandLabel: string,
): string {
  switch (scoreState) {
    case "no-signal":
      return "Chưa có tín hiệu";
    case "balanced-signal":
      return "Cân bằng tín hiệu";
    case "partial-data":
      return "Thiếu một phần dữ liệu";
    case "unavailable":
      return "Không đủ dữ liệu";
    case "scored":
      return bandLabel;
  }
}

export interface AnnualAxisDetailProps {
  domain: AnnualAxisDomain;
  axis: AnnualAxisResult;
  onClose: () => void;
}

/**
 * Deterministic detail modal — no prediction prose.
 * V0.8 shows palace mapping, weighted evidence, coverage, and final score.
 */
export function AnnualAxisDetail({ domain, axis, onClose }: AnnualAxisDetailProps) {
  const label = ANNUAL_AXIS_LABEL_VI[domain];
  const isV08 = axis.engine === "v0.8";

  return (
    <div className="annual-axis-detail" role="region" aria-label={`Chi tiết ${label}`}>
      <h4 className="annual-axis-detail__title">Chi tiết · {label}</h4>

      {isV08 && axis.scoreTrace?.formulaVersion === "v0.8-annual-palace-weighted-score" ? (
        <>
          {axis.status === "unavailable" ? (
            <>
              <p className="annual-axis-detail__band">Không đủ dữ liệu</p>
              <ul className="annual-axis-detail__list" aria-label="Lý do thiếu dữ liệu">
                <li>
                  Cung trọng tâm thiếu
                  {axis.scoreTrace.missingPrimaryReason
                    ? `: ${axis.scoreTrace.missingPrimaryReason}`
                    : ""}
                </li>
                {(axis.reasonCodes ?? []).map((code) => (
                  <li key={code}>{code}</li>
                ))}
                {axis.coverage ? (
                  <li>
                    Độ phủ: {(axis.coverage.resolvedWeight * 100).toFixed(0)}% /{" "}
                    {(axis.coverage.totalWeight * 100).toFixed(0)}%
                    {axis.coverage.missingPalaces.length > 0
                      ? ` · thiếu: ${axis.coverage.missingPalaces.join(", ")}`
                      : ""}
                  </li>
                ) : null}
              </ul>
            </>
          ) : (
            <p className="annual-axis-detail__band">
              {v08ScoreStateLabel(
                axis.scoreTrace.scoreState,
                ANNUAL_AXIS_BAND_LABEL_VI[axis.band],
              )}{" "}
              · Điểm {axis.score.toFixed(1)}
            </p>
          )}

          <div className="annual-axis-detail__score-trace" aria-label="V0.8 palace mapping">
            <h6>Cung trọng tâm — {(axis.scoreTrace.primary.configuredWeight * 100).toFixed(0)}%</h6>
            <ul className="annual-axis-detail__list">
              <li>
                <strong>{axis.scoreTrace.primary.palaceName}</strong>
                {axis.scoreTrace.primary.missingReason ? " · thiếu dữ liệu" : null}
              </li>
              {!axis.scoreTrace.primary.missingReason ? (
                <>
                  <li>
                    Sao tốt: {formatStarList(axis.scoreTrace.primary.matchedFacts, "positive")}
                  </li>
                  <li>
                    Sao xấu: {formatStarList(axis.scoreTrace.primary.matchedFacts, "negative")}
                  </li>
                  <li>Điểm cung: {axis.scoreTrace.primary.palaceRaw.toFixed(1)}</li>
                </>
              ) : (
                <li>{axis.scoreTrace.primary.missingReason}</li>
              )}
            </ul>

            <h6>Cung phối hợp</h6>
            <ul className="annual-axis-detail__list">
              {axis.scoreTrace.cooperating.length === 0 ? (
                <li>—</li>
              ) : (
                axis.scoreTrace.cooperating.map((c) => (
                  <li key={`${c.role}-${c.palaceName}`}>
                    <strong>{c.palaceName}</strong> ({(c.configuredWeight * 100).toFixed(0)}%)
                    {c.missingReason ? (
                      <>
                        <br />
                        Thiếu dữ liệu: {c.missingReason}
                      </>
                    ) : (
                      <>
                        <br />
                        Sao tốt: {formatStarList(c.matchedFacts, "positive")}
                        <br />
                        Sao xấu: {formatStarList(c.matchedFacts, "negative")}
                        <br />
                        Điểm cung: {c.palaceRaw.toFixed(1)}
                      </>
                    )}
                  </li>
                ))
              )}
            </ul>

            <h6>Đóng góp có trọng số</h6>
            <ul className="annual-axis-detail__list">
              <li>Hỗ trợ: {formatWeightedEvidence(axis.topSupportDriversV08)}</li>
              <li>Áp lực: {formatWeightedEvidence(axis.topPressureDriversV08)}</li>
            </ul>

            <h6>Kết quả</h6>
            <ul className="annual-axis-detail__list">
              {axis.coverage ? (
                <li>
                  Độ phủ: {(axis.coverage.resolvedWeight * 100).toFixed(0)}% /{" "}
                  {(axis.coverage.totalWeight * 100).toFixed(0)}%
                  {axis.coverage.missingPalaces.length > 0
                    ? ` · thiếu: ${axis.coverage.missingPalaces.join(", ")}`
                    : ""}
                </li>
              ) : null}
              <li>
                Lưu Thái Tuế nổi bật: {axis.scoreTrace.isThaiTueHighlighted ? "Có" : "Không"}
                {axis.scoreTrace.isThaiTueHighlighted ? " (×1.25)" : ""}
              </li>
              <li>
                Điểm:{" "}
                <strong>
                  {axis.status === "unavailable" ? "—" : axis.score.toFixed(1)}
                </strong>
              </li>
            </ul>
          </div>
        </>
      ) : axis.engine === "v0.2" &&
        (axis.status === "available" || axis.status === "partial-data") ? (
        <>
          <p className="annual-axis-detail__band">
            {ANNUAL_AXIS_BAND_LABEL_VI[axis.band]} · Điểm {axis.score.toFixed(1)}
            {typeof axis.annualDelta === "number" ? (
              <>
                {" "}
                · Delta {axis.annualDelta >= 0 ? "+" : ""}
                {axis.annualDelta.toFixed(1)}
              </>
            ) : null}
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
            {(axis.reasonCodes ?? []).length === 0 ? (
              <li>Chưa đủ dữ liệu</li>
            ) : (
              (axis.reasonCodes ?? []).map((code) => <li key={code}>{code}</li>)
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
