import type {
  AnnualAxesKnowledgeV08NamPhai,
  AnnualAxisCalibrationV08,
  AnnualBucketFormulaV08,
  AnnualDomainRootCatalogV08,
  AnnualScoreProfileV08,
  AnnualSpatialBudgetV08,
} from "./schema";
import type { AnnualAxisDomainId } from "../schema";

export interface AnnualKnowledgeV08ValidationIssue {
  path: string;
  message: string;
}

const DOMAINS: AnnualAxisDomainId[] = [
  "health",
  "family",
  "wealth",
  "career",
  "social",
  "romance",
];

function issue(path: string, message: string): AnnualKnowledgeV08ValidationIssue {
  return { path, message };
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function validateAnnualAxesKnowledgeV08NamPhai(
  knowledge: AnnualAxesKnowledgeV08NamPhai,
  resolvedSourceIds: Set<string>,
): { ok: true } | { ok: false; issues: AnnualKnowledgeV08ValidationIssue[] } {
  const issues: AnnualKnowledgeV08ValidationIssue[] = [];

  const roots = knowledge.domainRoots as AnnualDomainRootCatalogV08;
  if (roots.selectionPolicy !== "highest-weight-primary-anchor") {
    issues.push(issue("domainRoots.selectionPolicy", "must be highest-weight-primary-anchor"));
  }
  for (const domain of DOMAINS) {
    const root = roots.roots?.[domain];
    if (!root?.palaceName || !isFiniteNumber(root.sourceWeight)) {
      issues.push(issue(`domainRoots.roots.${domain}`, "palaceName and sourceWeight required"));
    }
  }

  const sb = knowledge.spatialBudget as AnnualSpatialBudgetV08;
  if (sb.signedBudget.direct !== 1 || sb.signedBudget.tp4c !== 0) {
    issues.push(issue("spatialBudget.signedBudget", "direct must be 1 and tp4c must be 0"));
  }

  const bf = knowledge.bucketFormula as AnnualBucketFormulaV08;
  const geo = bf.signedGeometryPolicy;
  if (
    !geo ||
    geo.direct !== 1 ||
    geo.tp4c !== 0 ||
    geo.opposite !== 0 ||
    geo.contextOnly !== 0 ||
    geo.adjacent !== 0
  ) {
    issues.push(issue("bucketFormula.signedGeometryPolicy", "direct=1; all others=0"));
  }
  const layer = bf.signedLayerPolicy;
  if (
    !layer ||
    layer.annualDirect !== 1 ||
    layer.natalDirectWithAnnualTrigger !== 1 ||
    layer.natalUntriggered !== 0 ||
    layer.majorFortune !== 0 ||
    layer.global !== 0
  ) {
    issues.push(issue("bucketFormula.signedLayerPolicy", "invalid signed layer policy"));
  }
  if (
    !bf.activationPolicy?.directAnchorOnly ||
    bf.activationPolicy.tp4cAllowed !== false ||
    bf.activationPolicy.modulation !== "sqrt"
  ) {
    issues.push(issue("bucketFormula.activationPolicy", "directAnchorOnly + sqrt required"));
  }
  if (!isFiniteNumber(bf.evidenceScale) || bf.evidenceScale <= 0) {
    issues.push(issue("bucketFormula.evidenceScale", "must be positive"));
  }

  const sp = knowledge.scoreProfile as AnnualScoreProfileV08;
  const ids = sp.scoreProfiles?.map((p) => p.id) ?? [];
  if (
    !ids.includes("DIRECT-STRICT-16") ||
    !ids.includes("DIRECT-STRICT-18") ||
    !ids.includes("DIRECT-STRICT-20")
  ) {
    issues.push(issue("scoreProfile.scoreProfiles", "must include 16/18/20 candidates"));
  }
  for (const p of sp.scoreProfiles ?? []) {
    if (!isFiniteNumber(p.scoreStepPerRobustSigma) || p.scoreStepPerRobustSigma <= 0) {
      issues.push(issue(`scoreProfile.scoreProfiles.${p.id}`, "invalid step"));
    }
  }
  const rc = sp.robustCalibration;
  if (
    !rc ||
    rc.madConsistencyFactor !== 1.4826 ||
    rc.iqrConsistencyFactor !== 1.349 ||
    !isFiniteNumber(rc.minimumRobustScale) ||
    !isFiniteNumber(rc.zClip)
  ) {
    issues.push(issue("scoreProfile.robustCalibration", "invalid robust calibration"));
  }
  const bounds = sp.scoreBounds;
  if (!bounds || bounds.neutral !== 50 || bounds.minimum !== 5 || bounds.maximum !== 95) {
    issues.push(issue("scoreProfile.scoreBounds", "neutral=50, min=5, max=95 required"));
  }
  if (
    !sp.confidenceProfile ||
    !isFiniteNumber(sp.confidenceProfile.factsForFullCoverage) ||
    sp.confidenceProfile.conflictPenalty !== 0.5
  ) {
    issues.push(issue("scoreProfile.confidenceProfile", "invalid confidence profile"));
  }

  const cal = knowledge.calibration as AnnualAxisCalibrationV08;
  if (cal.engineVersion !== "0.8.0") {
    issues.push(issue("calibration.engineVersion", "must equal 0.8.0"));
  }
  if (cal.formulaVersion !== "v0.8-direct-anchor-robust-score") {
    issues.push(issue("calibration.formulaVersion", "must equal v0.8-direct-anchor-robust-score"));
  }
  for (const domain of DOMAINS) {
    for (const key of [
      "domainCenters",
      "robustScales",
      "activationScales",
      "madScales",
      "iqrScales",
      "medianPositiveAnnualActivationRaw",
    ] as const) {
      const value = cal[key]?.[domain];
      if (!isFiniteNumber(value)) {
        issues.push(issue(`calibration.${key}.${domain}`, "must be finite"));
      }
      if (
        (key === "robustScales" || key === "activationScales") &&
        isFiniteNumber(value) &&
        value <= 0
      ) {
        issues.push(issue(`calibration.${key}.${domain}`, "must be positive"));
      }
    }
  }

  for (const pack of [roots, sb, bf, sp, cal, knowledge.dedupePolicy, knowledge.distributionGates]) {
    for (const sourceId of pack.sourceIds ?? []) {
      if (!resolvedSourceIds.has(sourceId)) {
        issues.push(issue(`sourceIds.${sourceId}`, "unresolved source id"));
      }
    }
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
