/**
 * Golden test — chạy trong `npm test`/CI. So kết quả calculate() của 2 engine
 * TS hiện hành với snapshot đã đóng băng ở tests/golden/tuvi-*.json (sinh từ
 * engine JS gốc, xem scripts/gen-tuvi-golden.ts). Từ nay đổi engine mà lệch
 * lá số sẽ đỏ ngay ở đây, không phải chờ phát hiện thủ công.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "./engine-nam-phai";
import { calculate as calculateTrungChau } from "./engine-trung-chau";
import type { BirthInput } from "@/types/chart";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/golden/ nằm ở gốc repo, ngoài src/ -- đọc bằng fs thay vì `import ... from`
// để không phụ thuộc vào cách tsconfig.app.json xử lý file ngoài "include": ["src"].
const GOLDEN_DIR = path.resolve(__dirname, "../../../tests/golden");

interface GoldenCaseRecord {
  id: string;
  label: string;
  input: BirthInput;
  output: unknown;
}

interface GoldenFile {
  cases: GoldenCaseRecord[];
}

function loadGolden(school: "nam-phai" | "trung-chau"): GoldenFile {
  const raw = readFileSync(path.join(GOLDEN_DIR, `tuvi-${school}.json`), "utf-8");
  return JSON.parse(raw) as GoldenFile;
}

/**
 * Bản sao của decycle() trong scripts/gen-tuvi-golden.ts (xem H6: mỗi
 * palace.flowMonths[i].palace trỏ ngược lại chính palace đó -- tham chiếu vòng
 * có thật ở runtime). Snapshot đã được decycle khi sinh, nên output tính lại
 * ở đây cũng phải decycle giống hệt trước khi so sánh.
 */
function decycle(root: unknown): unknown {
  const seen = new Map<object, string>();
  function walk(value: unknown, pathStr: string): unknown {
    if (value === null || typeof value !== "object") return value;
    const obj = value as object;
    const existing = seen.get(obj);
    if (existing) return { $ref: existing };
    seen.set(obj, pathStr);
    if (Array.isArray(obj)) {
      return obj.map((item, i) => walk(item, `${pathStr}[${i}]`));
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      out[key] = walk((obj as Record<string, unknown>)[key], `${pathStr}.${key}`);
    }
    return out;
  }
  return walk(root, "$");
}

describe.each([
  { school: "nam-phai" as const, calculate: calculateNamPhai },
  { school: "trung-chau" as const, calculate: calculateTrungChau },
])("golden snapshot: $school", ({ school, calculate }) => {
  const golden = loadGolden(school);

  it("has golden cases to check", () => {
    expect(golden.cases.length).toBeGreaterThan(0);
  });

  it.each(golden.cases)("case $id ($label) matches golden snapshot", (goldenCase) => {
    const actual = decycle(calculate(goldenCase.input));
    expect(actual).toEqual(goldenCase.output);
  });
});
