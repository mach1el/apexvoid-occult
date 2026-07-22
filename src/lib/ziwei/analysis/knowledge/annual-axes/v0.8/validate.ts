import type {
  AnnualAxesKnowledgeV08NamPhai,
  AnnualDomainMappingV08,
  AnnualPointClassesV08,
  AnnualScoreBandsV08,
  AnnualStarAliasesV08,
  AnnualStarRegistryV08,
  AnnualStarCapabilitiesV08,
  AnnualDistributionGatesV08,
  AnnualSourceRegistryV08,
  V08PointClass,
  V08StarRule,
  V08RuleProvenanceStatus,
  StarTemporalLayer,
} from "./schema";
import { V08_CANONICAL_PALACES, V08_KNOWLEDGE_VERSION } from "./schema";
import type { AnnualAxisDomainId } from "../schema";
import {
  exactCanonicalStarName,
  isAnnualOnlyStarName,
  inferTemporalLayerFromCanonicalName,
  bootstrapNormalizeStarName,
} from "./star-identity";

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

const POINT_CLASSES: V08PointClass[] = [
  "annualTransformStrongPositive",
  "annualTransformPositive",
  "annualTransformNegative",
  "otherAnnualPositive",
  "otherAnnualNegative",
  "staticPositive",
  "staticNegative",
  "dignifiedStaticPositive",
];

const POSITIVE_CLASSES = new Set<V08PointClass>([
  "annualTransformStrongPositive",
  "annualTransformPositive",
  "otherAnnualPositive",
  "staticPositive",
  "dignifiedStaticPositive",
]);

const NEGATIVE_CLASSES = new Set<V08PointClass>([
  "annualTransformNegative",
  "otherAnnualNegative",
  "staticNegative",
]);

const TEMPORAL_LAYERS = new Set<StarTemporalLayer>([
  "natal",
  "annual",
  "decadal",
  "monthly",
  "daily",
  "unknown",
]);

const PROVENANCE_STATUSES = new Set<V08RuleProvenanceStatus>([
  "classical",
  "derived",
  "engineering-hypothesis",
]);

const CLAIM_STATUSES = new Set([
  "classical",
  "derived",
  "engineering-hypothesis",
]);

const DIGNITY_ALLOWLIST = new Set([
  "Miếu",
  "Vượng",
  "Đắc",
  "Bình",
  "Hãm",
  "M",
  "V",
  "Đ",
  "B",
  "H",
]);

const KNOWN_GATE_METRICS = new Set([
  "meanIntraYearAxisStandardDeviationMin",
  "medianIntraYearAxisRangeMin",
  "p25IntraYearRangeMin",
  "p10IntraYearRangeMin",
  "medianPerDomainTwelveYearRangeMin",
  "medianAdjacentYearAbsoluteDeltaMin",
  "exactDuplicateVectorRateMax",
  "nearDuplicateVectorRateMax",
  "unavailableRateMax",
  "absoluteInterAxisCorrelationMax",
  "boundaryScoreRateMax",
  "atLeastTwoOutside42To58RateMin",
  "atLeastOneAtOrBelow40RateMin",
  "atLeastOneAtOrAbove60RateMin",
  "oneLowAndOneHighRateMin",
  "allSixAbove50RateMax",
  "fiveOrMoreAbove50RateMax",
  "allSixInside45To65RateMax",
]);

const RATE_GATE_SUFFIXES = ["RateMax", "RateMin"];
const POSITIVE_GATE_SUFFIXES = ["Min", "Max"];

const PALACE_ALLOWLIST = new Set<string>(V08_CANONICAL_PALACES);


const CLASSICAL_COMPATIBLE_SOURCE_TYPES = new Set([
  "classical_text",
  "published_reference",
  "school_manual",
]);

type SourceRecord = AnnualSourceRegistryV08["sources"][number];

function sourceBlocksClassical(source: SourceRecord): boolean {
  const prohibited = (source.prohibitedUsage ?? []).map((u) => u.toLowerCase());
  return (
    prohibited.some(
      (u) =>
        u.includes("classical") ||
        u.includes("doctrine") ||
        u.includes("authority") ||
        u.includes("classical formula"),
    ) ||
    source.sourceType === "internal_architecture" ||
    source.sourceType === "internal_calculation_contract"
  );
}

