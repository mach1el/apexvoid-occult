import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { ANNUAL_AXIS_DOMAINS, type AnnualAxisDomain } from "../../../contracts/annual-axes";
import type { AnnualAxesKnowledgeV05NamPhai } from "../../../knowledge/annual-axes/v0.5";
import {
  buildAuditBirthInputs,
  expandAnnualYears,
  FULL_CORPUS_CONTRACT,
  type AuditCorpusContract,
} from "./build-audit-corpus";
import {
  splitChartIndices,
  stableChartId,
} from "../../../knowledge/annual-axes/v0.5/derive-calibration";
import { scoreV05ChartDomains } from "../nam-phai-v05/score-chart";
import type { AnnualAxisEvidence } from "../types";
import type { V051DomainSample, V051EvidenceMassBreakdown, V051Split } from "./v051-types";
import {
  addEvidenceRow,
  mergeEvidenceBreakdown,
  sumBreakdownCount,
  sumBreakdownPressure,
  sumBreakdownSupport,
} from "./v051-evidence-mass";

export interface EvidenceDimensionAggregate {
  directSupportRaw: number;
  directPressureRaw: number;
  tp4cSupportRaw: number;
  tp4cPressureRaw: number;
  retainedSignedCount: number;
  retainedActivationCount: number;
  totalSupportRaw: number;
  totalPressureRaw: number;
  sourceMembershipCount: number;
  meanSourceIdsPerRetainedFact: number;
  byLayer: Record<string, V051EvidenceMassBreakdown>;
  byCategory: Record<string, V051EvidenceMassBreakdown>;
  byGeometryBucket: Record<string, V051EvidenceMassBreakdown>;
  bySourceId: Record<string, V051EvidenceMassBreakdown>;
  byRuleId: Record<string, V051EvidenceMassBreakdown>;
  byStackingGroup: Record<string, V051EvidenceMassBreakdown>;
  byOwnershipRole: Record<string, V051EvidenceMassBreakdown>;
}

export function evidenceMassFromRows(evidence: AnnualAxisEvidence[]): EvidenceDimensionAggregate {
  let directSupportRaw = 0;
  let directPressureRaw = 0;
  let tp4cSupportRaw = 0;
  let tp4cPressureRaw = 0;
  let retainedSignedCount = 0;
  let retainedActivationCount = 0;
  let sourceMembershipCount = 0;
  const byLayer: Record<string, V051EvidenceMassBreakdown> = {};
  const byCategory: Record<string, V051EvidenceMassBreakdown> = {};
  const byGeometryBucket: Record<string, V051EvidenceMassBreakdown> = {};
  const bySourceId: Record<string, V051EvidenceMassBreakdown> = {};
  const byRuleId: Record<string, V051EvidenceMassBreakdown> = {};
  const byStackingGroup: Record<string, V051EvidenceMassBreakdown> = {};
  const byOwnershipRole: Record<string, V051EvidenceMassBreakdown> = {};

  for (const e of evidence) {
    const support = Math.max(0, e.weightedAxes.support);
    const pressure = Math.max(0, e.weightedAxes.pressure);
    const bucket = e.geometryBucket ?? "unknown";
    const isDirect = bucket === "direct";
    const isTp4c = bucket === "tp4c";

    if (e.retainedForActivation) retainedActivationCount += 1;

    if (e.retainedForSignedScore) {
      retainedSignedCount += 1;
      if (isDirect) {
        directSupportRaw += support;
        directPressureRaw += pressure;
      } else if (isTp4c) {
        tp4cSupportRaw += support;
        tp4cPressureRaw += pressure;
      }

      addEvidenceRow(byLayer, e.layer, support, pressure);
      addEvidenceRow(byCategory, e.category, support, pressure);
      addEvidenceRow(byGeometryBucket, bucket, support, pressure);
      addEvidenceRow(byRuleId, e.ruleId, support, pressure);
      addEvidenceRow(byStackingGroup, e.stackingGroup, support, pressure);
      addEvidenceRow(byOwnershipRole, e.ownershipRole ?? "unknown", support, pressure);
      for (const sid of e.sourceIds) {
        addEvidenceRow(bySourceId, sid, support, pressure);
        sourceMembershipCount += 1;
      }
    }
  }

  const totalSupportRaw = directSupportRaw + tp4cSupportRaw;
  const totalPressureRaw = directPressureRaw + tp4cPressureRaw;

  return {
    directSupportRaw,
    directPressureRaw,
    tp4cSupportRaw,
    tp4cPressureRaw,
    retainedSignedCount,
    retainedActivationCount,
    totalSupportRaw,
    totalPressureRaw,
    sourceMembershipCount,
    meanSourceIdsPerRetainedFact:
      retainedSignedCount > 0 ? sourceMembershipCount / retainedSignedCount : 0,
    byLayer,
    byCategory,
    byGeometryBucket,
    bySourceId,
    byRuleId,
    byStackingGroup,
    byOwnershipRole,
  };
}

