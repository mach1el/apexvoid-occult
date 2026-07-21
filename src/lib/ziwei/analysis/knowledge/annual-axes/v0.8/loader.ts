import { deepFreeze } from "../deep-freeze";
import type { AnnualAxesKnowledgeV08NamPhai } from "./schema";
import {
  validateAnnualAxesKnowledgeV08NamPhai,
  type AnnualKnowledgeV08ValidationIssue,
} from "./validate";

import domainRoots from "./annual-domain-roots.nam-phai.v0.8.json";
import spatialBudget from "./annual-spatial-budget.nam-phai.v0.8.json";
import dedupePolicy from "./annual-evidence-dedupe-policy.nam-phai.v0.8.json";
import bucketFormula from "./annual-bucket-formula.nam-phai.v0.8.json";
import scoreProfile from "./annual-score-profile.nam-phai.v0.8.json";
import calibration from "./annual-axis-calibration.nam-phai.v0.8.json";
import distributionGates from "./annual-distribution-gates.v0.8.json";
import sourceRegistry from "../v0.4/annual-source-registry.v0.4.json";

export type LoadAnnualAxesKnowledgeV08NamPhaiResult =
  | { ok: true; knowledge: AnnualAxesKnowledgeV08NamPhai }
  | { ok: false; issues: AnnualKnowledgeV08ValidationIssue[] };

let cached: LoadAnnualAxesKnowledgeV08NamPhaiResult | null = null;

function buildKnowledge(): AnnualAxesKnowledgeV08NamPhai {
  return {
    domainRoots: domainRoots as unknown as AnnualAxesKnowledgeV08NamPhai["domainRoots"],
    spatialBudget: spatialBudget as unknown as AnnualAxesKnowledgeV08NamPhai["spatialBudget"],
    dedupePolicy: dedupePolicy as unknown as AnnualAxesKnowledgeV08NamPhai["dedupePolicy"],
    bucketFormula: bucketFormula as unknown as AnnualAxesKnowledgeV08NamPhai["bucketFormula"],
    scoreProfile: scoreProfile as unknown as AnnualAxesKnowledgeV08NamPhai["scoreProfile"],
    calibration: calibration as unknown as AnnualAxesKnowledgeV08NamPhai["calibration"],
    distributionGates: distributionGates as unknown as AnnualAxesKnowledgeV08NamPhai["distributionGates"],
  };
}

export function loadAnnualAxesKnowledgeV08NamPhai(): LoadAnnualAxesKnowledgeV08NamPhaiResult {
  if (cached) return cached;
  const knowledge = buildKnowledge();
  const sourceIds = new Set(sourceRegistry.sources.map((s) => s.sourceId));
  const validation = validateAnnualAxesKnowledgeV08NamPhai(knowledge, sourceIds);
  cached = validation.ok
    ? { ok: true, knowledge: deepFreeze(knowledge) }
    : { ok: false, issues: validation.issues };
  return cached;
}

export function resetAnnualAxesKnowledgeV08NamPhaiCache(): void {
  cached = null;
}