function validateProvenanceSourceCompatibility(args: {
  status: V08RuleProvenanceStatus;
  sourceIds: string[];
  sourcesById: Map<string, SourceRecord>;
  path: string;
  issues: AnnualKnowledgeV08ValidationIssue[];
  rationale?: string;
  locator?: string;
}): void {
  const { status, sourceIds, sourcesById, path, issues, rationale, locator } = args;
  if (!PROVENANCE_STATUSES.has(status)) {
    issues.push(issue(`${path}.status`, `unknown status ${status}`));
    return;
  }
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
    issues.push(issue(`${path}.sourceIds`, "empty provenance sourceIds"));
    return;
  }
  const resolved: SourceRecord[] = [];
  for (const sourceId of sourceIds) {
    const source = sourcesById.get(sourceId);
    if (!source) {
      issues.push(issue(`${path}.sourceIds.${sourceId}`, "unknown provenance source"));
      continue;
    }
    resolved.push(source);
  }
  if (resolved.length === 0) return;

  if (status === "classical") {
    const hasCompatible = resolved.some(
      (s) =>
        CLASSICAL_COMPATIBLE_SOURCE_TYPES.has(s.sourceType) && !sourceBlocksClassical(s),
    );
    if (!hasCompatible) {
      issues.push(
        issue(
          path,
          "classical status requires at least one compatible classical/published/school source",
        ),
      );
    }
  }

  if (status === "derived") {
    const hasRationale = Boolean(rationale && rationale.trim()) || Boolean(locator && locator.trim());
    if (!hasRationale) {
      issues.push(
        issue(path, "derived status requires rationale or locator explaining the derivation"),
      );
    }
  }
}

const KNOWN_BAND_IDS = new Set(["guarded", "balanced", "supportive", "strong"]);

const SOURCE_TYPE_ALLOWLIST = new Set([
  "internal_architecture",
  "internal_calculation_contract",
  "classical_text",
  "published_reference",
  "school_manual",
]);

function issue(path: string, message: string): AnnualKnowledgeV08ValidationIssue {
  return { path, message };
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function validateSourceRegistry(
  registry: AnnualSourceRegistryV08,
  issues: AnnualKnowledgeV08ValidationIssue[],
): Set<string> {
  const sourceIds = new Set<string>();
  if (registry.schemaVersion !== "0.8.0") {
    issues.push(issue("sourceRegistry.schemaVersion", "must be 0.8.0"));
  }
  if (registry.registryId !== "annual-axes-source-registry-v0-8") {
    issues.push(issue("sourceRegistry.registryId", "unexpected registryId"));
  }
  if (!registry.status || typeof registry.status !== "string") {
    issues.push(issue("sourceRegistry.status", "required"));
  }
  if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
    issues.push(issue("sourceRegistry.sources", "required non-empty array"));
    return sourceIds;
  }
  if (!Array.isArray(registry.claims)) {
    issues.push(issue("sourceRegistry.claims", "required array"));
  }

  for (const [i, source] of registry.sources.entries()) {
    const path = `sourceRegistry.sources[${i}]`;
    if (!source.sourceId || !String(source.sourceId).trim()) {
      issues.push(issue(`${path}.sourceId`, "empty source id"));
      continue;
    }
    if (sourceIds.has(source.sourceId)) {
      issues.push(issue(`${path}.sourceId`, "duplicate source id"));
    }
    sourceIds.add(source.sourceId);
    if (!source.title || !String(source.title).trim()) {
      issues.push(issue(`${path}.title`, "missing title"));
    }
    if (!Array.isArray(source.allowedUsage) || source.allowedUsage.length === 0) {
      issues.push(issue(`${path}.allowedUsage`, "empty allowedUsage"));
    }
    if (!Array.isArray(source.prohibitedUsage)) {
      issues.push(issue(`${path}.prohibitedUsage`, "missing prohibitedUsage"));
    }
    if (SOURCE_TYPE_ALLOWLIST.size > 0 && !SOURCE_TYPE_ALLOWLIST.has(source.sourceType)) {
      issues.push(issue(`${path}.sourceType`, `invalid source type ${source.sourceType}`));
    }
  }

  const claimIds = new Set<string>();
  for (const [i, claim] of (registry.claims ?? []).entries()) {
    const path = `sourceRegistry.claims[${i}]`;
    if (!claim.claimId || !String(claim.claimId).trim()) {
      issues.push(issue(`${path}.claimId`, "missing claim id"));
      continue;
    }
    if (claimIds.has(claim.claimId)) {
      issues.push(issue(`${path}.claimId`, "duplicate claim id"));
    }
    claimIds.add(claim.claimId);
    if (!claim.sourceId || !sourceIds.has(claim.sourceId)) {
      issues.push(issue(`${path}.sourceId`, "unknown source id"));
    }
    if (!claim.summary || !String(claim.summary).trim()) {
      issues.push(issue(`${path}.summary`, "missing summary"));
    }
    if (!claim.confidence || !String(claim.confidence).trim()) {
      issues.push(issue(`${path}.confidence`, "missing confidence"));
    }
    if (!claim.status) {
      issues.push(issue(`${path}.status`, "status required"));
    } else if (!CLAIM_STATUSES.has(claim.status)) {
      issues.push(issue(`${path}.status`, `unknown status ${claim.status}`));
    } else if (claim.sourceId && sourceIds.has(claim.sourceId)) {
      const sourcesById = new Map(registry.sources.map((s) => [s.sourceId, s] as const));
      validateProvenanceSourceCompatibility({
        status: claim.status as V08RuleProvenanceStatus,
        sourceIds: [claim.sourceId],
        sourcesById,
        path,
        issues,
      });
    }
  }

  return sourceIds;
}

