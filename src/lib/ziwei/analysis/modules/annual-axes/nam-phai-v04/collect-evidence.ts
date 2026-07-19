import type { ChartData, ChartPalace, ChartStar, MutagenRecord } from "@/types/chart";
import { canonicalStarName } from "../../../facts";
import type { PalaceOverviewKnowledgeV1 } from "../../../knowledge";
import type { AnnualAxisDomain } from "../../../contracts/annual-axes";
import type { AnnualAxesKnowledgeV04NamPhai } from "../../../knowledge/annual-axes/v0.4";
import mutagenImpactCatalog from "../../../knowledge/annual-axes/annual-mutagen-impact.v0.json";
import type { AnnualFocusFrame } from "../build-annual-focus-frame";
import type {
  AnnualAxisEvidence,
  AnnualAxisEvidenceLayer,
  AnnualAxisFrameRole,
  AnnualAxisRawAxes,
  AnnualAxesDiagnostics,
  AnnualEvidenceActivationPath,
  AnnualEvidenceChannel,
  NamPhaiV041CollectStats,
} from "../types";
import { resolveDomainAffinity, type ResolvedDomainAffinity } from "./affinity";
import {
  buildNamePalaceIndex,
  domainFrameCoverage,
  relationRole,
  type DomainRoutingV04,
} from "./routing";

const ARCH_SOURCE_ID = "SRC-AA-ENG-004";
const ANNUAL_STAR_SOURCES = new Set(["annual"]);
const MUTAGEN_MARKER_SOURCES = new Set(["natal-mutagen", "annual-mutagen"]);

const MUTAGEN_IMPACT = mutagenImpactCatalog as {
  records: Array<{
    mutagen: string;
    axes: AnnualAxisRawAxes;
    stackingGroup: string;
    ruleId: string;
  }>;
};

function isNatalPhysicalStar(star: ChartStar): boolean {
  const source = star.source ?? "natal";
  return !ANNUAL_STAR_SOURCES.has(source) && !MUTAGEN_MARKER_SOURCES.has(source);
}

interface StarResolution {
  axes: AnnualAxisRawAxes;
  starClass: "major" | "minor";
  familyId?: string;
  diminishingGroup?: string;
  sourceIds: string[];
  knowledgeStatus: "experimental" | "approved";
}

function resolveStar(
  canonical: string,
  brightness: string | undefined,
  numeric: PalaceOverviewKnowledgeV1,
): StarResolution | null {
  const major = numeric.majorStars.stars.find((s) => s.name === canonical);
  if (major) {
    const status = numeric.majorStars.status === "approved" ? "approved" : "experimental";
    let axes: AnnualAxisRawAxes = { ...major.axes };
    if (brightness) {
      const modifier =
        numeric.majorStars.brightnessModifiers[brightness] ??
        numeric.majorStars.brightnessModifiers.Bình;
      if (modifier) {
        axes = {
          support: axes.support * modifier.supportFactor,
          pressure: axes.pressure * modifier.pressureFactor,
          stability: axes.stability + modifier.stabilityDelta,
          activation: axes.activation * modifier.activationFactor,
        };
      }
    }
    return {
      axes,
      starClass: "major",
      sourceIds: numeric.majorStars.sourceIds,
      knowledgeStatus: status,
    };
  }

  const minor = numeric.minorStars.stars.find((s) => s.canonicalName === canonical);
  if (minor && minor.scoringMode === "direct") {
    const family = numeric.minorFamilies.families.find((f) => f.id === minor.familyId);
    if (!family) return null;
    const status = minor.status === "approved" ? "approved" : "experimental";
    let axes: AnnualAxisRawAxes = { ...(minor.axesOverride ?? family.axes) };
    if (minor.brightnessPolicy !== "none" && brightness) {
      const policy = numeric.minorStateModifiers.policies[minor.brightnessPolicy]?.[brightness];
      if (policy) {
        axes = {
          support: axes.support * policy.supportFactor,
          pressure: axes.pressure * policy.pressureFactor,
          stability: axes.stability + policy.stabilityDelta,
          activation: axes.activation * policy.activationFactor,
        };
      }
    }
    return {
      axes,
      starClass: "minor",
      familyId: family.id,
      diminishingGroup: family.diminishingGroup,
      sourceIds: minor.sourceIds,
      knowledgeStatus: status,
    };
  }

  return null;
}

