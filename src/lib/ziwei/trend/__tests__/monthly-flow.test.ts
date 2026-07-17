import { describe, expect, it } from "vitest";
import type { ChartPalace, FlowMonthEntry } from "@/types/chart";
import { getEngine } from "../../chart";
import { scoreLuuNguyetFrame } from "../monthly-flow";
import { makeChart, palace } from "./fixtures";

/**
 * Engine Tầng 4 (Lưu Nguyệt) — độc lập với scoreFortuneFrame (Đại Vận).
 * Fixture dùng đúng thứ tự BRANCHES thật của engine-nam-phai (Dần=0 …
 * Sửu=11) để locTonIndex/TAM_HOP/XUNG_CHIEU khớp hình học thật, thay vì
 * bảng chi tùy ý của `makeChart`.
 */

const engine = getEngine("nam-phai")!;
const BRANCHES = [
  "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi",
  "Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu",
] as const;

function emptyPalaces(
  starsByIndex: Record<number, ChartPalace["stars"]> = {},
): ChartPalace[] {
  return BRANCHES.map((branch, index) =>
    palace({ index, branch, name: branch, stars: starsByIndex[index] ?? [] }),
  );
}

function buildChart(opts: {
  palaces: ChartPalace[];
  annualBranch: string;
  natalMutagens?: NonNullable<ReturnType<typeof makeChart>["natalMutagens"]>;
  annualMutagens?: NonNullable<ReturnType<typeof makeChart>["annualMutagens"]>;
}) {
  return makeChart({
    palaces: opts.palaces,
    annualBranch: opts.annualBranch,
    natalMutagens: opts.natalMutagens ?? [],
    annualMutagens: opts.annualMutagens ?? [],
    voidMarkers: [],
  });
}

function entryFor(p: ChartPalace, stem: string): FlowMonthEntry {
  return { month: 1, label: "Giêng", palace: p, stem, branch: p.branch };
}

describe("scoreLuuNguyetFrame — Nguyệt Lộc Tồn / Kình Dương / Đà La", () => {
  it("Nguyệt Lộc Tồn cộng đúng +10 cát tại đúng cung theo can tháng (Giáp → Dần)", () => {
    const locIndex = engine.locTonIndex("Giáp");
    const palaces = emptyPalaces();
    const chart = buildChart({ palaces, annualBranch: "Ngọ" });
    const scored = scoreLuuNguyetFrame(
      chart,
      engine,
      entryFor(palaces[locIndex]!, "Giáp"),
    );
    const line = scored.breakdown.cat.find((l) => l.source === "Nguyệt Lộc Tồn");
    expect(line?.points).toBe(10);
    expect(scored.cat).toBe(10);
  });

  it("Nguyệt Kình Dương trừ đúng -8 hung tại cung Lộc Tồn+1", () => {
    const kinhIndex = (engine.locTonIndex("Giáp") + 1) % 12;
    const palaces = emptyPalaces();
    const chart = buildChart({ palaces, annualBranch: "Ngọ" });
    const scored = scoreLuuNguyetFrame(
      chart,
      engine,
      entryFor(palaces[kinhIndex]!, "Giáp"),
    );
    const line = scored.breakdown.hung.find((l) => l.source === "Nguyệt Kình Dương");
    expect(line?.points).toBe(8);
    expect(scored.hung).toBe(8);
  });

  it("Nguyệt Đà La trừ đúng -8 hung tại cung Lộc Tồn-1", () => {
    const daIndex = (engine.locTonIndex("Giáp") + 11) % 12;
    const palaces = emptyPalaces();
    const chart = buildChart({ palaces, annualBranch: "Ngọ" });
    const scored = scoreLuuNguyetFrame(
      chart,
      engine,
      entryFor(palaces[daIndex]!, "Giáp"),
    );
    const line = scored.breakdown.hung.find((l) => l.source === "Nguyệt Đà La");
    expect(line?.points).toBe(8);
    expect(scored.hung).toBe(8);
  });
});

