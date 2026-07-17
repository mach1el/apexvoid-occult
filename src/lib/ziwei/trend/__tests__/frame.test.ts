import { describe, expect, it } from "vitest";
import { getDaiVanTrend } from "../score";
import { makeChart, minimalFortune, palace } from "./fixtures";

describe("frame scoring 6-step (via getDaiVanTrend)", () => {
  it("Hóa Kỵ CSV hung > 0; vùng không đổi dấu sang cát", () => {
    const ky = {
      name: "Hóa Kỵ",
      source: "natal-mutagen" as const,
      mutagen: "Kỵ",
    };
    const point = getDaiVanTrend(minimalFortune("Thìn", [ky]))[0]!;
    expect(point.hung).toBeGreaterThan(0);
    expect(
      point.breakdown.hung.some(
        (line) => line.source.includes("Kỵ") || line.reason.includes("Kỵ"),
      ),
    ).toBe(true);
  });

  it("Cát/Hung độc lập: không có dòng hóa giải âm trên Hung", () => {
    const menh = palace({
      index: 0,
      branch: "Thìn",
      name: "Mệnh",
      isMenh: true,
      majorFortune: { order: 1, active: true, start: 10, end: 19 },
      stars: [{ name: "Thanh Long", layer: "misc" }],
    });
    const di = palace({
      index: 6,
      branch: "Tuất",
      name: "Thiên Di",
      majorFortune: { order: 2, active: false, start: 20, end: 29 },
      stars: [{ name: "Hóa Kỵ", source: "natal-mutagen", mutagen: "Kỵ" }],
    });
    const withPair = getDaiVanTrend(
      makeChart({
        palaces: [menh, di],
        menhBranch: "Thìn",
        menhIndex: 0,
        majorFortunePalace: menh,
        annualPalace: menh,
        voidMarkers: [],
        annualMutagens: [],
        natalMutagens: [],
      }),
    ).find((point) => point.isCurrent)!;

    expect(
      withPair.breakdown.hung.every(
        (line) =>
          line.points >= 0 || line.source === "Chuẩn hóa",
      ),
    ).toBe(true);
    expect(
      withPair.breakdown.hung.some((line) => line.source.includes("hóa giải")),
    ).toBe(false);
  });

  it("Sát Phá Tham Hãm + hung companion → HUNG_03, không CAT_02", () => {
    const focus = palace({
      index: 0,
      branch: "Mão",
      name: "Điền Trạch",
      majorFortune: { order: 1, active: true, start: 35, end: 44 },
      stars: [
        { name: "Tham Lang", layer: "major", brightness: "Hãm" },
        { name: "Bạch Hổ", layer: "harm" },
      ],
    });
    const hop1 = palace({
      index: 4,
      branch: "Hợi",
      name: "Tật Ách",
      stars: [{ name: "Phá Quân", layer: "major", brightness: "Hãm" }],
    });
    const hop2 = palace({
      index: 8,
      branch: "Mùi",
      name: "Quan Lộc",
      stars: [
        { name: "Thất Sát", layer: "major", brightness: "Đắc" },
        { name: "Hóa Kỵ", source: "natal-mutagen", mutagen: "Kỵ" },
      ],
    });
    const point = getDaiVanTrend(
      makeChart({
        palaces: [focus, hop1, hop2],
        menhBranch: "Mùi",
        menhElement: "Lộ Bàng Thổ",
        menhIndex: 0,
        majorFortunePalace: focus,
        annualPalace: focus,
        voidMarkers: [],
        annualMutagens: [],
        natalMutagens: [],
      }),
    )[0]!;

    expect(
      point.breakdown.hung.some((line) => line.source.includes("HUNG_03")),
    ).toBe(true);
    expect(
      point.breakdown.cat.some((line) => line.source.includes("CAT_02")),
    ).toBe(false);
  });

  it("Ngũ hành Cung khắc Mệnh: ×0.75 / ×1.25", () => {
    const focus = palace({
      index: 0,
      branch: "Mão",
      name: "Điền Trạch",
      majorFortune: { order: 1, active: true, start: 35, end: 44 },
      stars: [
        { name: "Tả Phụ", layer: "helper" },
        { name: "Tham Lang", layer: "major", brightness: "Hãm" },
      ],
    });
    const point = getDaiVanTrend(
      makeChart({
        palaces: [focus],
        menhBranch: "Mùi",
        menhElement: "Lộ Bàng Thổ",
        menhIndex: 0,
        majorFortunePalace: focus,
        annualPalace: focus,
        voidMarkers: [],
        annualMutagens: [],
        natalMutagens: [],
      }),
    )[0]!;

    const catNh = point.breakdown.cat.find(
      (line) => line.source === "Ngũ Hành Vận",
    );
    const hungNh = point.breakdown.hung.find(
      (line) => line.source === "Ngũ Hành Vận",
    );
    expect(catNh?.reason).toContain("×0.75");
    expect(hungNh?.reason).toContain("×1.25");
    expect(catNh?.points).toBe(0);
    expect(hungNh?.points).toBe(0);
    expect(point.breakdown.hung.every((line) => line.points >= 0 || line.source === "Chuẩn hóa")).toBe(
      true,
    );
  });

  it("Chính tinh Đắc vào Cát; Mộ Trường Sinh vào Hung", () => {
    const focus = palace({
      index: 0,
      branch: "Ngọ",
      name: "Mệnh",
      isMenh: true,
      changSheng: "Mộ",
      majorFortune: { order: 1, active: true, start: 10, end: 19 },
      stars: [{ name: "Thiên Tướng", layer: "major", brightness: "Đắc" }],
    });
    const point = getDaiVanTrend(
      makeChart({
        palaces: [focus],
        menhBranch: "Ngọ",
        menhIndex: 0,
        majorFortunePalace: focus,
        annualPalace: focus,
        voidMarkers: [],
        annualMutagens: [],
        natalMutagens: [],
      }),
    )[0]!;
    expect(
      point.breakdown.cat.some(
        (line) => line.source.includes("Thiên Tướng") && line.points > 0,
      ),
    ).toBe(true);
    expect(
      point.breakdown.hung.some((line) => line.source.includes("Mộ")),
    ).toBe(true);
  });

  it("Đất Nhà: tam hợp Mệnh/Tài/Quan nâng W khi ĐV là Quan Lộc", () => {
    const quan = palace({
      index: 0,
      branch: "Hợi",
      name: "Quan Lộc",
      majorFortune: { order: 1, active: true, start: 46, end: 55 },
      stars: [{ name: "Vũ Khúc", layer: "major", brightness: "Bình" }],
    });
    const menh = palace({
      index: 4,
      branch: "Mùi",
      name: "Mệnh",
      isMenh: true,
      stars: [{ name: "Thiên Lương", layer: "major", brightness: "Đắc" }],
    });
    const tai = palace({
      index: 8,
      branch: "Mão",
      name: "Tài Bạch",
      stars: [{ name: "Hữu Bật", layer: "helper" }],
    });
    const point = getDaiVanTrend(
      makeChart({
        palaces: [quan, menh, tai],
        menhBranch: "Mùi",
        menhElement: "Thành Đầu Thổ",
        menhIndex: 4,
        thanIndex: 0,
        majorFortunePalace: quan,
        annualPalace: quan,
        voidMarkers: [],
        annualMutagens: [],
        natalMutagens: [],
      }),
    )[0]!;

    expect(
      point.breakdown.cat.some(
        (line) =>
          line.reason.includes("W=0.6") && line.source.includes("Thiên Lương"),
      ),
    ).toBe(true);
    expect(
      point.breakdown.cat.some(
        (line) =>
          line.reason.includes("W=0.6") && line.source.includes("Hữu Bật"),
      ),
    ).toBe(true);
  });

  it("Đất Nhà: tam hợp Thân cũng W=0.6 (không chỉ Mệnh–Tài–Quan)", () => {
    // Thân Tuất; tam hợp Thân = Tuất–Ngọ–Dần. ĐV tại Phúc Đức (Dần).
    const phuc = palace({
      index: 0,
      branch: "Dần",
      name: "Phúc Đức",
      majorFortune: { order: 1, active: true, start: 24, end: 33 },
      stars: [{ name: "Tử Vi", layer: "major", brightness: "Miếu" }],
    });
    const thienDi = palace({
      index: 4,
      branch: "Ngọ",
      name: "Thiên Di",
      stars: [{ name: "Thiên Lương", layer: "major", brightness: "Đắc" }],
    });
    const phuThe = palace({
      index: 8,
      branch: "Tuất",
      name: "Phu Thê",
      isThan: true,
      stars: [{ name: "Hữu Bật", layer: "helper" }],
    });
    const menh = palace({
      index: 2,
      branch: "Tỵ",
      name: "Mệnh",
      isMenh: true,
      stars: [],
    });
    const point = getDaiVanTrend(
      makeChart({
        palaces: [phuc, thienDi, phuThe, menh],
        menhBranch: "Tỵ",
        menhElement: "Dương Liễu Mộc",
        menhIndex: 2,
        thanIndex: 8,
        majorFortunePalace: phuc,
        annualPalace: phuc,
        voidMarkers: [],
        annualMutagens: [],
        natalMutagens: [],
      }),
    )[0]!;

    expect(
      point.breakdown.cat.some(
        (line) =>
          line.reason.includes("W=0.6") && line.source.includes("Thiên Lương"),
      ),
    ).toBe(true);
    expect(
      point.breakdown.cat.some(
        (line) =>
          line.reason.includes("W=0.6") && line.source.includes("Hữu Bật"),
      ),
    ).toBe(true);
  });

  it("Tam Hóa Liên Châu vẫn thưởng Cát dù TP4C có Địa Không/Kiếp", () => {
    const focus = palace({
      index: 0,
      branch: "Ngọ",
      name: "Mệnh",
      isMenh: true,
      majorFortune: { order: 1, active: true, start: 10, end: 19 },
      stars: [
        {
          name: "Hóa Lộc",
          layer: "helper",
          source: "natal-mutagen",
          mutagen: "Lộc",
        },
        {
          name: "Hóa Quyền",
          layer: "helper",
          source: "natal-mutagen",
          mutagen: "Quyền",
        },
        {
          name: "Hóa Khoa",
          layer: "helper",
          source: "natal-mutagen",
          mutagen: "Khoa",
        },
        { name: "Địa Không", layer: "harm" },
        { name: "Địa Kiếp", layer: "harm" },
      ],
    });
    const point = getDaiVanTrend(
      makeChart({
        palaces: [focus],
        menhBranch: "Ngọ",
        menhIndex: 0,
        majorFortunePalace: focus,
        annualPalace: focus,
        voidMarkers: [],
        annualMutagens: [],
        natalMutagens: [
          { mutagen: "Lộc", starName: "Hóa Lộc", palace: focus },
          { mutagen: "Quyền", starName: "Hóa Quyền", palace: focus },
          { mutagen: "Khoa", starName: "Hóa Khoa", palace: focus },
        ],
      }),
    )[0]!;

    expect(
      point.breakdown.cat.some((line) => line.source.includes("CAT_03")),
    ).toBe(true);
    expect(
      point.breakdown.hung.some(
        (line) =>
          line.source.includes("Địa Không") || line.source.includes("Địa Kiếp"),
      ),
    ).toBe(true);
  });

  it("Đại vận chấm TP4C: Hóa Kỵ gốc ở xung + chính tinh hãm ở tam hợp", () => {
    const menh = palace({
      index: 0,
      branch: "Thìn",
      name: "Mệnh",
      isMenh: true,
      majorFortune: { order: 1, active: true, start: 10, end: 19 },
      stars: [{ name: "Tử Vi", layer: "major", brightness: "Vượng" }],
    });
    const di = palace({
      index: 6,
      branch: "Tuất",
      name: "Thiên Di",
      stars: [{ name: "Hóa Kỵ", source: "natal-mutagen", mutagen: "Kỵ" }],
    });
    const quan = palace({
      index: 3,
      branch: "Thân",
      name: "Quan Lộc",
      stars: [{ name: "Cự Môn", layer: "major", brightness: "Hãm" }],
    });
    const point = getDaiVanTrend(
      makeChart({
        palaces: [menh, di, quan],
        menhBranch: "Thìn",
        menhIndex: 0,
        majorFortunePalace: menh,
        annualPalace: menh,
        voidMarkers: [],
        annualMutagens: [],
        natalMutagens: [{ mutagen: "Kỵ", starName: "Cự Môn", palace: di }],
        majorMutagens: [],
      }),
    )[0]!;

    expect(
      point.breakdown.hung.some(
        (line) =>
          line.reason.includes("xung chiếu") && line.reason.includes("Kỵ"),
      ),
    ).toBe(true);
    expect(
      point.breakdown.hung.some(
        (line) =>
          line.reason.includes("tam hợp") &&
          line.reason.includes("Hãm") &&
          line.source.includes("Cự Môn"),
      ),
    ).toBe(true);
    expect(
      point.breakdown.cat.some(
        (line) =>
          line.reason.includes("cung hạn") && line.source.includes("Tử Vi"),
      ),
    ).toBe(true);
  });
});