function validateCapabilities(
  capabilities: AnnualStarCapabilitiesV08,
  resolvedSourceIds: Set<string>,
  sourcesById: Map<string, SourceRecord>,
  issues: AnnualKnowledgeV08ValidationIssue[],
): Map<string, AnnualStarCapabilitiesV08["capabilities"][number]> {
  const byName = new Map<string, AnnualStarCapabilitiesV08["capabilities"][number]>();
  if (capabilities.schemaVersion !== "0.8.0") {
    issues.push(issue("starCapabilities.schemaVersion", "must be 0.8.0"));
  }
  if (capabilities.catalogId !== "annual-star-capabilities-nam-phai-v0-8") {
    issues.push(issue("starCapabilities.catalogId", "unexpected catalogId"));
  }
  if (!Array.isArray(capabilities.capabilities)) {
    issues.push(issue("starCapabilities.capabilities", "must be an array"));
    return byName;
  }
  for (const [i, cap] of capabilities.capabilities.entries()) {
    const path = `starCapabilities.capabilities[${i}]`;
    const exact = exactCanonicalStarName(cap.exactStarName);
    if (!exact || !isAnnualOnlyStarName(exact)) {
      issues.push(issue(`${path}.exactStarName`, "must be an annual-only star name"));
    }
    if (cap.temporalLayer !== "annual") {
      issues.push(issue(`${path}.temporalLayer`, "must be annual"));
    }
    if (!["supported", "unsupported", "research-only"].includes(cap.supportStatus)) {
      issues.push(issue(`${path}.supportStatus`, "invalid supportStatus"));
    }
    if (!cap.rationale || !String(cap.rationale).trim()) {
      issues.push(issue(`${path}.rationale`, "required"));
    }
    if (cap.supportStatus === "supported") {
      if (!cap.producer || !String(cap.producer).trim()) {
        issues.push(
          issue(`${path}.producer`, "supported capability requires non-empty producer"),
        );
      }
    }
    if (cap.supportStatus === "unsupported") {
      if (cap.producer) {
        issues.push(
          issue(`${path}.producer`, "unsupported capability must not declare a producer"),
        );
      }
      if (!/unsupported|no verified|cannot|not emit|never/i.test(cap.rationale ?? "")) {
        issues.push(
          issue(`${path}.rationale`, "unsupported rationale must state why unsupported"),
        );
      }
    }
    if (byName.has(exact)) {
      issues.push(issue(`${path}.exactStarName`, "duplicate capability star"));
    }
    byName.set(exact, cap);

    if (!Array.isArray(cap.sourceIds) || cap.sourceIds.length === 0) {
      issues.push(issue(`${path}.sourceIds`, "empty capability sourceIds"));
    } else {
      const seenSrc = new Set<string>();
      for (const sourceId of cap.sourceIds) {
        if (seenSrc.has(sourceId)) {
          issues.push(issue(`${path}.sourceIds`, "duplicate capability sourceIds"));
        }
        seenSrc.add(sourceId);
        if (!resolvedSourceIds.has(sourceId) || !sourcesById.has(sourceId)) {
          issues.push(issue(`${path}.sourceIds.${sourceId}`, "unresolved source id"));
        }
      }
    }
  }
  for (const sourceId of capabilities.sourceIds ?? []) {
    if (!resolvedSourceIds.has(sourceId)) {
      issues.push(issue(`starCapabilities.sourceIds.${sourceId}`, "unresolved source id"));
    }
  }
  return byName;
}

