import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Các file dùng Tailwind utility trực tiếp cho bề mặt (không phải Tử Vi —
// tu-vi.css/CompactChart/MobileChart đã có hệ token riêng tự nhất quán, và
// không phải nội dung Kinh Dịch — HTML tĩnh legacy tự mang <style> riêng).
const TARGET_FILES = [
  "src/components/shared/HomePage.tsx",
  "src/components/bazi/BaziPage.tsx",
  "src/components/bazi/BaziChart.tsx",
  "src/components/bazi/AnnualYearsTable.tsx",
  "src/components/shared/SupportButton.tsx",
];

describe("page scheme — bề mặt component trỏ token, không rải rác", () => {
  for (const relPath of TARGET_FILES) {
    it(`${relPath} không còn bg-white/, border-white/, hoặc hex #0d0b14 rời`, () => {
      const source = readFileSync(resolve(process.cwd(), relPath), "utf8");
      expect(source).not.toMatch(/bg-white\//);
      expect(source).not.toMatch(/border-white\//);
      expect(source).not.toMatch(/#0d0b14/);
    });
  }
});
