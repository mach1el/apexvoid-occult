/**
 * Minor-star catalog V1.1 — coverage gate + special regressions.
 * See integration-prompt.md "Evidence collection" / "Coverage tests" /
 * "Special regression tests".
 */
import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { calculate as calculateTrungChau } from "@/lib/ziwei/engine-trung-chau";
import { normalizeNatalFacts } from "@/lib/ziwei/analysis/facts";
import { loadPalaceOverviewKnowledgeV1 } from "@/lib/ziwei/analysis/knowledge";
import { analyzeAllPalaces } from "@/lib/ziwei/analysis/modules/palace-overview";
import type { BirthInput, School } from "@/types/chart";

const HOUR_BRANCHES = [
  "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ",
  "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi",
] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Compact pairwise matrix — 60 consecutive birth years = LCM(10 stems, 12
 * branches), cycling month 1–12, all 12 hour branches, alternating gender.
 * Not a full Cartesian product (not required by spec).
 */
function buildMatrixInputs(): BirthInput[] {
  const inputs: BirthInput[] = [];
  for (let i = 0; i < 60; i++) {
    const year = 1965 + i;
    const month = (i % 12) + 1;
    const day = 5 + (i % 20);
    const hour = HOUR_BRANCHES[i % 12]!;
    inputs.push({
      solarDate: `${year}-${pad(month)}-${pad(day)}`,
      birthHour: hour,
      gender: i % 2 === 0 ? "male" : "female",
      timezone: "7",
      annualYear: "2026",
      flowBase: "luu-nien",
    });
  }
  return inputs;
}

const SCHOOLS: Array<{ school: School; calculate: typeof calculateNamPhai }> = [
  { school: "nam-phai", calculate: calculateNamPhai },
  { school: "trung-chau", calculate: calculateTrungChau },
];

describe("minor-star catalog V1.1 — matrix coverage gate", () => {
  it("unknown static minor stars = 0 across the representative matrix", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const catalogNames = new Set(
      loaded.knowledge.minorStars.stars.map((s) => s.canonicalName),
    );

    const inputs = buildMatrixInputs();
    const unknown = new Set<string>();
    const observed = new Set<string>();
    const contextOnlyObserved = new Set<string>();
    const aliasesExercised = new Set<string>();
    const observedBySchool: Record<School, Set<string>> = {
      "nam-phai": new Set(),
      "trung-chau": new Set(),
    };
    let chartCount = 0;

    for (const { school, calculate } of SCHOOLS) {
      for (const input of inputs) {
        const chart = calculate(input);
        const { facts } = normalizeNatalFacts(chart, { school });
        chartCount += 1;

        for (const fact of facts) {
          if (fact.kind !== "star" || fact.starClass === "major") continue;
          const name = fact.canonicalStarName;
          if (!name) continue;

          if (fact.starName && fact.starName !== name) {
            aliasesExercised.add(`${fact.starName}→${name}`);
          }

          if (!catalogNames.has(name)) {
            unknown.add(name);
            continue;
          }
          observed.add(name);
          observedBySchool[school].add(name);

          const record = loaded.knowledge.minorStars.stars.find(
            (s) => s.canonicalName === name,
          )!;
          if (record.scoringMode === "context-only") {
            contextOnlyObserved.add(name);
          }
        }
      }
    }

    const unobserved = [...catalogNames].filter((n) => !observed.has(n));

    // Non-blocking report for PR.
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        chartCount,
        observedCatalogStars: observed.size,
        unobservedCatalogStars: unobserved.length,
        unobserved,
        starsBySchool: {
          "nam-phai": observedBySchool["nam-phai"].size,
          "trung-chau": observedBySchool["trung-chau"].size,
        },
        contextOnlyObserved: [...contextOnlyObserved],
        aliasesExercised: [...aliasesExercised],
        unknownStaticMinorStars: [...unknown],
      }),
    );

    expect(chartCount).toBe(120);
    expect([...unknown]).toEqual([]);
  });
});