function validateMapping(
  mapping: AnnualDomainMappingV08,
  resolvedSourceIds: Set<string>,
  issues: AnnualKnowledgeV08ValidationIssue[],
): void {
  if (mapping.schemaVersion !== "0.8.0") {
    issues.push(issue("domainMapping.schemaVersion", "must be 0.8.0"));
  }
  if (mapping.catalogId !== "annual-domain-mapping-nam-phai-v0-8") {
    issues.push(issue("domainMapping.catalogId", "unexpected catalogId"));
  }
  if (mapping.formulaVersion !== "v0.8-annual-palace-weighted-score") {
    issues.push(issue("domainMapping.formulaVersion", "must be v0.8-annual-palace-weighted-score"));
  }

  const domainKeys = Object.keys(mapping.domains);
  if (domainKeys.length !== 6) {
    issues.push(issue("domainMapping.domains", "must contain exactly six domains"));
  }
  for (const key of domainKeys) {
    if (!DOMAINS.includes(key as AnnualAxisDomainId)) {
      issues.push(issue(`domainMapping.domains.${key}`, "extra/unknown domain"));
    }
  }

  for (const domain of DOMAINS) {
    const entry = mapping.domains[domain];
    if (!entry) {
      issues.push(issue(`domainMapping.domains.${domain}`, "missing"));
      continue;
    }
    const primary = entry.primary;
    if (!isFiniteNumber(primary.weight) || primary.weight < 0 || primary.weight > 1) {
      issues.push(
        issue(`domainMapping.domains.${domain}.primary.weight`, "must be finite in [0,1]"),
      );
    }
    if (Math.abs(primary.weight - 0.6) > 1e-9) {
      issues.push(issue(`domainMapping.domains.${domain}.primary.weight`, "must equal 0.60"));
    }
    if (primary.type !== "annual-palace" && primary.type !== "small-limit-palace") {
      issues.push(issue(`domainMapping.domains.${domain}.primary.type`, "invalid type"));
    }
    if (primary.type === "annual-palace") {
      if (!primary.palace) {
        issues.push(issue(`domainMapping.domains.${domain}.primary.palace`, "required"));
      } else if (!PALACE_ALLOWLIST.has(primary.palace)) {
        issues.push(
          issue(`domainMapping.domains.${domain}.primary.palace`, `unknown palace ${primary.palace}`),
        );
      }
    }
    if (primary.type === "small-limit-palace" && primary.palace) {
      issues.push(
        issue(
          `domainMapping.domains.${domain}.primary.palace`,
          "small-limit type must not carry an annual palace name",
        ),
      );
    }

    const roleIds = new Set<string>();
    const logicalKeys = new Set<string>();
    const primaryRole = primary.role ?? "primary";
    roleIds.add(primaryRole);
    const primaryLogical =
      primary.type === "small-limit-palace"
        ? "small-limit-palace"
        : `annual-palace|${primary.palace ?? ""}`;
    logicalKeys.add(primaryLogical);

    const coopSum = entry.cooperating.reduce((s, c) => s + (c.weight ?? 0), 0);
    if (Math.abs(coopSum - 0.4) > 1e-9) {
      issues.push(
        issue(`domainMapping.domains.${domain}.cooperating`, "weights must sum to 0.40"),
      );
    }
    for (const [i, coop] of entry.cooperating.entries()) {
      if (!isFiniteNumber(coop.weight) || coop.weight < 0 || coop.weight > 1) {
        issues.push(
          issue(
            `domainMapping.domains.${domain}.cooperating[${i}].weight`,
            "must be finite in [0,1]",
          ),
        );
      }
      if (coop.type !== "annual-palace" && coop.type !== "small-limit-palace") {
        issues.push(
          issue(`domainMapping.domains.${domain}.cooperating[${i}].type`, "invalid type"),
        );
      }
      if (coop.type === "annual-palace") {
        if (!coop.palace) {
          issues.push(
            issue(`domainMapping.domains.${domain}.cooperating[${i}].palace`, "required"),
          );
        } else if (!PALACE_ALLOWLIST.has(coop.palace)) {
          issues.push(
            issue(
              `domainMapping.domains.${domain}.cooperating[${i}].palace`,
              `unknown palace ${coop.palace}`,
            ),
          );
        }
      }
      if (coop.type === "small-limit-palace" && coop.palace) {
        issues.push(
          issue(
            `domainMapping.domains.${domain}.cooperating[${i}].palace`,
            "small-limit type must not carry an annual palace name",
          ),
        );
      }
      const role = coop.role ?? `cooperating-${i}`;
      if (roleIds.has(role)) {
        issues.push(
          issue(`domainMapping.domains.${domain}.cooperating[${i}].role`, "duplicate role id"),
        );
      }
      roleIds.add(role);
      const logical =
        coop.type === "small-limit-palace"
          ? "small-limit-palace"
          : `annual-palace|${coop.palace ?? ""}`;
      if (logicalKeys.has(logical)) {
        issues.push(
          issue(
            `domainMapping.domains.${domain}.cooperating[${i}]`,
            "duplicate logical input definition",
          ),
        );
      }
      logicalKeys.add(logical);
    }
    const total = primary.weight + coopSum;
    if (Math.abs(total - 1) > 1e-9) {
      issues.push(issue(`domainMapping.domains.${domain}`, "weights must sum to 1.00"));
    }
  }
  for (const sourceId of mapping.sourceIds) {
    if (!resolvedSourceIds.has(sourceId)) {
      issues.push(issue(`domainMapping.sourceIds.${sourceId}`, "unresolved source id"));
    }
  }
}

