/**
 * V0.8 direct-anchor eligibility — applied BEFORE signed/activation dedupe.
 */

import type { AnnualAxisEvidence } from "../types";
import type { ClassifiedPathCandidate } from "../nam-phai-v043/classify-paths";
import { relationRole } from "../nam-phai-v04/routing";
import type { V08DomainRootAnchor } from "./resolve-domain-root";
import type { AnnualAxesKnowledgeV08NamPhai } from "../../../knowledge/annual-axes/v0.8";
import type { AnnualGeometryClass, AnnualGeometryBucket } from "../types";

export type V08GeometryKind =
  | "direct"
  | "tp4c"
  | "opposite"
  | "adjacent"
  | "context";

const DIRECT_ANNUAL_TRIGGERS = new Set([
  "annual-moving-star-palace",
  "annual-transformation-exact-target",
]);

function circularDistance(a: number, b: number): number {
  const d = Math.abs(((a % 12) + 12) % 12 - ((b % 12) + 12) % 12);
  return Math.min(d, 12 - d);
}

export function classifyRelativeToDomainRoot(
  targetPalaceIndex: number,
  anchorPalaceIndex: number,
): V08GeometryKind {
  const role = relationRole(anchorPalaceIndex, targetPalaceIndex);
  if (role === "focus") return "direct";
  if (role === "opposite") return "opposite";
  if (role === "trine") return "tp4c";
  if (circularDistance(anchorPalaceIndex, targetPalaceIndex) === 1) return "adjacent";
  return "context";
}

function toGeometryClass(kind: V08GeometryKind): AnnualGeometryClass {
  switch (kind) {
    case "direct":
      return "direct-exact-target";
    case "opposite":
      return "tp4c-opposite";
    case "tp4c":
      return "tp4c-trine";
    default:
      return "context-only";
  }
}

function toGeometryBucket(kind: V08GeometryKind): AnnualGeometryBucket {
  if (kind === "direct") return "direct";
  if (kind === "tp4c" || kind === "opposite") return "tp4c";
  return "context-only";
}

function hasDirectAnnualTrigger(evidence: AnnualAxisEvidence): boolean {
  const ids = evidence.annualTriggerIds ?? [];
  return ids.some((id) => DIRECT_ANNUAL_TRIGGERS.has(id));
}

export interface V08EligibilityPartition {
  signedEligible: ClassifiedPathCandidate[];
  activationEligible: ClassifiedPathCandidate[];
  rejected: Array<ClassifiedPathCandidate & { rejectedPathReason: string }>;
  counts: {
    excludedTp4cFactCount: number;
    excludedOppositeFactCount: number;
    excludedContextFactCount: number;
    excludedAdjacentFactCount: number;
    excludedCrossDomainFactCount: number;
  };
}

function asCandidate(
  evidence: AnnualAxisEvidence,
  kind: V08GeometryKind,
  anchor: V08DomainRootAnchor,
): ClassifiedPathCandidate {
  const path =
    evidence.activationPaths?.[0] ??
    ({
      channel: "direct-domain",
      triggerId: "v08-synthetic",
      affinityWeight: evidence.ownershipWeight ?? evidence.effectiveWeight ?? 1,
    } as ClassifiedPathCandidate["path"]);

  const ownershipWeight = evidence.ownershipWeight ?? path.affinityWeight ?? 1;
  const confidenceWeight = evidence.confidenceWeight ?? 1;
  const ownershipSubjectProduct = path.affinityWeight ?? ownershipWeight;

  return {
    evidence,
    path,
    geometryClass: toGeometryClass(kind),
    geometryBucket: toGeometryBucket(kind),
    headRole: relationRole(anchor.anchorPalaceIndex, evidence.targetPalaceIndex),
    ownershipSubjectProduct,
    ownershipWeight,
    subjectModifier: ownershipWeight > 0 ? ownershipSubjectProduct / ownershipWeight : 1,
    geometryRoleWeight: kind === "direct" ? 1 : 0,
    confidenceWeight,
    candidatePathId: `${evidence.id}|${path.channel}|${path.triggerId}|v08`,
  };
}