export interface CollectV051SamplesOptions {
  contract?: AuditCorpusContract;
  chartIndices?: number[];
  split?: V051Split;
  activationScaleOverride?: number;
  domainScaleOverride?: Partial<Record<AnnualAxisDomain, number>>;
}

export function collectV051Samples(
  knowledge: AnnualAxesKnowledgeV05NamPhai,
  options: CollectV051SamplesOptions = {},
): V051DomainSample[] {
  const contract = options.contract ?? FULL_CORPUS_CONTRACT;
  const bases = buildAuditBirthInputs(contract);
  const chartIndices =
    options.chartIndices ??
    Array.from({ length: contract.chartCount }, (_, i) => i);
  const { training, holdout } = splitChartIndices(contract.chartCount);
  const trainingSet = new Set(training);
  const holdoutSet = new Set(holdout);

  const samples: V051DomainSample[] = [];

  for (const chartIndex of chartIndices) {
    const base = bases[chartIndex];
    if (!base) continue;
    const chartId = stableChartId(contract, chartIndex);
    const split: V051Split = trainingSet.has(chartIndex)
      ? "training"
      : holdoutSet.has(chartIndex)
        ? "holdout"
        : (options.split ?? "full");

    for (const yearly of expandAnnualYears(
      base,
      contract.baseAnnualYear,
      contract.yearsPerChart,
    )) {
      const chart = calculateNamPhai(yearly);
      const domains = scoreV05ChartDomains(chart, knowledge, {
        activationScaleOverride: options.activationScaleOverride,
        domainScaleOverride: options.domainScaleOverride,
      });
      if (!domains) continue;

      for (const d of domains) {
        const trace = d.aggregate.spatialBudgetTrace;
        const masses = evidenceMassFromRows(d.aggregate.evidence);
        samples.push({
          chartId,
          chartIndex,
          split,
          annualYear: chart.annualYear,
          domain: d.domain,
          score: d.score,
          spatialSigned: d.spatialSigned,
          latent: d.latent,
          activationGate: d.activationGate,
          annualActivationRaw: d.annualActivationRaw,
          natalGain: d.natalGain,
          domainScale: d.trace.domainScale,
          directSupportRaw: masses.directSupportRaw,
          directPressureRaw: masses.directPressureRaw,
          tp4cSupportRaw: masses.tp4cSupportRaw,
          tp4cPressureRaw: masses.tp4cPressureRaw,
          tp4cContributionAbs: Math.abs(trace.tp4cContribution ?? 0),
          retainedSignedCount: masses.retainedSignedCount,
          retainedActivationCount: masses.retainedActivationCount,
        });
      }
    }
  }

  return samples;
}