function isTriggerEnabled(knowledge: AnnualAxesKnowledgeV04NamPhai, triggerId: string): boolean {
  return knowledge.triggerPolicy.enabledTriggers.some((t) => t.triggerId === triggerId && t.enabled);
}

function headFrameIndexes(headFrame: AnnualFocusFrame): Set<number> {
  return new Set(headFrame.nodes.map((n) => n.palaceIndex));
}

function domainLocalIndexes(
  chart: ChartData,
  knowledge: AnnualAxesKnowledgeV04NamPhai,
  domain: AnnualAxisDomain,
): Set<number> {
  return new Set(domainFrameCoverage(chart, knowledge, domain).physicalPalaceIndexes);
}

function localGeometryWeight(
  chart: ChartData,
  knowledge: AnnualAxesKnowledgeV04NamPhai,
  domain: AnnualAxisDomain,
  targetPalaceIndex: number,
): { weight: number; bestAnchorName: string | null; bestRole: AnnualAxisFrameRole | "outside" } {
  const nameToIndex = buildNamePalaceIndex(chart);
  const domainDefinition = knowledge.axisDefinitions.domains.find((d) => d.domain === domain);
  if (!domainDefinition) return { weight: 0, bestAnchorName: null, bestRole: "outside" };

  // Local role weights mirror head-frame role weights from the channel profile
  // (V0.4 does not ship a separate local weight table).
  const roleWeights = knowledge.channelProfile.routing.headFrameRoleWeights;
  let best = 0;
  let bestName: string | null = null;
  let bestRole: AnnualAxisFrameRole | "outside" = "outside";
  for (const anchor of domainDefinition.anchors) {
    const anchorIndex = nameToIndex.get(anchor.palaceName);
    if (anchorIndex === undefined) continue;
    const role = relationRole(anchorIndex, targetPalaceIndex);
    const weight = anchor.weight * roleWeights[role];
    if (weight > best) {
      best = weight;
      bestName = anchor.palaceName;
      bestRole = role === "outside" ? "outside" : (role as AnnualAxisFrameRole);
    }
  }
  return { weight: best, bestAnchorName: bestName, bestRole };
}

interface CandidateFact {
  physicalFactId: string;
  category: AnnualAxisEvidence["category"];
  layer: AnnualAxisEvidenceLayer;
  ruleId: string;
  targetPalace: ChartPalace;
  rawAxes: AnnualAxisRawAxes;
  stackingGroup: string;
  sourceIds: string[];
  knowledgeStatus: "experimental" | "approved";
  origin: "natal-star" | "annual-star" | "annual-mutagen" | "major-mutagen" | "natal-mutagen";
  canonicalStarName?: string;
  familyId?: string;
  mutagen?: "Lộc" | "Quyền" | "Khoa" | "Kỵ";
}

interface CollectInput {
  chart: ChartData;
  domain: AnnualAxisDomain;
  knowledge: AnnualAxesKnowledgeV04NamPhai;
  numericKnowledge: PalaceOverviewKnowledgeV1;
  headFrame: AnnualFocusFrame;
  routing: DomainRoutingV04;
  diagnostics: AnnualAxesDiagnostics;
}

export interface CollectEvidenceResultV041 {
  evidence: AnnualAxisEvidence[];
  stats: NamPhaiV041CollectStats;
}

function emptyStats(): NamPhaiV041CollectStats {
  return {
    candidateFacts: 0,
    numericFacts: 0,
    contextOnlyFacts: 0,
    droppedByReason: {
      noAnnualTrigger: 0,
      noAffinity: 0,
      zeroAffinity: 0,
      noLocalDomainRelevance: 0,
      noEnabledGlobalRule: 0,
      duplicatePhysicalFact: 0,
    },
    affinityResolution: {
      exactStar: 0,
      starFamily: 0,
      transformation: 0,
      unmapped: 0,
    },
  };
}