function rejectionReason(
  evidence: AnnualAxisEvidence,
  kind: V08GeometryKind,
): string {
  if (evidence.layer === "major-fortune") return "major-fortune-background-excluded-v08";
  if (kind === "tp4c") return "tp4c-excluded-v08-direct-anchor";
  if (kind === "opposite") return "opposite-excluded-v08-direct-anchor";
  if (kind === "adjacent") return "adjacent-excluded-v08-direct-anchor";
  if (kind === "context") {
    if (evidence.layer === "natal-activated" && (evidence.annualTriggerIds?.length ?? 0) === 0) {
      return "untriggered-natal-excluded-v08";
    }
    if (evidence.activationPaths?.some((p) => p.channel === "global")) {
      return "global-background-excluded-v08";
    }
    return "context-only-excluded-v08-direct-anchor";
  }
  if (kind !== "direct") return "cross-domain-anchor-excluded-v08";
  if (evidence.layer === "natal-activated" && !hasDirectAnnualTrigger(evidence)) {
    return (evidence.annualTriggerIds?.length ?? 0) === 0
      ? "untriggered-natal-excluded-v08"
      : "tp4c-excluded-v08-direct-anchor";
  }
  const support = Math.max(0, evidence.rawAxes.support);
  const pressure = Math.max(0, evidence.rawAxes.pressure);
  if (support + pressure <= 0) return "zero-signed-mass";
  return "anchor-identity-unverified-v08";
}

function isSignedEligible(
  evidence: AnnualAxisEvidence,
  kind: V08GeometryKind,
  knowledge: AnnualAxesKnowledgeV08NamPhai,
): boolean {
  const policy = knowledge.bucketFormula.signedLayerPolicy;
  if (kind !== "direct") return false;
  if (evidence.targetPalaceIndex == null) return false;

  if (evidence.layer === "annual") {
    return policy.annualDirect > 0;
  }
  if (evidence.layer === "natal-activated") {
    if (policy.natalDirectWithAnnualTrigger <= 0) return false;
    if (policy.natalUntriggered <= 0 && (evidence.annualTriggerIds?.length ?? 0) === 0) {
      return false;
    }
    return hasDirectAnnualTrigger(evidence);
  }
  // major-fortune / other
  return false;
}

function isActivationEligible(
  evidence: AnnualAxisEvidence,
  kind: V08GeometryKind,
): boolean {
  if (kind !== "direct") return false;
  if (evidence.layer === "major-fortune") return false;
  if (evidence.activationPaths?.some((p) => p.channel === "global" || p.channel === "major-background")) {
    return false;
  }
  if (evidence.layer === "annual") {
    // Any annual physical fact at the domain root may activate the domain.
    return true;
  }
  if (evidence.layer === "natal-activated") {
    return hasDirectAnnualTrigger(evidence);
  }
  return false;
}

/**
 * Partition collected evidence into signed-eligible / activation-eligible /
 * rejected BEFORE physical-fact dedupe.
 */
export function partitionDirectAnchorEligibility(
  evidenceRows: AnnualAxisEvidence[],
  anchor: V08DomainRootAnchor,
  knowledge: AnnualAxesKnowledgeV08NamPhai,
): V08EligibilityPartition {
  const signedEligible: ClassifiedPathCandidate[] = [];
  const activationEligible: ClassifiedPathCandidate[] = [];
  const rejected: Array<ClassifiedPathCandidate & { rejectedPathReason: string }> = [];
  const counts = {
    excludedTp4cFactCount: 0,
    excludedOppositeFactCount: 0,
    excludedContextFactCount: 0,
    excludedAdjacentFactCount: 0,
    excludedCrossDomainFactCount: 0,
  };

  const seenSigned = new Set<string>();
  const seenActivation = new Set<string>();

  for (const evidence of evidenceRows) {
    const kind = classifyRelativeToDomainRoot(
      evidence.targetPalaceIndex,
      anchor.anchorPalaceIndex,
    );
    const candidate = asCandidate(evidence, kind, anchor);

    const signedOk = isSignedEligible(evidence, kind, knowledge);
    const activationOk = isActivationEligible(evidence, kind);

    if (signedOk) {
      if (!seenSigned.has(candidate.candidatePathId)) {
        signedEligible.push(candidate);
        seenSigned.add(candidate.candidatePathId);
      }
    } else {
      const reason = rejectionReason(evidence, kind);
      rejected.push({ ...candidate, rejectedPathReason: reason });
      if (kind === "tp4c") counts.excludedTp4cFactCount += 1;
      else if (kind === "opposite") counts.excludedOppositeFactCount += 1;
      else if (kind === "adjacent") counts.excludedAdjacentFactCount += 1;
      else if (kind === "context") counts.excludedContextFactCount += 1;
      else if (kind !== "direct") counts.excludedCrossDomainFactCount += 1;
      else if (evidence.targetPalaceIndex !== anchor.anchorPalaceIndex) {
        counts.excludedCrossDomainFactCount += 1;
      }
    }

    if (activationOk && !seenActivation.has(candidate.candidatePathId)) {
      activationEligible.push(candidate);
      seenActivation.add(candidate.candidatePathId);
    }
  }

  return { signedEligible, activationEligible, rejected, counts };
}
