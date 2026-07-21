import type { AnnualAxesKnowledgeV043NamPhai } from "../../../knowledge/annual-axes/v0.4.3";
import type { AnnualAxesKnowledgeV08NamPhai } from "../../../knowledge/annual-axes/v0.8";

/** Adapt V0.8 knowledge into the V0.4.3 dedupe adapter shape. */
export function asV043DedupeKnowledge(
  knowledge: AnnualAxesKnowledgeV08NamPhai,
): AnnualAxesKnowledgeV043NamPhai {
  return {
    spatialBudget: knowledge.spatialBudget as unknown as AnnualAxesKnowledgeV043NamPhai["spatialBudget"],
    dedupePolicy: knowledge.dedupePolicy as unknown as AnnualAxesKnowledgeV043NamPhai["dedupePolicy"],
    aggregationProfile: {
      diminishingReturns: knowledge.bucketFormula.diminishingReturns,
      contextChannels: knowledge.bucketFormula.contextChannels,
      evidenceScale: knowledge.bucketFormula.evidenceScale,
      epsilon: knowledge.bucketFormula.epsilon,
      signedLayerWeights: {
        annual: knowledge.bucketFormula.signedLayerPolicy.annualDirect,
        "major-fortune": knowledge.bucketFormula.signedLayerPolicy.majorFortune,
        "natal-activated":
          knowledge.bucketFormula.signedLayerPolicy.natalDirectWithAnnualTrigger,
      },
      annualActivationStrength: {
        supportWeight: 0,
        pressureWeight: 0,
        activationWeight: 1,
      },
    },
  } as unknown as AnnualAxesKnowledgeV043NamPhai;
}