/**
 * §2 direct-domain contract. Requires physical local-domain geometry > 0
 * AND an eligible annual trigger AND positive domain affinity. Annual
 * origin alone is never sufficient — this is the fix for the removed
 * `fact.origin.startsWith("annual") ? 1 : 0` bypass.
 */
function resolveDirectDomainPath(
  triggerIds: string[],
  localWeight: number,
  affinity: ResolvedDomainAffinity,
): AnnualEvidenceActivationPath | null {
  if (localWeight <= 0) return null;
  const triggerId = triggerIds.find(
    (t) =>
      t === "annual-transformation-exact-target" ||
      t === "annual-moving-star-palace" ||
      t === "head-domain-frame-intersection",
  );
  if (!triggerId) return null;
  if (affinity.value <= 0) return null;
  const effectivePathWeight = localWeight * affinity.value;
  return {
    triggerId,
    channel: "direct-domain",
    geometryWeight: localWeight,
    affinityWeight: affinity.value,
    effectivePathWeight,
    boundedPathWeight: Math.min(1, effectivePathWeight),
  };
}

/**
 * §4 routed-head contract. Requires physical head geometry > 0 AND domain
 * routing > 0 AND an eligible annual trigger AND positive domain affinity.
 * `routedStrength` (domain-routing attenuation) is applied exactly once,
 * later, at `normalize-delta.ts` channel weighting — not here (§5).
 */
function resolveRoutedHeadPath(
  triggerIds: string[],
  headGeometry: number,
  domainRouting: number,
  affinity: ResolvedDomainAffinity,
): AnnualEvidenceActivationPath | null {
  if (headGeometry <= 0) return null;
  if (domainRouting <= 0) return null;
  const triggerId = triggerIds.find(
    (t) => t === "annual-head-tp4c" || t === "head-domain-frame-intersection",
  );
  if (!triggerId) return null;
  if (affinity.value <= 0) return null;
  const effectivePathWeight = headGeometry * affinity.value;
  return {
    triggerId,
    channel: "routed-head",
    geometryWeight: headGeometry,
    affinityWeight: affinity.value,
    effectivePathWeight,
    boundedPathWeight: Math.min(1, effectivePathWeight),
  };
}

/**
 * §2 global contract. An annual-origin fact outside local domain geometry
 * may enter `global` only when explicitly listed in
 * `channelProfile.globalEligibility.annualMovingStarMarkerIds`. The catalog
 * is empty by default — empty catalog means zero global evidence, never a
 * silent promotion of rejected direct-domain evidence.
 */
function resolveGlobalPath(
  fact: CandidateFact,
  knowledge: AnnualAxesKnowledgeV04NamPhai,
  affinity: ResolvedDomainAffinity,
): AnnualEvidenceActivationPath | null {
  const markerIds = knowledge.channelProfile.globalEligibility.annualMovingStarMarkerIds;
  if (markerIds.length === 0) return null;
  const markerId =
    fact.category === "mutagen" ? `mutagen:${fact.mutagen}` : `star:${fact.canonicalStarName}`;
  if (!markerIds.includes(markerId)) return null;
  if (affinity.value <= 0) return null;
  const effectivePathWeight = affinity.value;
  return {
    triggerId: "global-eligibility",
    channel: "global",
    geometryWeight: 1,
    affinityWeight: affinity.value,
    effectivePathWeight,
    boundedPathWeight: Math.min(1, effectivePathWeight),
  };
}

/**
 * Major-fortune background: major-mutagen origin always qualifies
 * (`major-fortune-context` trigger); a natal-derived fact that already
 * cleared a natal trigger and happens to sit in the active Major Fortune
 * palace (`layer === "major-fortune"`) also qualifies — unchanged from the
 * pre-V0.4.1 behavior, not one of the identified defects.
 */
