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

function formatStarList(
  facts: Array<{ starName: string; points: number; polarity: "positive" | "negative" }>,
  polarity: "positive" | "negative",
): string {
  const matched = facts.filter((f) => f.polarity === polarity);
  if (matched.length === 0) return "—";
  return matched
    .map((f) => `${f.starName} (${f.points > 0 ? "+" : ""}${f.points})`)
    .join(", ");
}

function v08ScoreStateLabel(
  scoreState: "scored" | "no-signal" | "balanced-signal" | "partial-data",
  bandLabel: string,
): string {
  switch (scoreState) {
    case "no-signal":
      return "Chưa có tín hiệu";
    case "balanced-signal":
      return "Cân bằng tín hiệu";
    case "partial-data":
      return "Thiếu một phần dữ liệu";
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
 * V0.8 shows only palace mapping + final score.
 */
export function AnnualAxisDetail({ domain, axis, onClose }: AnnualAxisDetailProps) {
  const label = ANNUAL_AXIS_LABEL_VI[domain];
  const isV08 =
    axis.status === "available" &&
    axis.scoreTrace?.formulaVersion === "v0.8-annual-palace-weighted-score";

  return (
    <div className="annual-axis-detail" role="region" aria-label={`Chi tiết ${label}`}>
      <h4 className="annual-axis-detail__title">Chi tiết · {label}</h4>

      {axis.status === "available" && isV08 && axis.scoreTrace?.formulaVersion === "v0.8-annual-palace-weighted-score" ? (
        <>
          <p className="annual-axis-detail__band">
            {v08ScoreStateLabel(axis.scoreTrace.scoreState, ANNUAL_AXIS_BAND_LABEL_VI[axis.band])} ·
            Điểm {axis.score.toFixed(1)}
          </p>

          <div className="annual-axis-detail__score-trace" aria-label="V0.8 palace mapping">
            <h6>Cung trọng tâm — {(axis.scoreTrace.primary.configuredWeight * 100).toFixed(0)}%</h6>
            <ul className="annual-axis-detail__list">
              <li>
                <strong>{axis.scoreTrace.primary.palaceName}</strong>
              </li>
              <li>Sao tốt: {formatStarList(axis.scoreTrace.primary.matchedFacts, "positive")}</li>
              <li>Sao xấu: {formatStarList(axis.scoreTrace.primary.matchedFacts, "negative")}</li>
              <li>Điểm cung: {axis.scoreTrace.primary.palaceRaw.toFixed(1)}</li>
            </ul>

            <h6>Cung phối hợp — 40%</h6>
            <ul className="annual-axis-detail__list">
              {axis.scoreTrace.cooperating.length === 0 ? (
                <li>—</li>
              ) : (
                axis.scoreTrace.cooperating.map((c) => (
                  <li key={`${c.role}-${c.palaceName}`}>
                    <strong>{c.palaceName}</strong> ({(c.configuredWeight * 100).toFixed(0)}%)
                    <br />
                    Sao tốt: {formatStarList(c.matchedFacts, "positive")}
                    <br />
                    Sao xấu: {formatStarList(c.matchedFacts, "negative")}
                    <br />
                    Điểm cung: {c.palaceRaw.toFixed(1)}
                    {c.missingReason ? (
                      <>
                        <br />
                        Thiếu dữ liệu cung
                      </>
                    ) : null}
                  </li>
                ))
              )}
            </ul>

            <h6>Kết quả</h6>
            <ul className="annual-axis-detail__list">
              <li>
                Lưu Thái Tuế nổi bật: {axis.scoreTrace.isThaiTueHighlighted ? "Có" : "Không"}
                {axis.scoreTrace.isThaiTueHighlighted ? " (×1.25)" : ""}
              </li>
              <li>
                Điểm: <strong>{axis.score.toFixed(1)}</strong>
              </li>
            </ul>
          </div>
        </>
      ) : axis.status === "available" ? (
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

          {axis.routing ? (
            <section className="annual-axis-detail__section" data-annual-routing>
              <h5>Định tuyến đầu tàu năm</h5>
              <ul>
                <li>Routing: {axis.routing.routing.toFixed(4)}</li>
                {typeof axis.routedStrength === "number" ? (
                  <li>Routed strength: {axis.routedStrength.toFixed(4)}</li>
                ) : (
                  <>
                    <li>Head share: {axis.routing.headShare.toFixed(4)}</li>
                    <li>Local share: {axis.routing.localShare.toFixed(4)}</li>
                  </>
                )}
              </ul>
            </section>
          ) : null}

          {axis.natalResponse ? (
            <section className="annual-axis-detail__section" data-natal-response>
              <h5>Đáp ứng bản mệnh (biên độ, không phải điểm tốt/xấu)</h5>
              <ul>
                <li>Sensitivity: {axis.natalResponse.sensitivity.toFixed(3)}</li>
                <li>Resilience: {axis.natalResponse.resilience.toFixed(3)}</li>
                <li>Amplitude: {axis.natalResponse.amplitudeMultiplier.toFixed(3)}</li>
              </ul>
            </section>
          ) : null}

          {axis.channels ? (
            <section className="annual-axis-detail__section" data-annual-channels>
              <h5>Bốn kênh delta</h5>
              <ul>
                <li>Global: {axis.channels.globalAnnualClimate.signed.toFixed(3)}</li>
                <li>Routed head: {axis.channels.routedHeadImpact.signed.toFixed(3)}</li>
                <li>Direct domain: {axis.channels.directDomainImpact.signed.toFixed(3)}</li>
                <li>Major background: {axis.channels.majorFortuneBackground.signed.toFixed(3)}</li>
              </ul>
            </section>
          ) : null}

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
