import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { calculate as calculateTrungChau } from "@/lib/ziwei/engine-trung-chau";
import type { BirthInput } from "@/types/chart";
import { buildHuyenKhiPreview } from "../build-preview";
import { oppositePalaceIndex, trinePalaceIndexes } from "../geometry";
import { HUYEN_KHI_DIMENSION_IDS } from "../types";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

describe("huyen-khi-preview geometry", () => {
  it("uses modulo-12 opposite and trines", () => {
    expect(oppositePalaceIndex(0)).toBe(6);
    expect(trinePalaceIndexes(0)).toEqual([4, 8]);
    expect(oppositePalaceIndex(7)).toBe(1);
    expect(trinePalaceIndexes(7)).toEqual([11, 3]);
  });
});

describe("buildHuyenKhiPreview — adapter", () => {
  it("returns 12 palaces with exactly one Mệnh and one Thân", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = buildHuyenKhiPreview(chart, { school: "nam-phai" });

    expect(result.status).toBe("available");
    expect(result.module).toBe("huyen-khi");
    expect(result.mode).toBe("research-preview");
    expect(result.evaluatorStatus).toBe("not-promoted");
    expect(result.palaces).toHaveLength(12);
    expect(result.palaces.map((p) => p.palaceIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(result.palaces.filter((p) => p.isMenh)).toHaveLength(1);
    expect(result.palaces.filter((p) => p.isThan)).toHaveLength(1);
  });

  it("marks VCD when no resident major and lists opposite majors as borrowed", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = buildHuyenKhiPreview(chart, { school: "nam-phai" });
    const vcd = result.palaces.filter((p) => p.isVoChinhDieu);
    expect(vcd.length).toBeGreaterThan(0);

    for (const palace of vcd) {
      expect(palace.majorStars).toHaveLength(0);
      const opposite = result.palaces.find((p) => p.palaceIndex === palace.oppositePalaceIndex);
      expect(opposite).toBeDefined();
      expect(palace.borrowedMajorStars.map((s) => s.factId).sort()).toEqual(
        (opposite?.majorStars ?? []).map((s) => s.factId).sort(),
      );
    }
  });

  it("preserves brightness, natal Tứ Hóa, void markers and Trường Sinh", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = buildHuyenKhiPreview(chart, { school: "nam-phai" });

    const withBrightness = result.palaces.flatMap((p) =>
      p.majorStars.filter((s) => s.brightness),
    );
    expect(withBrightness.length).toBeGreaterThan(0);

    const withTf = result.palaces.filter((p) => p.natalTransformations.length > 0);
    expect(withTf.length).toBeGreaterThan(0);

    const withVoid = result.palaces.filter((p) => p.voidMarkers.length > 0);
    expect(withVoid.length).toBeGreaterThan(0);

    const withChangSheng = result.palaces.filter((p) => p.changShengStage);
    expect(withChangSheng.length).toBe(12);
  });

  it("keeps all five dimension states null with not-promoted reason", () => {
    const chart = calculateNamPhai(REGRESSION);
    const result = buildHuyenKhiPreview(chart, { school: "nam-phai" });
    for (const palace of result.palaces) {
      expect(palace.dimensionStateReason).toBe("symbolic-evaluator-not-promoted");
      for (const id of HUYEN_KHI_DIMENSION_IDS) {
        expect(palace.dimensionStates[id]).toBeNull();
      }
    }
  });

  it("is deterministic for identical inputs", () => {
    const chart = calculateNamPhai(REGRESSION);
    const a = buildHuyenKhiPreview(chart, { school: "nam-phai" });
    const b = buildHuyenKhiPreview(chart, { school: "nam-phai" });
    expect(a).toEqual(b);
  });
});

describe("buildHuyenKhiPreview — isolation", () => {
  it("changing annualYear produces a deep-equal preview", () => {
    const a = buildHuyenKhiPreview(
      calculateNamPhai({ ...REGRESSION, annualYear: "2026" }),
      { school: "nam-phai" },
    );
    const b = buildHuyenKhiPreview(
      calculateNamPhai({ ...REGRESSION, annualYear: "2031" }),
      { school: "nam-phai" },
    );
    expect(a).toEqual(b);
  });

  it("contains only natal-derived fact ids", () => {
    const result = buildHuyenKhiPreview(calculateNamPhai(REGRESSION), {
      school: "nam-phai",
    });
    for (const palace of result.palaces) {
      for (const star of [...palace.majorStars, ...palace.minorStars, ...palace.borrowedMajorStars]) {
        expect(star.factId.startsWith("natal:")).toBe(true);
      }
      for (const tf of palace.natalTransformations) {
        expect(tf.factId.startsWith("natal:transform:")).toBe(true);
      }
      for (const v of palace.voidMarkers) {
        expect(v.factId.startsWith("natal:void:")).toBe(true);
      }
    }
  });

  it("does not cross-school fallback — school field matches request", () => {
    const chart = calculateNamPhai(REGRESSION);
    const np = buildHuyenKhiPreview(chart, { school: "nam-phai" });
    const tc = buildHuyenKhiPreview(calculateTrungChau(REGRESSION), {
      school: "trung-chau",
    });
    expect(np.school).toBe("nam-phai");
    expect(tc.school).toBe("trung-chau");
    // Different schools produce independently labeled results; no silent merge.
    expect(np.school).not.toBe(tc.school);
  });
});
