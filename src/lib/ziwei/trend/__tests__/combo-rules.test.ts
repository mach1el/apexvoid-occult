import { describe, expect, it } from "vitest";
import {
  COMBO_RULES,
  EXCLUDED_MEDICAL_COMBO_IDS,
  comboRuleById,
} from "../combo-rules";
import { findStarScore } from "../star-scores";

describe("combo-rules catalog", () => {
  it("ID không trùng", () => {
    const ids = COMBO_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("không chứa rule y tế/tử vong bị cấm", () => {
    for (const id of EXCLUDED_MEDICAL_COMBO_IDS) {
      expect(comboRuleById(id)).toBeUndefined();
    }
  });

  it("điểm không âm; SPEC override được phép points=0", () => {
    for (const rule of COMBO_RULES) {
      expect(rule.points).toBeGreaterThanOrEqual(0);
      if (rule.id.startsWith("SPEC_") && rule.effect) {
        // override-only ok
        continue;
      }
      if (rule.id === "SPEC_04" || rule.id === "SPEC_05") {
        expect(rule.points).toBe(0);
      }
    }
  });

  it("sao tên trong điều kiện phổ biến có trong CSV", () => {
    for (const name of [
      "Tử Vi",
      "Tham Lang",
      "Phá Quân",
      "Thất Sát",
      "Hóa Khoa",
      "Hóa Kỵ",
      "Lộc Tồn",
      "Thiên Mã",
    ]) {
      expect(findStarScore(name), name).toBeDefined();
    }
  });
});
