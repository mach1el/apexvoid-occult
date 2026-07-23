import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { calculate as calculateTrungChau } from "@/lib/ziwei/engine-trung-chau";
import { ANNUAL_AXIS_DOMAINS } from "../../../contracts/annual-axes";
import { loadAnnualAxesKnowledgeV0 } from "../../../knowledge/annual-axes";
import {
  derivePrimaryDomainByPalaceIndex,
  resolveMonthlyFlowAnnualDomains,
} from "../resolve-monthly-flow-annual-domains";
import { REGRESSION_BIRTH } from "./test-providers";
import type { ResolvedDomainAnchor } from "../../annual-axes/resolvers/types";
import type { AnnualAxisDomain } from "../../../contracts/annual-axes";

describe("resolveMonthlyFlowAnnualDomains", () => {
  const loaded = loadAnnualAxesKnowledgeV0();
  if (!loaded.ok) throw new Error("annual axes knowledge required");
  const axisDefinitions = loaded.knowledge.axisDefinitions;

  it("resolves Nam Phái via natal palace names", () => {
    const chart = calculateNamPhai(REGRESSION_BIRTH);
    const result = resolveMonthlyFlowAnnualDomains(chart, "nam-phai", axisDefinitions);
    expect(result.ok).toBe(true);
    expect(result.coordinate).toBe("natal-palace-name");
    expect(result.provenance).toBe("nam-phai-natal-domain-anchor");
    expect(result.primaryDomainByPalaceIndex?.size).toBe(12);
    for (let i = 0; i < 12; i++) {
      expect(result.primaryDomainByPalaceIndex!.has(i)).toBe(true);
    }
    const domains = new Set(result.primaryDomainByPalaceIndex!.values());
    for (const d of ANNUAL_AXIS_DOMAINS) expect(domains.has(d)).toBe(true);
  });

  it("resolves Trung Châu via annual palace names", () => {
    const chart = calculateTrungChau(REGRESSION_BIRTH);
    const result = resolveMonthlyFlowAnnualDomains(chart, "trung-chau", axisDefinitions);
    expect(result.ok).toBe(true);
    expect(result.coordinate).toBe("annual-palace-name");
    expect(result.provenance).toBe("trung-chau-annual-palace-name");
    expect(result.primaryDomainByPalaceIndex?.size).toBe(12);
  });

  it("preserves anchor weights and provenance", () => {
    const chart = calculateNamPhai(REGRESSION_BIRTH);
    const result = resolveMonthlyFlowAnnualDomains(chart, "nam-phai", axisDefinitions);
    for (const domain of ANNUAL_AXIS_DOMAINS) {
      const anchors = result.anchorsByDomain.get(domain) ?? [];
      for (const a of anchors) {
        expect(a.weight).toBeGreaterThan(0);
        expect(a.provenance).toBe("nam-phai-natal-domain-anchor");
      }
    }
  });

  it("breaks equal-weight ties by stable domain ID", () => {
    const anchorsByDomain = new Map<AnnualAxisDomain, ResolvedDomainAnchor[]>([
      [
        "health",
        [
          {
            annualPalaceName: "A",
            palaceIndex: 0,
            weight: 1,
            provenance: "test",
          },
        ],
      ],
      [
        "career",
        [
          {
            annualPalaceName: "B",
            palaceIndex: 0,
            weight: 1,
            provenance: "test",
          },
        ],
      ],
    ]);
    const { map } = derivePrimaryDomainByPalaceIndex(anchorsByDomain);
    expect(map.get(0)).toBe("career");
  });

  it("rejects incomplete charts (missing palaces)", () => {
    const chart = calculateNamPhai(REGRESSION_BIRTH);
    const broken = {
      ...chart,
      palaces: chart.palaces.slice(0, 10),
    };
    const result = resolveMonthlyFlowAnnualDomains(broken, "nam-phai", axisDefinitions);
    expect(result.ok).toBe(false);
    expect(result.primaryDomainByPalaceIndex).toBeNull();
  });

  it("does not mutate chart input", () => {
    const chart = calculateNamPhai(REGRESSION_BIRTH);
    const before = JSON.stringify({
      annualYear: chart.annualYear,
      names: chart.palaces.map((p) => p.name),
      indices: chart.palaces.map((p) => p.index),
    });
    resolveMonthlyFlowAnnualDomains(chart, "nam-phai", axisDefinitions);
    const after = JSON.stringify({
      annualYear: chart.annualYear,
      names: chart.palaces.map((p) => p.name),
      indices: chart.palaces.map((p) => p.index),
    });
    expect(after).toBe(before);
  });

  it("does not cross-school fallback (Nam Phái chart with Trung Châu school still uses Trung Châu resolver semantics)", () => {
    const chart = calculateNamPhai(REGRESSION_BIRTH);
    // Nam Phái charts lack annualPalaceName → Trung Châu resolver fails closed.
    const result = resolveMonthlyFlowAnnualDomains(chart, "trung-chau", axisDefinitions);
    expect(result.ok).toBe(false);
    expect(result.coordinate).toBe("annual-palace-name");
    expect(result.provenance).toBe("trung-chau-annual-palace-name");
  });
});