function validatePointClasses(
  profile: AnnualPointClassesV08,
  resolvedSourceIds: Set<string>,
  issues: AnnualKnowledgeV08ValidationIssue[],
): void {
  if (profile.schemaVersion !== "0.8.0") {
    issues.push(issue("pointClasses.schemaVersion", "must be 0.8.0"));
  }
  if (profile.profileId !== "annual-point-classes-nam-phai-v0-8") {
    issues.push(issue("pointClasses.profileId", "unexpected profileId"));
  }
  const classKeys = Object.keys(profile.classes);
  if (classKeys.length !== POINT_CLASSES.length) {
    issues.push(issue("pointClasses.classes", "exact class key set required"));
  }
  for (const key of classKeys) {
    if (!POINT_CLASSES.includes(key as V08PointClass)) {
      issues.push(issue(`pointClasses.classes.${key}`, "extra/unknown class key"));
    }
  }
  for (const key of POINT_CLASSES) {
    if (!isFiniteNumber(profile.classes[key])) {
      issues.push(issue(`pointClasses.classes.${key}`, "must be a finite number"));
    }
  }
  const expected: Record<V08PointClass, number> = {
    annualTransformStrongPositive: 3,
    annualTransformPositive: 2,
    annualTransformNegative: -3,
    otherAnnualPositive: 2,
    otherAnnualNegative: -2,
    staticPositive: 1,
    staticNegative: -1,
    dignifiedStaticPositive: 2,
  };
  for (const [key, value] of Object.entries(expected) as Array<[V08PointClass, number]>) {
    if (profile.classes[key] !== value) {
      issues.push(issue(`pointClasses.classes.${key}`, `must be ${value}`));
    }
  }
  if (profile.palaceRawClamp.minimum !== -8 || profile.palaceRawClamp.maximum !== 8) {
    issues.push(issue("pointClasses.palaceRawClamp", "must be [-8, 8]"));
  }
  if (profile.axisRawClamp.minimum !== -8 || profile.axisRawClamp.maximum !== 8) {
    issues.push(issue("pointClasses.axisRawClamp", "must be [-8, 8]"));
  }
  if (profile.thaiTueMultiplier !== 1.25) {
    issues.push(issue("pointClasses.thaiTueMultiplier", "must be 1.25"));
  }
  if (profile.thaiTueNeutralMultiplier !== 1.0) {
    issues.push(issue("pointClasses.thaiTueNeutralMultiplier", "must be 1.0"));
  }
  if (profile.score.neutral !== 50 || profile.score.pointsPerRawUnit !== 5) {
    issues.push(issue("pointClasses.score", "must use 50 + 5 * raw"));
  }
  if (profile.score.minimum !== 10 || profile.score.maximum !== 90) {
    issues.push(issue("pointClasses.score.bounds", "must clamp to [10, 90]"));
  }
  if (profile.score.precision !== 1) {
    issues.push(issue("pointClasses.score.precision", "must be 1"));
  }
  for (const sourceId of profile.sourceIds) {
    if (!resolvedSourceIds.has(sourceId)) {
      issues.push(issue(`pointClasses.sourceIds.${sourceId}`, "unresolved source id"));
    }
  }
}

function validateRule(
  domain: AnnualAxisDomainId,
  rule: V08StarRule,
  polarity: "positive" | "negative",
  seenRuleIds: Set<string>,
  capabilities: Map<string, AnnualStarCapabilitiesV08["capabilities"][number]>,
  sourcesById: Map<string, SourceRecord>,
  familyIds: Set<string>,
  issues: AnnualKnowledgeV08ValidationIssue[],
): void {
  const path = `starRegistry.axes.${domain}.${rule.ruleId}`;
  if (!rule.starName || !rule.ruleId || !POINT_CLASSES.includes(rule.pointClass)) {
    issues.push(issue(path, "invalid rule"));
    return;
  }
  if (seenRuleIds.has(rule.ruleId)) {
    issues.push(issue(path, "duplicate rule id"));
  }
  seenRuleIds.add(rule.ruleId);

  if (rule.polarity !== polarity) {
    issues.push(issue(path, `polarity must be ${polarity}`));
  }
  if (polarity === "positive" && !POSITIVE_CLASSES.has(rule.pointClass)) {
    issues.push(issue(path, "positive rule using a negative point class"));
  }
  if (polarity === "negative" && !NEGATIVE_CLASSES.has(rule.pointClass)) {
    issues.push(issue(path, "negative rule using a positive point class"));
  }

  if (!Array.isArray(rule.allowedTemporalLayers) || rule.allowedTemporalLayers.length === 0) {
    issues.push(issue(path, "allowedTemporalLayers required"));
  } else {
    const uniqueLayers = new Set(rule.allowedTemporalLayers);
    if (uniqueLayers.size !== rule.allowedTemporalLayers.length) {
      issues.push(issue(path, "duplicate temporal-layer entries"));
    }
    for (const layer of rule.allowedTemporalLayers) {
      if (!TEMPORAL_LAYERS.has(layer)) {
        issues.push(issue(path, `invalid temporal layer ${layer}`));
      }
    }
    const exactName = exactCanonicalStarName(rule.starName);
    if (isAnnualOnlyStarName(exactName)) {
      if (uniqueLayers.size !== 1 || !uniqueLayers.has("annual")) {
        issues.push(issue(path, "annual-only rule must allow exactly the annual layer"));
      }
      const cap = capabilities.get(exactName);
      if (!cap || cap.supportStatus !== "supported") {
        issues.push(
          issue(
            path,
            "production annual-only rule requires a supported annual-star capability",
          ),
        );
      }
    }
  }

  if (rule.allowedSources) {
    for (const [i, source] of rule.allowedSources.entries()) {
      if (!source || !String(source).trim()) {
        issues.push(issue(`${path}.allowedSources[${i}]`, "empty allowed source"));
      }
    }
  }

  if (rule.requiresDignity) {
    for (const dignity of rule.requiresDignity) {
      if (!DIGNITY_ALLOWLIST.has(dignity)) {
        issues.push(issue(`${path}.requiresDignity`, `invalid dignity ${dignity}`));
      }
    }
  }

  if (rule.familyId && !familyIds.has(rule.familyId)) {
    issues.push(issue(`${path}.familyId`, `unresolved family ${rule.familyId}`));
  }

  if (!rule.provenance) {
    issues.push(issue(`${path}.provenance`, "provenance required"));
  } else if (!rule.provenance.status) {
    issues.push(issue(`${path}.provenance.status`, "status required"));
  } else {
    validateProvenanceSourceCompatibility({
      status: rule.provenance.status,
      sourceIds: rule.provenance.sourceIds ?? [],
      sourcesById,
      path: `${path}.provenance`,
      issues,
      rationale: rule.provenance.rationale,
      locator: rule.provenance.locator,
    });
  }
}