describe("scoreLuuNguyetFrame — guardrail Kỵ Trùng Kỵ / Lộc Trùng Lộc", () => {
  it("Kỵ Trùng Kỵ: Nguyệt Hóa Kỵ (Giáp→Thái Dương) trùng cung Gốc Kỵ → cộng bonus + nhân cột Hung", () => {
    const focusIndex = BRANCHES.indexOf("Mùi");
    const palaces = emptyPalaces({
      [focusIndex]: [{ name: "Thái Dương", layer: "major", brightness: "Bình" }],
    });
    const focus = palaces[focusIndex]!;
    const entry = entryFor(focus, "Giáp");

    const control = scoreLuuNguyetFrame(
      buildChart({ palaces, annualBranch: "Ngọ" }),
      engine,
      entry,
    );
    const trung = scoreLuuNguyetFrame(
      buildChart({
        palaces,
        annualBranch: "Ngọ",
        natalMutagens: [{ mutagen: "Kỵ", starName: "Filler", palace: focus }],
      }),
      engine,
      entry,
    );

    expect(control.breakdown.hung.some((l) => l.source === "Kỵ Trùng Kỵ")).toBe(
      false,
    );
    expect(trung.breakdown.hung.some((l) => l.source === "Kỵ Trùng Kỵ")).toBe(
      true,
    );
    expect(trung.hung).toBeGreaterThan(control.hung);
  });

  it("Lộc Trùng Lộc: Nguyệt Hóa Lộc (Giáp→Liêm Trinh) trùng cung Lưu Lộc năm → cộng bonus + nhân cột Cát", () => {
    const focusIndex = BRANCHES.indexOf("Mùi");
    const palaces = emptyPalaces({
      [focusIndex]: [{ name: "Liêm Trinh", layer: "major", brightness: "Bình" }],
    });
    const focus = palaces[focusIndex]!;
    const entry = entryFor(focus, "Giáp");

    const control = scoreLuuNguyetFrame(
      buildChart({ palaces, annualBranch: "Ngọ" }),
      engine,
      entry,
    );
    const trung = scoreLuuNguyetFrame(
      buildChart({
        palaces,
        annualBranch: "Ngọ",
        annualMutagens: [{ mutagen: "Lộc", starName: "Filler", palace: focus }],
      }),
      engine,
      entry,
    );

    expect(control.breakdown.cat.some((l) => l.source === "Lộc Trùng Lộc")).toBe(
      false,
    );
    expect(trung.breakdown.cat.some((l) => l.source === "Lộc Trùng Lộc")).toBe(
      true,
    );
    expect(trung.cat).toBeGreaterThan(control.cat);
  });
});

describe("scoreLuuNguyetFrame — guardrail Xung Thái Tuế", () => {
  it("chi tháng xung chi năm → cộng +15 hung, không trùng thì không cộng", () => {
    const focusIndex = BRANCHES.indexOf("Mão");
    const palaces = emptyPalaces();
    const entry = entryFor(palaces[focusIndex]!, "Ất"); // can không liên quan phép thử này

    const control = scoreLuuNguyetFrame(
      buildChart({ palaces, annualBranch: "Ngọ" }), // Ngọ không xung Mão
      engine,
      entry,
    );
    const xung = scoreLuuNguyetFrame(
      buildChart({ palaces, annualBranch: "Dậu" }), // Dậu xung Mão
      engine,
      entry,
    );

    expect(control.breakdown.hung.some((l) => l.source === "Xung Thái Tuế")).toBe(
      false,
    );
    expect(xung.breakdown.hung.some((l) => l.source === "Xung Thái Tuế")).toBe(
      true,
    );
    expect(xung.hung).toBeGreaterThan(control.hung);
  });
});

describe("scoreLuuNguyetFrame — guardrail Khoa Chế Nguyệt Kỵ", () => {
  it("có Hóa Khoa trong khung → giảm còn 40% điểm dòng Nguyệt Hóa Kỵ", () => {
    const focusIndex = BRANCHES.indexOf("Mùi");
    const withoutKhoa = emptyPalaces({
      [focusIndex]: [{ name: "Thái Dương", layer: "major", brightness: "Bình" }],
    });
    const withKhoa = emptyPalaces({
      [focusIndex]: [
        { name: "Thái Dương", layer: "major", brightness: "Bình" },
        { name: "Hóa Khoa", source: "natal-mutagen", mutagen: "Khoa" },
      ],
    });

    const control = scoreLuuNguyetFrame(
      buildChart({ palaces: withoutKhoa, annualBranch: "Ngọ" }),
      engine,
      entryFor(withoutKhoa[focusIndex]!, "Giáp"),
    );
    const reduced = scoreLuuNguyetFrame(
      buildChart({ palaces: withKhoa, annualBranch: "Ngọ" }),
      engine,
      entryFor(withKhoa[focusIndex]!, "Giáp"),
    );

    const controlLine = control.breakdown.hung.find(
      (l) => l.source === "Lưu nguyệt Hóa Kỵ",
    );
    const reducedLine = reduced.breakdown.hung.find(
      (l) => l.source === "Lưu nguyệt Hóa Kỵ",
    );
    expect(controlLine).toBeDefined();
    expect(reducedLine).toBeDefined();
    expect(reducedLine!.points).toBeCloseTo(controlLine!.points * 0.4, 1);
  });
});

describe("scoreLuuNguyetFrame — WYSIWYG", () => {
  it("tổng breakdown luôn khớp điểm hiển thị (cat/hung)", () => {
    const focusIndex = BRANCHES.indexOf("Mùi");
    const palaces = emptyPalaces({
      [focusIndex]: [{ name: "Thái Dương", layer: "major", brightness: "Bình" }],
    });
    const focus = palaces[focusIndex]!;
    const scored = scoreLuuNguyetFrame(
      buildChart({
        palaces,
        annualBranch: "Sửu",
        natalMutagens: [{ mutagen: "Kỵ", starName: "Filler", palace: focus }],
      }),
      engine,
      entryFor(focus, "Giáp"),
    );
    expect(
      scored.breakdown.cat.reduce((sum, l) => sum + l.points, 0),
    ).toBe(scored.cat);
    expect(
      scored.breakdown.hung.reduce((sum, l) => sum + l.points, 0),
    ).toBe(scored.hung);
  });
});
