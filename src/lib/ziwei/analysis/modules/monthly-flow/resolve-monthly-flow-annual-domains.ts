/**
 * School-aware annual-domain adapter for Monthly Flow production.
 * Uses the public Annual Axes `selectResolver` — never another module's scores.
 */
import type { ChartData } from "../../../../../types/chart";
import type { ZiweiSchool } from "../../facts";
import {
  ANNUAL_AXIS_DOMAINS,
  type AnnualAxisDomain,
} from "../../contracts/annual-axes";
import type { AnnualAxisDefinitionsCatalog } from "../../knowledge/annual-axes";
import { selectResolver } from "../annual-axes/resolvers";
import type {
  ResolvedAnnualDomainAnchors,
  ResolvedDomainAnchor,
} from "../annual-axes/resolvers/types";

export interface MonthlyFlowAnnualDomainAdapterDiagnostics {
  incompleteChartPalaces: string[];
  duplicateNatalPalaceNames: string[];
  missingDomainAnchor: string[];
  ambiguousDomainAnchor: string[];
  incompletePrimaryMap: string[];
  missingDomainCoverage: string[];
  unresolvedAmbiguousAnchors: string[];
  notes: string[];
}

export interface MonthlyFlowAnnualDomainAdapterResult {
  ok: boolean;
  coordinate: "natal-palace-name" | "annual-palace-name";
  provenance: string;
  anchorsByDomain: ResolvedAnnualDomainAnchors["anchorsByDomain"];
  /** Compatibility map for analyzeMonthlyFlow `explicitAnnualDomainMap`. */
  primaryDomainByPalaceIndex: ReadonlyMap<number, AnnualAxisDomain> | null;
  diagnostics: MonthlyFlowAnnualDomainAdapterDiagnostics;
}

function emptyDiagnostics(): MonthlyFlowAnnualDomainAdapterDiagnostics {
  return {
    incompleteChartPalaces: [],
    duplicateNatalPalaceNames: [],
    missingDomainAnchor: [],
    ambiguousDomainAnchor: [],
    incompletePrimaryMap: [],
    missingDomainCoverage: [],
    unresolvedAmbiguousAnchors: [],
    notes: [],
  };
}

/**
 * Derive one primary domain per physical palace from resolved anchors.
 * Greatest weight wins; equal weights break by stable domain ID ascending.
 */
export function derivePrimaryDomainByPalaceIndex(
  anchorsByDomain: ReadonlyMap<AnnualAxisDomain, readonly ResolvedDomainAnchor[]>,
): {
  map: Map<number, AnnualAxisDomain>;
  unresolved: string[];
} {
  const byPalace = new Map<
    number,
    Array<{ domain: AnnualAxisDomain; weight: number }>
  >();

  for (const domain of ANNUAL_AXIS_DOMAINS) {
    const anchors = anchorsByDomain.get(domain) ?? [];
    for (const anchor of anchors) {
      const list = byPalace.get(anchor.palaceIndex) ?? [];
      list.push({ domain, weight: anchor.weight });
      byPalace.set(anchor.palaceIndex, list);
    }
  }

  const map = new Map<number, AnnualAxisDomain>();
  const unresolved: string[] = [];

  for (const [palaceIndex, candidates] of byPalace) {
    candidates.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0;
    });
    const top = candidates[0];
    if (!top) {
      unresolved.push(`palaceIndex:${palaceIndex}`);
      continue;
    }
    map.set(palaceIndex, top.domain);
  }

  return { map, unresolved };
}

/**
 * Resolve Monthly Flow annual-domain anchors via the approved Annual Axes
 * school resolver, then derive the primary-domain compatibility map.
 */
export function resolveMonthlyFlowAnnualDomains(
  chart: ChartData,
  school: ZiweiSchool,
  axisDefinitions: AnnualAxisDefinitionsCatalog,
): MonthlyFlowAnnualDomainAdapterResult {
  const diagnostics = emptyDiagnostics();
  const resolver = selectResolver(school);
  const resolved = resolver.resolve(chart, axisDefinitions);

  diagnostics.incompleteChartPalaces.push(...resolved.diagnostics.incompleteChartPalaces);
  diagnostics.duplicateNatalPalaceNames.push(...resolved.diagnostics.duplicateNatalPalaceNames);
  diagnostics.missingDomainAnchor.push(...resolved.diagnostics.missingDomainAnchor);
  diagnostics.ambiguousDomainAnchor.push(...resolved.diagnostics.ambiguousDomainAnchor);

  if (resolved.diagnostics.ambiguousDomainAnchor.length > 0) {
    diagnostics.unresolvedAmbiguousAnchors.push(
      ...resolved.diagnostics.ambiguousDomainAnchor,
    );
  }

  const { map, unresolved } = derivePrimaryDomainByPalaceIndex(resolved.anchorsByDomain);
  diagnostics.incompletePrimaryMap.push(...unresolved);

  if (chart.palaces.length !== 12) {
    diagnostics.incompleteChartPalaces.push(`palace-count=${chart.palaces.length}`);
  }

  const missingIndices: number[] = [];
  for (let i = 0; i < 12; i++) {
    if (!map.has(i)) missingIndices.push(i);
  }
  if (missingIndices.length > 0) {
    diagnostics.incompletePrimaryMap.push(
      ...missingIndices.map((i) => `palaceIndex:${i}:no-primary`),
    );
  }

  const seenDomains = new Set(map.values());
  for (const domain of ANNUAL_AXIS_DOMAINS) {
    if (!seenDomains.has(domain)) {
      diagnostics.missingDomainCoverage.push(`domain:${domain}`);
    }
  }

  const hasHardFailure =
    diagnostics.incompleteChartPalaces.length > 0 ||
    diagnostics.duplicateNatalPalaceNames.length > 0 ||
    diagnostics.missingDomainAnchor.length > 0 ||
    diagnostics.ambiguousDomainAnchor.length > 0 ||
    diagnostics.incompletePrimaryMap.length > 0 ||
    diagnostics.missingDomainCoverage.length > 0 ||
    map.size !== 12;

  if (hasHardFailure) {
    return {
      ok: false,
      coordinate: resolved.coordinate,
      provenance: resolved.provenance,
      anchorsByDomain: resolved.anchorsByDomain,
      primaryDomainByPalaceIndex: null,
      diagnostics,
    };
  }

  return {
    ok: true,
    coordinate: resolved.coordinate,
    provenance: resolved.provenance,
    anchorsByDomain: resolved.anchorsByDomain,
    primaryDomainByPalaceIndex: map,
    diagnostics,
  };
}
