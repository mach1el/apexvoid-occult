/**
 * Isolation / hygiene locks for the Huyền Khí research-preview module.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildHuyenKhiPreview } from "../build-preview";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";

const ROOT = join(
  process.cwd(),
  "src/lib/ziwei/analysis/modules/huyen-khi-preview",
);

function walkProductionFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "__tests__") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkProductionFiles(full, out);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const FORBIDDEN_IMPORT_TOKENS = [
  "palace-overview",
  "annual-axes",
  "major-fortune",
  "monthly-flow",
  "analyzeAllPalaces",
  "analyzeAnnualAxes",
  "analyzeMajorFortune",
  "analyzeMonthlyFlow",
  "research/huyen-khi",
  "fetch(",
  "XMLHttpRequest",
];

const FORBIDDEN_NUMERIC_KEY =
  /\b(score|weight|factor|coefficient|delta|multiplier|percentage|support|pressure|stability|activation)\b/i;

describe("huyen-khi-preview isolation", () => {
  const files = walkProductionFiles(ROOT);

  it("finds production sources", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("does not import sibling analysis modules, research JSON, or network", () => {
    const hits: string[] = [];
    for (const path of files) {
      const text = readFileSync(path, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      for (const token of FORBIDDEN_IMPORT_TOKENS) {
        if (text.includes(token)) hits.push(`${path}: ${token}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("rejects forbidden numeric/score key identifiers in production sources", () => {
    const hits: string[] = [];
    for (const path of files) {
      const text = readFileSync(path, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        if (FORBIDDEN_NUMERIC_KEY.test(line)) {
          hits.push(`${path}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });

  it("serialized preview JSON has no forbidden numeric keys", () => {
    const chart = calculateNamPhai({
      solarDate: "1991-09-21",
      birthHour: "Dậu",
      gender: "female",
      timezone: "7",
      annualYear: "2026",
      flowBase: "luu-nien",
    });
    const result = buildHuyenKhiPreview(chart, { school: "nam-phai" });
    const json = JSON.stringify(result);
    expect(FORBIDDEN_NUMERIC_KEY.test(json)).toBe(false);
  });
});