function resolveMajorBackgroundPath(
  triggerIds: string[],
  inMajor: boolean,
  layer: AnnualAxisEvidenceLayer,
  affinity: ResolvedDomainAffinity,
): AnnualEvidenceActivationPath | null {
  const eligible = triggerIds.includes("major-fortune-context") || (inMajor && layer === "major-fortune");
  if (!eligible) return null;
  if (affinity.value <= 0) return null;
  const geometryWeight = 0.55;
  const effectivePathWeight = geometryWeight * affinity.value;
  return {
    triggerId: "major-fortune-context",
    channel: "major-background",
    geometryWeight,
    affinityWeight: affinity.value,
    effectivePathWeight,
    boundedPathWeight: Math.min(1, effectivePathWeight),
  };
}

/**
 * Collect V0.4.1 triggered annual evidence. Natal physical stars contribute
 * numeric support/pressure only when at least one enabled annual trigger
 * applies AND the resolved domain affinity is positive. Each activation
 * path (§4/§6) carries its own independent `boundedPathWeight` — channels
 * are no longer combined into one blended weight and split back out.
 */
export function collectNamPhaiV04TriggeredEvidence(input: CollectInput): CollectEvidenceResultV041 {
  const { chart, domain, knowledge, numericKnowledge, headFrame, routing, diagnostics } = input;
  const stats = emptyStats();

  const coverage = domainFrameCoverage(chart, knowledge, domain);
  if (coverage.uniquePhysicalPalaceCount >= 11) {
    diagnostics.domainFrameOvercoverage.push(
      `${domain}:palaces=${coverage.uniquePhysicalPalaceCount}`,
    );
  }

  const headIndexes = headFrameIndexes(headFrame);
  const localIndexes = domainLocalIndexes(chart, knowledge, domain);
  const annualStarPalaceIndexes = new Set(
    (chart.annualStars ?? []).map((s) => s.palace.index),
  );
  const annualMutagenTargets = new Set(
    (chart.annualMutagens ?? [])
      .filter((m) => m.palace)
      .map((m) => `${m.palace!.index}:${canonicalStarName(m.starName)}`),
  );

  const factsByKey = new Map<string, CandidateFact>();
  const pushFact = (fact: CandidateFact) => {
    if (factsByKey.has(fact.physicalFactId)) {
      diagnostics.duplicatePhysicalFacts.push(`${domain}:${fact.physicalFactId}`);
      stats.droppedByReason.duplicatePhysicalFact += 1;
      return;
    }
    factsByKey.set(fact.physicalFactId, fact);
  };

  for (const palace of chart.palaces) {
    for (const star of palace.stars ?? []) {
      if (!isNatalPhysicalStar(star)) continue;
      const canonical = canonicalStarName(star.name);
      const res = resolveStar(canonical, star.brightness, numericKnowledge);
      if (!res) continue;
      const inMajor =
        chart.majorFortunePalace != null && chart.majorFortunePalace.index === palace.index;
      pushFact({
        physicalFactId: `natal-star:${palace.index}:${canonical}`,
        category: "star",
        layer: inMajor ? "major-fortune" : "natal-activated",
        ruleId:
          res.starClass === "major"
            ? "RULE-AA-STAR-MAJOR-CANONICAL-V0"
            : "RULE-AA-STAR-MINOR-CANONICAL-V0",
        targetPalace: palace,
        rawAxes: res.axes,
        stackingGroup: res.diminishingGroup ?? "major-star",
        sourceIds: res.sourceIds,
        knowledgeStatus: res.knowledgeStatus,
        origin: "natal-star",
        canonicalStarName: canonical,
        familyId: res.familyId,
      });
    }
  }

  for (const annualStar of chart.annualStars ?? []) {
    const canonical = canonicalStarName(annualStar.name);
    const res = resolveStar(canonical, annualStar.brightness, numericKnowledge);
    if (!res) continue;
    pushFact({
      physicalFactId: `annual-star:${annualStar.palace.index}:${canonical}`,
      category: "star",
      layer: "annual",
      ruleId: "RULE-AA-STAR-ANNUAL-MOVING-V04",
      targetPalace: annualStar.palace,
      rawAxes: res.axes,
      stackingGroup: res.diminishingGroup ?? "annual-moving-star",
      sourceIds: res.sourceIds,
      knowledgeStatus: res.knowledgeStatus,
      origin: "annual-star",
      canonicalStarName: canonical,
      familyId: res.familyId,
    });
  }

  const pushMutagens = (
    records: MutagenRecord[] | undefined,
    layer: AnnualAxisEvidenceLayer,
    origin: CandidateFact["origin"],
  ) => {
    if (!records) return;
    for (const record of records) {
      if (!record.palace) continue;
      const impact = MUTAGEN_IMPACT.records.find((r) => r.mutagen === record.mutagen);
      if (!impact) {
        diagnostics.unknownMutagens.push(record.mutagen);
        continue;
      }
      const mutagen = record.mutagen as "Lộc" | "Quyền" | "Khoa" | "Kỵ";
      const canonical = canonicalStarName(record.starName);
      pushFact({
        physicalFactId: `mutagen:${record.palace.index}:${record.mutagen}:${canonical}`,
        category: "mutagen",
        layer,
        ruleId: impact.ruleId,
        targetPalace: record.palace,
        rawAxes: { ...impact.axes },
        stackingGroup: impact.stackingGroup,
        sourceIds: [ARCH_SOURCE_ID],
        knowledgeStatus: "experimental",
        origin,
        canonicalStarName: canonical,
        mutagen,
      });
    }
  };

  pushMutagens(chart.annualMutagens, "annual", "annual-mutagen");
  pushMutagens(chart.natalMutagens, "natal-activated", "natal-mutagen");
  pushMutagens(chart.majorMutagens, "major-fortune", "major-mutagen");

  const out: AnnualAxisEvidence[] = [];

  for (const fact of factsByKey.values()) {
    stats.candidateFacts += 1;

    const triggerIds: string[] = [];
    const idx = fact.targetPalace.index;
    const inHead = headIndexes.has(idx);
    const inLocal = localIndexes.has(idx);
    const inMajor =
      chart.majorFortunePalace != null && chart.majorFortunePalace.index === idx;

    if (fact.origin === "natal-star" || fact.origin === "natal-mutagen") {
      if (isTriggerEnabled(knowledge, "annual-head-tp4c") && inHead) {
        triggerIds.push("annual-head-tp4c");
      }
      if (
        isTriggerEnabled(knowledge, "annual-transformation-exact-target") &&
        fact.canonicalStarName &&
        annualMutagenTargets.has(`${idx}:${fact.canonicalStarName}`)
      ) {
        triggerIds.push("annual-transformation-exact-target");
      }
      if (
        isTriggerEnabled(knowledge, "annual-moving-star-palace") &&
        annualStarPalaceIndexes.has(idx)
      ) {
        triggerIds.push("annual-moving-star-palace");
      }
      if (
        isTriggerEnabled(knowledge, "head-domain-frame-intersection") &&
        inHead &&
        inLocal
      ) {
        triggerIds.push("head-domain-frame-intersection");
      }

      if (triggerIds.length === 0) {
        // Natal without trigger: sensitivity-only — skip numeric evidence.
        stats.droppedByReason.noAnnualTrigger += 1;
        continue;
      }
    } else if (fact.origin === "annual-star") {
      if (isTriggerEnabled(knowledge, "annual-moving-star-palace")) {
        triggerIds.push("annual-moving-star-palace");
      }
    } else if (fact.origin === "annual-mutagen") {
      if (isTriggerEnabled(knowledge, "annual-transformation-exact-target")) {
        triggerIds.push("annual-transformation-exact-target");
      }
    } else if (fact.origin === "major-mutagen") {
      // Major-fortune mutagen is always major-background when present.
      triggerIds.push("major-fortune-context");
    }

    if (triggerIds.length === 0) {
      stats.droppedByReason.noAnnualTrigger += 1;
      continue;
    }

    const affinity =
      fact.category === "mutagen" && fact.mutagen
        ? resolveDomainAffinity(knowledge, domain, {
            kind: "transformation",
            transformation: fact.mutagen,
          })
        : resolveDomainAffinity(knowledge, domain, {
            kind: "star",
            canonicalStarName: fact.canonicalStarName ?? "",
            familyId: fact.familyId,
          });

    if (affinity == null) {
      // Context-only: no exact/family/transformation mapping. Never falls
      // back to a numeric default (§3).
      stats.contextOnlyFacts += 1;
      stats.droppedByReason.noAffinity += 1;
      stats.affinityResolution.unmapped += 1;
      continue;
    }
    if (affinity.source === "exact-star") stats.affinityResolution.exactStar += 1;
    else if (affinity.source === "star-family") stats.affinityResolution.starFamily += 1;
    else if (affinity.source === "transformation") stats.affinityResolution.transformation += 1;

    if (affinity.value <= 0) {
      // Mapped, but this record explicitly assigns zero relevance to this
      // domain — distinct from "unmapped"; still produces no numeric path.
      stats.droppedByReason.zeroAffinity += 1;
      continue;
    }

    const headRole = relationRole(headFrame.focusPalaceIndex, idx);
    const headGeometry = knowledge.channelProfile.routing.headFrameRoleWeights[headRole];
    const local = localGeometryWeight(chart, knowledge, domain, idx);

    const activationPaths: AnnualEvidenceActivationPath[] = [];
    const direct = resolveDirectDomainPath(triggerIds, local.weight, affinity);
    if (direct) activationPaths.push(direct);
    const routed = resolveRoutedHeadPath(triggerIds, headGeometry, routing.routing, affinity);
    if (routed) activationPaths.push(routed);
    const global = resolveGlobalPath(fact, knowledge, affinity);
    if (global) activationPaths.push(global);
    const majorBackground = resolveMajorBackgroundPath(
      triggerIds,
      inMajor,
      fact.layer,
      affinity,
    );
    if (majorBackground) activationPaths.push(majorBackground);

    if (activationPaths.length === 0) {
      stats.droppedByReason.noLocalDomainRelevance += 1;
      continue;
    }

    stats.numericFacts += 1;

    const confidenceWeight = knowledge.deltaProfile.confidenceWeights[fact.knowledgeStatus];
    const strongestPath = activationPaths.reduce((a, b) =>
      b.boundedPathWeight > a.boundedPathWeight ? b : a,
    );
    // Display/sort-only aggregate (topDrivers, evidence list) — channel
    // math below reads `rawAxes` + `activationPaths` + `confidenceWeight`
    // directly, not this blended value (§6).
    const effectiveWeight = strongestPath.boundedPathWeight * confidenceWeight;

    const weightedAxes: AnnualAxisRawAxes = {
      support: fact.rawAxes.support * effectiveWeight,
      pressure: fact.rawAxes.pressure * effectiveWeight,
      stability: 0,
      activation: fact.rawAxes.activation * effectiveWeight,
    };

    const frameRole: AnnualAxisFrameRole =
      local.bestRole !== "outside"
        ? (local.bestRole as AnnualAxisFrameRole)
        : headRole === "outside"
          ? "focus"
          : (headRole as AnnualAxisFrameRole);

    out.push({
      id: `ann-axis:${domain}:${fact.layer}:${fact.category}:${fact.physicalFactId}`,
      domain,
      layer: fact.layer,
      category: fact.category,
      physicalFactId: fact.physicalFactId,
      ruleId: fact.ruleId,
      targetPalaceIndex: fact.targetPalace.index,
      targetPalaceName: fact.targetPalace.name,
      targetAnnualPalaceName: fact.targetPalace.annualPalaceName ?? null,
      frameRole,
      anchorPalaceName: local.bestAnchorName ?? "annual-head",
      stackingGroup: fact.stackingGroup,
      rawAxes: fact.rawAxes,
      effectiveWeight,
      weightedAxes,
      confidenceWeight,
      factIds: [fact.physicalFactId],
      sourceIds: fact.sourceIds.length > 0 ? fact.sourceIds : [ARCH_SOURCE_ID],
      knowledgeStatus: fact.knowledgeStatus,
      routing: routing.routing,
      headShare: routing.headShare,
      localShare: routing.localShare,
      annualTriggerIds: [...new Set(triggerIds)],
      affinityWeight: affinity.value,
      affinitySource: affinity.source,
      affinityRecordId: affinity.recordId,
      activationPaths,
    } satisfies AnnualAxisEvidence);
  }

  return { evidence: out, stats };
}
