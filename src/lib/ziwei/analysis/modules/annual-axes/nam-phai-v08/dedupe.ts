import type { AnnualAxesKnowledgeV08NamPhai } from "../../../knowledge/annual-axes/v0.8";
import type { ClassifiedPathCandidate } from "../nam-phai-v043/classify-paths";
import {
  dedupeSpatialPaths,
  type DedupedSpatialPaths,
} from "../nam-phai-v043/dedupe";
import { asV043DedupeKnowledge } from "./knowledge-adapter";

/**
 * Dedupe V0.8 pools. Signed pool must already be eligibility-filtered
 * (direct-anchor only) so TP4C cannot suppress direct winners.
 */
export function dedupeV08SpatialPaths(
  signedEligible: ClassifiedPathCandidate[],
  activationEligible: ClassifiedPathCandidate[],
  rejectedPre: Array<ClassifiedPathCandidate & { rejectedPathReason: string }>,
  knowledge: AnnualAxesKnowledgeV08NamPhai,
): DedupedSpatialPaths & {
  rejectedPreDedupe: Array<ClassifiedPathCandidate & { rejectedPathReason: string }>;
} {
  const adapted = asV043DedupeKnowledge(knowledge);
  // Feed only signed-eligible into signed dedupe by marking activation pool separately.
  // Use activationEligibilityPredicate that accepts only activationEligible ids.
  const activationIds = new Set(activationEligible.map((c) => c.candidatePathId));
  const combined = [...signedEligible, ...activationEligible.filter((c) => !signedEligible.some((s) => s.candidatePathId === c.candidatePathId))];

  const deduped = dedupeSpatialPaths(combined, adapted, {
    activationEligibilityPredicate: (c) => activationIds.has(c.candidatePathId),
  });

  // Ensure signedRetained is subset of signedEligible
  const signedIds = new Set(signedEligible.map((c) => c.candidatePathId));
  const signedRetained = deduped.signedRetained.filter((c) => signedIds.has(c.candidatePathId));
  const wronglySigned = deduped.signedRetained.filter((c) => !signedIds.has(c.candidatePathId));

  return {
    ...deduped,
    signedRetained,
    rejected: [
      ...rejectedPre,
      ...deduped.rejected,
      ...wronglySigned.map((c) => ({
        ...c,
        rejectedPathReason: "tp4c-excluded-v08-direct-anchor",
      })),
    ],
    rejectedPreDedupe: rejectedPre,
  };
}