describe("minor-star catalog V1.1 — special regressions", () => {
  const REGRESSION: BirthInput = {
    solarDate: "1991-09-21",
    birthHour: "Dậu",
    gender: "female",
    timezone: "7",
    annualYear: "2026",
    flowBase: "luu-nien",
  };

  it("Lưu Hà is catalogued and scored as natal standard-pressure", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const record = loaded.knowledge.minorStars.stars.find(
      (s) => s.canonicalName === "Lưu Hà",
    );
    expect(record).toBeDefined();
    expect(record!.scoringMode).toBe("direct");
    expect(record!.familyId).toBe("standard-pressure");
  });

  it("Lưu Thiên Mã is excluded as temporal (never a static fact)", () => {
    const chart = calculateNamPhai(REGRESSION);
    const { facts } = normalizeNatalFacts(chart, { school: "nam-phai" });
    expect(facts.some((f) => f.starName === "Lưu Thiên Mã")).toBe(false);
  });

  it("Hoa Cái uses symbolic-prestige, not romance/visibility", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const record = loaded.knowledge.minorStars.stars.find(
      (s) => s.canonicalName === "Hoa Cái",
    );
    expect(record?.familyId).toBe("symbolic-prestige");
  });

  it("Thiên Không uses strong-pressure, not major-malefic (distinct from Địa Không)", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const thienKhong = loaded.knowledge.minorStars.stars.find(
      (s) => s.canonicalName === "Thiên Không",
    );
    const diaKhong = loaded.knowledge.minorStars.stars.find(
      (s) => s.canonicalName === "Địa Không",
    );
    expect(thienKhong?.familyId).toBe("strong-pressure");
    expect(diaKhong?.familyId).toBe("major-malefic");
  });

  it("Đẩu Quân is known but context-only; Phàn An/Tức Thần are known Trung Châu context-only", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const byName = (name: string) =>
      loaded.knowledge.minorStars.stars.find((s) => s.canonicalName === name);
    expect(byName("Đẩu Quân")?.scoringMode).toBe("context-only");
    expect(byName("Phàn An")?.scoringMode).toBe("context-only");
    expect(byName("Phàn An")?.schoolProfiles).toEqual(["trung-chau-v1"]);
    expect(byName("Tức Thần")?.scoringMode).toBe("context-only");
    expect(byName("Tức Thần")?.schoolProfiles).toEqual(["trung-chau-v1"]);
  });

  it("context-only stars resolve as known and never produce minor-star-family evidence", () => {
    const chart = calculateTrungChau(REGRESSION);
    const { results } = analyzeAllPalaces(chart, { school: "trung-chau" });
    const contextNames = new Set(
      results.flatMap((r) => r.contextOnlyStars.map((s) => s.name)),
    );
    for (const name of contextNames) {
      const asEvidence = results.some((r) =>
        r.allEvidence.some(
          (e) => e.category === "minor-star-family" && e.label === name,
        ),
      );
      expect(asEvidence).toBe(false);
    }
  });

  it("Văn Xương/Văn Khúc use literary state modifiers, not major-star modifiers", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const vanXuong = loaded.knowledge.minorStars.stars.find(
      (s) => s.canonicalName === "Văn Xương",
    );
    const vanKhuc = loaded.knowledge.minorStars.stars.find(
      (s) => s.canonicalName === "Văn Khúc",
    );
    expect(vanXuong?.brightnessPolicy).toBe("literary-if-present");
    expect(vanKhuc?.brightnessPolicy).toBe("literary-if-present");
    expect(
      loaded.knowledge.minorStateModifiers.policies["literary-if-present"],
    ).toBeDefined();
  });

  it("Hỏa/Linh use hoa-linh state modifiers only when brightness exists", () => {
    const loaded = loadPalaceOverviewKnowledgeV1();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const hoaTinh = loaded.knowledge.minorStars.stars.find(
      (s) => s.canonicalName === "Hỏa Tinh",
    );
    const linhTinh = loaded.knowledge.minorStars.stars.find(
      (s) => s.canonicalName === "Linh Tinh",
    );
    expect(hoaTinh?.brightnessPolicy).toBe("hoa-linh");
    expect(linhTinh?.brightnessPolicy).toBe("hoa-linh");
  });
});