function validateRegistry(
  registry: AnnualStarRegistryV08,
  resolvedSourceIds: Set<string>,
  sourcesById: Map<string, SourceRecord>,
  capabilities: Map<string, AnnualStarCapabilitiesV08["capabilities"][number]>,
  familyIds: Set<string>,
  issues: AnnualKnowledgeV08ValidationIssue[],
): void {
  if (registry.schemaVersion !== "0.8.0") {
    issues.push(issue("starRegistry.schemaVersion", "must be 0.8.0"));
  }
  if (registry.catalogId !== "annual-star-registry-nam-phai-v0-8") {
    issues.push(issue("starRegistry.catalogId", "unexpected catalogId"));
  }
  const axisKeys = Object.keys(registry.axes);
  if (axisKeys.length !== 6) {
    issues.push(issue("starRegistry.axes", "must contain exactly six axes"));
  }
  for (const key of axisKeys) {
    if (!DOMAINS.includes(key as AnnualAxisDomainId)) {
      issues.push(issue(`starRegistry.axes.${key}`, "extra/unknown axis"));
    }
  }
  const seenRuleIds = new Set<string>();
  const productionAnnualStars = new Set<string>();
  for (const domain of DOMAINS) {
    const axis = registry.axes[domain];
    if (!axis) {
      issues.push(issue(`starRegistry.axes.${domain}`, "missing"));
      continue;
    }
    for (const rule of axis.positive) {
      validateRule(
        domain,
        rule,
        "positive",
        seenRuleIds,
        capabilities,
        sourcesById,
        familyIds,
        issues,
      );
      const exact = exactCanonicalStarName(rule.starName);
      if (isAnnualOnlyStarName(exact)) productionAnnualStars.add(exact);
    }
    for (const rule of axis.negative) {
      validateRule(
        domain,
        rule,
        "negative",
        seenRuleIds,
        capabilities,
        sourcesById,
        familyIds,
        issues,
      );
      const exact = exactCanonicalStarName(rule.starName);
      if (isAnnualOnlyStarName(exact)) productionAnnualStars.add(exact);
    }
  }

  for (const [exact, cap] of capabilities) {
    if (
      (cap.supportStatus === "unsupported" || cap.supportStatus === "research-only") &&
      productionAnnualStars.has(exact)
    ) {
      issues.push(
        issue(
          `starCapabilities.${exact}`,
          `${cap.supportStatus} capability must not back a production scoring rule`,
        ),
      );
    }
  }

  for (const sourceId of registry.sourceIds) {
    if (!resolvedSourceIds.has(sourceId)) {
      issues.push(issue(`starRegistry.sourceIds.${sourceId}`, "unresolved source id"));
    }
  }
}

