import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "../../engine-nam-phai";
import regressionCases from "../../knowledge/experimental/nam-phai-monthly-v2/regression-cases.json";
import {
  evaluateCalibrationBand,
  formatCalibrationTable,
  type CalibrationBand,
  type CalibrationEvalRow,
} from "../calibration-bands";
import {
  loadFramePatternRules,
  loadNamPhaiMonthlyV2Profile,
} from "../profile/nam-phai-monthly-v2";
import { softSaturate } from "../soft-saturation";
import { getDaiVanTrend, getLuuNienTrend } from "../score";
import type { TrendPoint } from "../types";

const PROFILE = "nam-phai-monthly-v2-experimental" as const;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CALIBRATION_OUT = path.resolve(
  __dirname,
  "../../knowledge/experimental/nam-phai-monthly-v2/calibration-last-run.tsv",
);

function birthFromRegression() {
  const input = regressionCases.chart.input;
  return {
    solarDate: input.solarDate,
    birthHour: input.birthHour,
    gender: input.gender as "female",
    timezone: input.timezone,
    annualYear: input.annualYear,
    flowBase: input.flowBase,
  };
}

describe("nam-phai-monthly-v2 experimental", () => {
  it("loads profile + pattern rules once (SSOT)", () => {
    const a = loadNamPhaiMonthlyV2Profile();
    const b = loadNamPhaiMonthlyV2Profile();
    expect(a).toBe(b);
    expect(a.profileId).toBe(PROFILE);
    expect(a.version).toBe("0.1.0");
    expect(regressionCases.version).toBe("0.1.2");
    expect(loadFramePatternRules().length).toBeGreaterThan(0);
  });

  it("soft saturation formula", () => {
    expect(softSaturate(0, 65)).toBe(0);
    expect(softSaturate(65, 65)).toBe(63);
    expect(softSaturate(200, 65)).toBeLessThan(100);
    expect(softSaturate(200, 65)).toBeGreaterThan(90);
  });

  it("legacy default unchanged vs experimental opt-in", () => {
    const birthInput = birthFromRegression();
    const chart = calculateNamPhai(birthInput);
    const legacy = getLuuNienTrend(chart, {
      school: "nam-phai",
      birthInput,
    });
    const legacyExplicit = getLuuNienTrend(chart, {
      school: "nam-phai",
      birthInput,
      scoringProfile: "legacy-v1",
    });
    expect(legacy).toEqual(legacyExplicit);
    expect(legacy.every((p) => p.axes === undefined)).toBe(true);
    expect(legacy.every((p) => p.subtotals === undefined)).toBe(true);

    const experimental = getLuuNienTrend(chart, {
      school: "nam-phai",
      birthInput,
      scoringProfile: PROFILE,
    });
    for (const point of experimental) {
      expect(point.axes).toBeDefined();
      expect(point.subtotals).toBeDefined();
      expect(
        point.breakdown.cat.some((l) => l.source === "Chuẩn hóa"),
      ).toBe(false);
      expect(
        point.breakdown.hung.some((l) => l.source === "Chuẩn hóa"),
      ).toBe(false);
      expect(point.cat).toBe(point.axes!.normalized.benefit);
      expect(point.hung).toBe(point.axes!.normalized.risk);
      // Subtotal keys bắt buộc.
      expect(point.subtotals).toMatchObject({
        majorStars: expect.any(Object),
        mutagens: expect.any(Object),
        minorStarsBeforeCap: expect.any(Object),
        minorStarsAfterCap: expect.any(Object),
        voidChangSheng: expect.any(Object),
        interactions: expect.any(Object),
        majorFortuneContext: expect.any(Object),
        normalization: { benefit: 0, risk: 0 },
      });
      expect(
        point.subtotals!.minorStarsAfterCap.benefit,
      ).toBeLessThanOrEqual(
        point.subtotals!.minorStarsBeforeCap.benefit + 1e-9,
      );
    }
  });

  it("system invariants: no whole-column mult; benefit/risk independent path", () => {
    const birthInput = birthFromRegression();
    const chart = calculateNamPhai(birthInput);
    const experimental = getLuuNienTrend(chart, {
      school: "nam-phai",
      birthInput,
      scoringProfile: PROFILE,
    });
    for (const point of experimental) {
      const lines = [...point.breakdown.cat, ...point.breakdown.hung];
      expect(lines.some((l) => l.reason.includes("Nhân toàn cột"))).toBe(
        false,
      );
      // Không có dòng âm trên hung trừ khi sau này có mitigation linked (chưa có).
      expect(point.breakdown.hung.every((l) => l.points >= 0)).toBe(true);
    }
  });

  it("regression: context, rule hits, hard gates, soft preferred table", () => {
    const birthInput = birthFromRegression();
    const chart = calculateNamPhai(birthInput);
    const expected = regressionCases.chart.expectedNatalFacts;

    expect(
      chart.palaces.find((p) => p.name === "Mệnh")?.branch,
    ).toBe(expected.menh.branch);
    expect(chart.majorFortunePalace?.name).toBe(
      expected.activeMajorFortune.palace,
    );
    expect(chart.majorFortunePalace?.branch).toBe(
      expected.activeMajorFortune.branch,
    );

    const legacyMonths = getLuuNienTrend(chart, {
      school: "nam-phai",
      birthInput,
      scoringProfile: "legacy-v1",
    });
    const months = getLuuNienTrend(chart, {
      school: "nam-phai",
      birthInput,
      scoringProfile: PROFILE,
    });
    const daiVan = getDaiVanTrend(chart, undefined, {
      scoringProfile: PROFILE,
      school: "nam-phai",
    });

    const rows: CalibrationEvalRow[] = [];
    const hardErrors: string[] = [];

    for (const target of regressionCases.targets) {
      const point: TrendPoint | undefined =
        target.scope === "majorFortune"
          ? daiVan.find(
              (p) => p.label === expected.activeMajorFortune.ageRange,
            )
          : months.find((p) => p.monthNumber === target.month);
      expect(point?.axes, `${target.id} missing axes`).toBeDefined();
      expect(point?.subtotals, `${target.id} missing subtotals`).toBeDefined();

      const ctx = (
        target as {
          expectedContext?: {
            focusPalace?: string;
            focusBranch?: string;
            calendarStem?: string;
            calendarBranch?: string;
          };
        }
      ).expectedContext;
      if (ctx?.focusPalace) {
        expect(point!.focusPalaceName).toBe(ctx.focusPalace);
      }
      if (ctx?.focusBranch) {
        expect(point!.focusPalaceBranch).toBe(ctx.focusBranch);
      }
      if (ctx?.calendarStem) {
        expect(point!.calendarStem).toBe(ctx.calendarStem);
      }
      if (ctx?.calendarBranch) {
        expect(point!.calendarBranch).toBe(ctx.calendarBranch);
      }

      const required = (
        target as { requiredRuleHits?: string[] }
      ).requiredRuleHits;
      if (required?.length) {
        const sources = new Set(
          [...point!.breakdown.cat, ...point!.breakdown.hung].map(
            (l) => l.source,
          ),
        );
        for (const ruleId of required) {
          expect(sources.has(ruleId), `${target.id} missing rule ${ruleId}`).toBe(
            true,
          );
        }
      }

      const inv = (target as { invariants?: string[] }).invariants ?? [];
      for (const name of inv) {
        if (name === "riskGreaterThanBenefit") {
          expect(point!.axes!.normalized.risk).toBeGreaterThan(
            point!.axes!.normalized.benefit,
          );
        }
        if (name === "benefitLessThan100") {
          expect(point!.axes!.normalized.benefit).toBeLessThan(100);
        }
        if (name === "benefitLessThan90") {
          expect(point!.axes!.normalized.benefit).toBeLessThan(90);
        }
        if (name === "benefitNotClampedTo100") {
          expect(point!.cat).toBeLessThan(100);
        }
      }

      const legacyPoint =
        target.scope === "monthly"
          ? legacyMonths.find((p) => p.monthNumber === target.month)
          : undefined;

      const bands = (
        target as unknown as {
          calibrationBands: Record<string, CalibrationBand>;
        }
      ).calibrationBands;

      for (const axis of [
        "benefit",
        "risk",
        "activation",
        "conflict",
      ] as const) {
        const band = bands[axis];
        if (!band) continue;
        const value = point!.axes!.normalized[axis];
        const legacy =
          axis === "risk" && band.atLeastLegacy
            ? legacyPoint?.hung
            : undefined;
        const row = evaluateCalibrationBand(
          target.id,
          axis,
          value,
          band,
          legacy,
        );
        rows.push(row);
        if (row.status === "error") {
          hardErrors.push(
            `${row.targetId} ${row.axis}=${row.value} ${row.detail}`,
          );
        }
      }
    }

    const table = formatCalibrationTable(rows);
    writeFileSync(CALIBRATION_OUT, table, "utf-8");
    console.info(`[nam-phai-monthly-v2] calibration table\n${table}`);

    const warnings = rows.filter((r) => r.status === "warning");
    if (warnings.length) {
      console.warn(
        `[nam-phai-monthly-v2] calibration warnings (${warnings.length})`,
      );
    }
    const preferredMiss = rows.filter((r) => r.status === "preferred-miss");
    if (preferredMiss.length) {
      console.info(
        `[nam-phai-monthly-v2] preferred-band misses (${preferredMiss.length}) — non-blocking`,
      );
    }

    expect(hardErrors, hardErrors.join("\n")).toEqual([]);
  });
});
