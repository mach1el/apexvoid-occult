import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeMajorFortune } from "../../analyze";
import type { MajorFortuneAxisResult, MajorFortuneScoringResult } from "../../types";
import { calculateChart } from "./corpus";

export interface MajorFortuneV01FrozenControlCase {
  caseId: string;
  school: "nam-phai" | "trung-chau";
  input: {
    solarDate: string;
    birthHour: string;
    gender: "male" | "female";
    timezone: string;
    annualYear: string;
    flowBase: "luu-nien";
  };
  expected: {
    status: MajorFortuneScoringResult["status"];
    cycle: MajorFortuneScoringResult["cycle"];
    domainsStatus: MajorFortuneScoringResult["domainsStatus"];
    versions: MajorFortuneScoringResult["versions"];
    overall: unknown;
    domains: Record<string, unknown>;
    diagnosticsSummary: Record<string, number>;
  };
}

function axisSlice(axis: MajorFortuneAxisResult | undefined): unknown {
  if (!axis) return null;
  if (axis.status !== "available") {
    return { status: axis.status, reasonCodes: axis.reasonCodes };
  }
  return {
    status: axis.status,
    score: axis.score,
    band: axis.band,
    rawAxes: axis.rawAxes,
    normalizedAxes: axis.normalizedAxes,
    intensity: axis.intensity,
    conflict: axis.conflict,
    evidenceIdentities: axis.evidence
      .map((e) => `${e.category}|${e.physicalFactId}|${e.ruleId}|${e.targetPalaceIndex}`)
      .sort(),
    topSupportIds: axis.topSupportDrivers.map((e) => e.id).sort(),
    topPressureIds: axis.topPressureDrivers.map((e) => e.id).sort(),
  };
}

function stableV01Slice(result: MajorFortuneScoringResult): MajorFortuneV01FrozenControlCase["expected"] {
  const domains: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(result.domains)) {
    domains[k] = axisSlice(v);
  }
  const diagnosticsSummary: Record<string, number> = {};
  for (const [k, v] of Object.entries(result.diagnostics)) {
    diagnosticsSummary[k] = Array.isArray(v) ? v.length : 0;
  }
  return {
    status: result.status,
    cycle: result.cycle,
    domainsStatus: result.domainsStatus,
    versions: result.versions,
    overall: axisSlice(result.overall),
    domains,
    diagnosticsSummary,
  };
}

export function buildMajorFortuneV01FrozenControlCases(): MajorFortuneV01FrozenControlCase[] {
  const seeds = [
    {
      caseId: "v01-np-regression-1991",
      school: "nam-phai" as const,
      input: {
        solarDate: "1991-09-21",
        birthHour: "Dậu",
        gender: "female" as const,
        timezone: "7",
        annualYear: "2026",
        flowBase: "luu-nien" as const,
      },
    },
    {
      caseId: "v01-tc-regression-1991",
      school: "trung-chau" as const,
      input: {
        solarDate: "1991-09-21",
        birthHour: "Dậu",
        gender: "female" as const,
        timezone: "7",
        annualYear: "2026",
        flowBase: "luu-nien" as const,
      },
    },
    {
      caseId: "v01-np-male-1980",
      school: "nam-phai" as const,
      input: {
        solarDate: "1980-03-15",
        birthHour: "Tý",
        gender: "male" as const,
        timezone: "7",
        annualYear: "2020",
        flowBase: "luu-nien" as const,
      },
    },
    {
      caseId: "v01-tc-male-1980",
      school: "trung-chau" as const,
      input: {
        solarDate: "1980-03-15",
        birthHour: "Tý",
        gender: "male" as const,
        timezone: "7",
        annualYear: "2020",
        flowBase: "luu-nien" as const,
      },
    },
  ];

  return seeds.map((seed) => {
    const chart = calculateChart(seed.school, seed.input);
    const result = analyzeMajorFortune(chart, { school: seed.school });
    return {
      caseId: seed.caseId,
      school: seed.school,
      input: seed.input,
      expected: stableV01Slice(result),
    };
  });
}

const FIXTURE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/v01-frozen-control.e57cf2c.json",
);

export function loadMajorFortuneV01FrozenControlFixture(): {
  frozenFromBaseSha: string;
  cases: MajorFortuneV01FrozenControlCase[];
} {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as {
    frozenFromBaseSha: string;
    cases: MajorFortuneV01FrozenControlCase[];
  };
}

export function compareV01AgainstFrozen(): {
  v01Deterministic: boolean;
  v01FrozenControlEquivalent: boolean;
  failures: string[];
} {
  const fixture = loadMajorFortuneV01FrozenControlFixture();
  const failures: string[] = [];
  let v01Deterministic = true;
  let v01FrozenControlEquivalent = true;

  for (const c of fixture.cases) {
    const chart = calculateChart(c.school, c.input);
    const a = analyzeMajorFortune(chart, { school: c.school });
    const b = analyzeMajorFortune(chart, { school: c.school });
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      v01Deterministic = false;
      failures.push(`deterministic:${c.caseId}`);
    }
    const slice = stableV01Slice(a);
    if (JSON.stringify(slice) !== JSON.stringify(c.expected)) {
      v01FrozenControlEquivalent = false;
      failures.push(`frozen-control:${c.caseId}`);
    }
  }

  return { v01Deterministic, v01FrozenControlEquivalent, failures };
}