function validateAliases(
  aliases: AnnualStarAliasesV08,
  resolvedSourceIds: Set<string>,
  issues: AnnualKnowledgeV08ValidationIssue[],
): Set<string> {
  const familyIds = new Set<string>();
  if (aliases.schemaVersion !== "0.8.0") {
    issues.push(issue("starAliases.schemaVersion", "must be 0.8.0"));
  }
  if (aliases.catalogId !== "annual-star-aliases-nam-phai-v0-8") {
    issues.push(issue("starAliases.catalogId", "unexpected catalogId"));
  }
  if (!Array.isArray(aliases.aliases)) {
    issues.push(issue("starAliases.aliases", "must be an array"));
    return familyIds;
  }

  const aliasToCanonical = new Map<string, string>();
  const familyMemberSet = new Set<string>();
  for (const [familyId, members] of Object.entries(aliases.families ?? {})) {
    familyIds.add(familyId);
    if (!Array.isArray(members) || members.length < 2) {
      issues.push(issue(`starAliases.families.${familyId}`, "family must have ≥2 members"));
      continue;
    }
    const seenMembers = new Set<string>();
    for (const member of members) {
      const exact = exactCanonicalStarName(member);
      if (seenMembers.has(exact)) {
        issues.push(issue(`starAliases.families.${familyId}`, "duplicate family member"));
      }
      seenMembers.add(exact);
      familyMemberSet.add(exact);
    }
  }

  // Pass 1 — uniqueness (exact duplicate aliases rejected even for same target)
  for (const [i, entry] of aliases.aliases.entries()) {
    const aliasBoot = bootstrapNormalizeStarName(entry.alias);
    const canonical = exactCanonicalStarName(entry.canonical);
    if (!aliasBoot || !canonical) {
      issues.push(issue(`starAliases.aliases[${i}]`, "alias and canonical required"));
      continue;
    }
    if (aliasToCanonical.has(aliasBoot)) {
      issues.push(issue(`starAliases.aliases[${i}]`, "duplicate alias entry"));
    }
    aliasToCanonical.set(aliasBoot, canonical);
  }

  const aliasKeys = new Set(
    aliases.aliases.map((e) => bootstrapNormalizeStarName(e.alias)),
  );

  // Pass 2 — temporal crossing, chains, family collisions
  for (const [i, entry] of aliases.aliases.entries()) {
    const alias = exactCanonicalStarName(entry.alias);
    const canonical = exactCanonicalStarName(entry.canonical);
    if (!alias || !canonical) continue;

    const canonBoot = bootstrapNormalizeStarName(entry.canonical);
    if (aliasKeys.has(canonBoot) && canonBoot !== bootstrapNormalizeStarName(entry.alias)) {
      issues.push(issue(`starAliases.aliases[${i}]`, "alias chains are not allowed"));
    }

    const aliasLayer = inferTemporalLayerFromCanonicalName(alias);
    const canonLayer = inferTemporalLayerFromCanonicalName(canonical);
    if (aliasLayer !== canonLayer) {
      issues.push(issue(`starAliases.aliases[${i}]`, "alias crosses temporal layers"));
    }

    if (familyMemberSet.has(alias) && familyMemberSet.has(canonical) && alias !== canonical) {
      for (const members of Object.values(aliases.families)) {
        const set = new Set(members.map(exactCanonicalStarName));
        if (set.has(alias) && set.has(canonical) && alias !== canonical) {
          issues.push(
            issue(
              `starAliases.aliases[${i}]`,
              "family members must not be registered as exact aliases",
            ),
          );
          break;
        }
      }
    }
  }

  const requiredFamilies = [
    "khoi-viet",
    "kinh-da",
    "khong-kiep",
    "long-phuong",
    "thai-toa",
    "quang-quy",
  ];
  for (const key of requiredFamilies) {
    if (!Array.isArray(aliases.families[key]) || aliases.families[key]!.length === 0) {
      issues.push(issue(`starAliases.families.${key}`, "required non-empty family"));
    }
  }

  for (const sourceId of aliases.sourceIds) {
    if (!resolvedSourceIds.has(sourceId)) {
      issues.push(issue(`starAliases.sourceIds.${sourceId}`, "unresolved source id"));
    }
  }
  return familyIds;
}

function validateScoreBands(
  bands: AnnualScoreBandsV08,
  resolvedSourceIds: Set<string>,
  issues: AnnualKnowledgeV08ValidationIssue[],
): void {
  if (bands.schemaVersion !== "0.8.0") {
    issues.push(issue("scoreBands.schemaVersion", "must be 0.8.0"));
  }
  if (bands.profileId !== "annual-score-bands-nam-phai-v0-8") {
    issues.push(issue("scoreBands.profileId", "unexpected profileId"));
  }
  if (!bands || !Array.isArray(bands.bands) || bands.bands.length === 0) {
    issues.push(issue("scoreBands.bands", "required"));
    return;
  }

  const seenIds = new Set<string>();
  type Interval = { min: number; max: number; exclusiveMax: boolean; id: string; index: number };
  const intervals: Interval[] = [];

  for (const [i, band] of bands.bands.entries()) {
    if (!KNOWN_BAND_IDS.has(band.id)) {
      issues.push(issue(`scoreBands.bands[${i}].id`, `unknown band id ${band.id}`));
    }
    if (seenIds.has(band.id)) {
      issues.push(issue(`scoreBands.bands[${i}].id`, "duplicate band id"));
    }
    seenIds.add(band.id);

    if (!isFiniteNumber(band.minInclusive)) {
      issues.push(issue(`scoreBands.bands[${i}].minInclusive`, "must be finite"));
      continue;
    }
    const hasExclusive = band.maxExclusive !== undefined;
    const hasInclusive = band.maxInclusive !== undefined;
    if (hasExclusive === hasInclusive) {
      issues.push(
        issue(
          `scoreBands.bands[${i}]`,
          "exactly one of maxExclusive or maxInclusive is required",
        ),
      );
      continue;
    }
    const max = hasExclusive ? band.maxExclusive! : band.maxInclusive!;
    if (!isFiniteNumber(max)) {
      issues.push(issue(`scoreBands.bands[${i}].max`, "must be finite"));
      continue;
    }
    if (max < band.minInclusive || (!hasExclusive && max < band.minInclusive)) {
      issues.push(issue(`scoreBands.bands[${i}]`, "minimum must be <= maximum"));
    }
    intervals.push({
      min: band.minInclusive,
      max,
      exclusiveMax: hasExclusive,
      id: band.id,
      index: i,
    });
  }

  // Validate original array order before sorting for coverage analysis.
  for (let i = 1; i < bands.bands.length; i++) {
    const prev = bands.bands[i - 1]!;
    const curr = bands.bands[i]!;
    if (
      isFiniteNumber(prev.minInclusive) &&
      isFiniteNumber(curr.minInclusive) &&
      curr.minInclusive < prev.minInclusive
    ) {
      issues.push(
        issue(`scoreBands.bands[${i}]`, "bands must be ordered by minInclusive"),
      );
    }
  }

  // Copy for overlap/coverage analysis — do not mutate loaded knowledge.
  const sortedIntervals = [...intervals].sort(
    (a, b) => a.min - b.min || a.index - b.index,
  );

  // Discrete coverage of scores with precision 1 over [10, 90].
  const SCORE_MIN = 10;
  const SCORE_MAX = 90;
  const PRECISION = 10; // tenths
  const covered = new Set<number>();
  for (const interval of sortedIntervals) {
    for (let t = Math.round(SCORE_MIN * PRECISION); t <= Math.round(SCORE_MAX * PRECISION); t++) {
      const score = t / PRECISION;
      const inMin = score >= interval.min;
      const inMax = interval.exclusiveMax ? score < interval.max : score <= interval.max;
      if (inMin && inMax) {
        if (covered.has(t)) {
          issues.push(
            issue(`scoreBands.bands[${interval.index}]`, `overlap at score ${score}`),
          );
        }
        covered.add(t);
      }
    }
  }
  if (!covered.has(Math.round(SCORE_MIN * PRECISION))) {
    issues.push(issue("scoreBands.bands", "missing 10 boundary"));
  }
  if (!covered.has(Math.round(SCORE_MAX * PRECISION))) {
    issues.push(issue("scoreBands.bands", "missing 90 boundary"));
  }
  for (let t = Math.round(SCORE_MIN * PRECISION); t <= Math.round(SCORE_MAX * PRECISION); t++) {
    if (!covered.has(t)) {
      issues.push(issue("scoreBands.bands", `gap at score ${t / PRECISION}`));
      break;
    }
  }

  for (const sourceId of bands.sourceIds) {
    if (!resolvedSourceIds.has(sourceId)) {
      issues.push(issue(`scoreBands.sourceIds.${sourceId}`, "unresolved source id"));
    }
  }
}