export function aggregateEvidenceDimensions(
  knowledge: AnnualAxesKnowledgeV05NamPhai,
  chartIndices: number[],
): EvidenceDimensionAggregate {
  const contract = FULL_CORPUS_CONTRACT;
  const bases = buildAuditBirthInputs(contract);
  const merged: EvidenceDimensionAggregate = {
    directSupportRaw: 0,
    directPressureRaw: 0,
    tp4cSupportRaw: 0,
    tp4cPressureRaw: 0,
    retainedSignedCount: 0,
    retainedActivationCount: 0,
    totalSupportRaw: 0,
    totalPressureRaw: 0,
    sourceMembershipCount: 0,
    meanSourceIdsPerRetainedFact: 0,
    byLayer: {},
    byCategory: {},
    byGeometryBucket: {},
    bySourceId: {},
    byRuleId: {},
    byStackingGroup: {},
    byOwnershipRole: {},
  };

  for (const chartIndex of chartIndices) {
    const base = bases[chartIndex];
    if (!base) continue;
    for (const yearly of expandAnnualYears(
      base,
      contract.baseAnnualYear,
      contract.yearsPerChart,
    )) {
      const chart = calculateNamPhai(yearly);
      const domains = scoreV05ChartDomains(chart, knowledge);
      if (!domains) continue;
      for (const d of domains) {
        const m = evidenceMassFromRows(d.aggregate.evidence);
        merged.directSupportRaw += m.directSupportRaw;
        merged.directPressureRaw += m.directPressureRaw;
        merged.tp4cSupportRaw += m.tp4cSupportRaw;
        merged.tp4cPressureRaw += m.tp4cPressureRaw;
        merged.retainedSignedCount += m.retainedSignedCount;
        merged.retainedActivationCount += m.retainedActivationCount;
        merged.sourceMembershipCount += m.sourceMembershipCount;
        for (const [k, v] of Object.entries(m.byLayer)) {
          mergeEvidenceBreakdown(merged.byLayer, k, v);
        }
        for (const [k, v] of Object.entries(m.byCategory)) {
          mergeEvidenceBreakdown(merged.byCategory, k, v);
        }
        for (const [k, v] of Object.entries(m.byGeometryBucket)) {
          mergeEvidenceBreakdown(merged.byGeometryBucket, k, v);
        }
        for (const [k, v] of Object.entries(m.bySourceId)) {
          mergeEvidenceBreakdown(merged.bySourceId, k, v);
        }
        for (const [k, v] of Object.entries(m.byRuleId)) {
          mergeEvidenceBreakdown(merged.byRuleId, k, v);
        }
        for (const [k, v] of Object.entries(m.byStackingGroup)) {
          mergeEvidenceBreakdown(merged.byStackingGroup, k, v);
        }
        for (const [k, v] of Object.entries(m.byOwnershipRole)) {
          mergeEvidenceBreakdown(merged.byOwnershipRole, k, v);
        }
      }
    }
  }

  merged.totalSupportRaw = merged.directSupportRaw + merged.tp4cSupportRaw;
  merged.totalPressureRaw = merged.directPressureRaw + merged.tp4cPressureRaw;
  merged.meanSourceIdsPerRetainedFact =
    merged.retainedSignedCount > 0
      ? merged.sourceMembershipCount / merged.retainedSignedCount
      : 0;

  return merged;
}

export function assertSingleMembershipCounts(
  dims: EvidenceDimensionAggregate,
): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  const expected = dims.retainedSignedCount;
  const checks: Array<[string, Record<string, V051EvidenceMassBreakdown>]> = [
    ["byLayer", dims.byLayer],
    ["byCategory", dims.byCategory],
    ["byGeometryBucket", dims.byGeometryBucket],
    ["byRuleId", dims.byRuleId],
    ["byStackingGroup", dims.byStackingGroup],
    ["byOwnershipRole", dims.byOwnershipRole],
  ];
  for (const [name, map] of checks) {
    const count = sumBreakdownCount(map);
    if (count !== expected) {
      failures.push(`${name}.count=${count} !== retainedSignedFactCount=${expected}`);
    }
    const support = sumBreakdownSupport(map);
    const pressure = sumBreakdownPressure(map);
    if (Math.abs(support - dims.totalSupportRaw) > 1e-6) {
      failures.push(`${name}.supportRaw=${support} !== totalSupportRaw=${dims.totalSupportRaw}`);
    }
    if (Math.abs(pressure - dims.totalPressureRaw) > 1e-6) {
      failures.push(
        `${name}.pressureRaw=${pressure} !== totalPressureRaw=${dims.totalPressureRaw}`,
      );
    }
  }
  const sourceCount = sumBreakdownCount(dims.bySourceId);
  if (sourceCount !== dims.sourceMembershipCount) {
    failures.push(
      `bySourceId.count=${sourceCount} !== sourceMembershipCount=${dims.sourceMembershipCount}`,
    );
  }
  return { ok: failures.length === 0, failures };
}

export function samplesToVectors(samples: V051DomainSample[]): number[][] {
  const byYear = new Map<string, Partial<Record<AnnualAxisDomain, number>>>();
  for (const s of samples) {
    const key = `${s.chartId}:${s.annualYear}`;
    const cur = byYear.get(key) ?? {};
    cur[s.domain] = s.score;
    byYear.set(key, cur);
  }
  const vectors: number[][] = [];
  for (const partial of byYear.values()) {
    const vals = ANNUAL_AXIS_DOMAINS.map((d) => partial[d]).filter(
      (v): v is number => v != null,
    );
    if (vals.length === 6) vectors.push(vals);
  }
  return vectors;
}