function validateGates(
  gates: AnnualDistributionGatesV08,
  resolvedSourceIds: Set<string>,
  issues: AnnualKnowledgeV08ValidationIssue[],
): void {
  if (gates.schemaVersion !== "0.8.0") {
    issues.push(issue("distributionGates.schemaVersion", "must be 0.8.0"));
  }
  if (gates.catalogId !== "annual-distribution-gates-v0-8") {
    issues.push(issue("distributionGates.catalogId", "unexpected catalogId"));
  }
  for (const [key, value] of Object.entries(gates.hardGates)) {
    if (!KNOWN_GATE_METRICS.has(key)) {
      issues.push(issue(`distributionGates.hardGates.${key}`, "unknown metric name"));
    }
    if (!isFiniteNumber(value)) {
      issues.push(issue(`distributionGates.hardGates.${key}`, "must be finite"));
      continue;
    }
    const isRate = RATE_GATE_SUFFIXES.some((s) => key.endsWith(s) && key.includes("Rate"));
    if (isRate || key.includes("Rate")) {
      if (value < 0 || value > 1) {
        issues.push(issue(`distributionGates.hardGates.${key}`, "rate must be in [0,1]"));
      }
    } else if (POSITIVE_GATE_SUFFIXES.some((s) => key.endsWith(s))) {
      if (value < 0) {
        issues.push(issue(`distributionGates.hardGates.${key}`, "must be non-negative"));
      }
    }
  }
  for (const sourceId of gates.sourceIds) {
    if (!resolvedSourceIds.has(sourceId)) {
      issues.push(issue(`distributionGates.sourceIds.${sourceId}`, "unresolved source id"));
    }
  }
}

export function validateAnnualAxesKnowledgeV08NamPhai(
  knowledge: AnnualAxesKnowledgeV08NamPhai,
): { ok: true } | { ok: false; issues: AnnualKnowledgeV08ValidationIssue[] } {
  const issues: AnnualKnowledgeV08ValidationIssue[] = [];
  if (knowledge.knowledgeVersion !== V08_KNOWLEDGE_VERSION) {
    issues.push(issue("knowledgeVersion", `must be ${V08_KNOWLEDGE_VERSION}`));
  }

  const sourceIds = validateSourceRegistry(knowledge.sourceRegistry, issues);
  const sourcesById = new Map(
    knowledge.sourceRegistry.sources.map((s) => [s.sourceId, s] as const),
  );

  const capabilities = validateCapabilities(
    knowledge.starCapabilities,
    sourceIds,
    sourcesById,
    issues,
  );
  const familyIds = validateAliases(knowledge.starAliases, sourceIds, issues);
  validateMapping(knowledge.domainMapping, sourceIds, issues);
  validatePointClasses(knowledge.pointClasses, sourceIds, issues);
  validateRegistry(
    knowledge.starRegistry,
    sourceIds,
    sourcesById,
    capabilities,
    familyIds,
    issues,
  );
  validateScoreBands(knowledge.scoreBands, sourceIds, issues);
  validateGates(knowledge.distributionGates, sourceIds, issues);
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
