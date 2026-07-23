import type { ChartData } from "@/types/chart";
import type { ZiweiSchool } from "../../../facts";
import {
  loadMajorFortuneKnowledgeV02,
  type MajorFortuneV02BandId,
  type MajorFortuneV02PillarId,
} from "../../../knowledge/major-fortune-scoring/v0.2";
import { classifyMajorFortuneV02ScoreState } from "./classify-score-state";
import { applyPillarClip, isCappedDeltaOutOfBounds } from "./clip";
import { collectPillarMatches, roundToDecimals, clamp } from "./match-rules";
import { resolveMajorFortuneV02Context } from "./resolve-context";
import {
  emptyMajorFortuneV02Diagnostics,
  type MajorFortuneV02PillarResult,
  type MajorFortuneV02Result,
} from "./types";

const PILLAR_ORDER: MajorFortuneV02PillarId[] = [
  "thien-thoi",
  "dia-loi",
  "nhan-hoa",
  "tu-hoa-sat-tinh",
];

function bandForScore(
  score: number,
  bands: Array<{ bandId: MajorFortuneV02BandId; minInclusive: number; maxInclusive: number }>,
): MajorFortuneV02BandId | null {
  for (const b of bands) {
    if (score >= b.minInclusive && score <= b.maxInclusive) return b.bandId;
  }
  return null;
}

function emptyPillar(cap: number): MajorFortuneV02PillarResult {
  return {
    cap,
    rawDelta: 0,
    cappedDelta: 0,
    status: "unavailable",
    contributions: [],
    reasonCodes: ["invalid-knowledge"],
    matchedStructuralRuleIds: [],
  };
}

/**
 * Module status contract:
 * - any pillar with mutex-violation / unavailable → module unavailable
 * - else any partial pillar → module partial
 * - else all available → module available
 * Mutex never yields module `available`.
 */
export function resolveModuleStatusFromPillars(
  pillars: Record<MajorFortuneV02PillarId, MajorFortuneV02PillarResult>,
): MajorFortuneV02Result["status"] {
  const list = Object.values(pillars);
  if (list.some((p) => p.status === "unavailable" || p.reasonCodes.includes("mutex-violation"))) {
    return "unavailable";
  }
  if (list.some((p) => p.status === "partial")) return "partial";
  return "available";
}

export interface AnalyzeMajorFortuneV02Options {
  school: ZiweiSchool;
  /** Entry/core/exit metadata only — must not affect numerics. */
  yearInCycle?: number;
}

/**
 * Candidate Major Fortune V0.2 four-pillar scorer.
 * Isolated from V0.1; not wired to production routing or UI.
 */
export function analyzeMajorFortuneV02(
  chart: ChartData,
  options: AnalyzeMajorFortuneV02Options,
): MajorFortuneV02Result {
  void options.yearInCycle;
  const diagnostics = emptyMajorFortuneV02Diagnostics();
  const loaded = loadMajorFortuneKnowledgeV02();

  const unavailableVersions = {
    contractVersion: "0.2.0",
    engineVersion: "0.2.0-candidate",
    knowledgeVersion: "unavailable",
    formulaVersion: "unavailable",
    calculationPolicyProfileVersion: null as string | null,
  };

  if (!loaded.ok) {
    diagnostics.invalidKnowledge.push(...loaded.issues.map((i) => `${i.path}:${i.message}`));
    const pillars = Object.fromEntries(
      PILLAR_ORDER.map((id) => [id, emptyPillar(0)]),
    ) as MajorFortuneV02Result["pillars"];
    return {
      module: "major-fortune",
      school: options.school,
      status: "unavailable",
      cycle: null,
      score: null,
      band: null,
      scoreState: "unavailable",
      pillars,
      natalResilience: {
        state: null,
        numericEffect: null,
        factIds: [],
        supportingFacts: [],
        blockingFacts: [],
      },
      versions: unavailableVersions,
      diagnostics,
      trace: {
        preClampScore: null,
        pillarRaws: {
          "thien-thoi": 0,
          "dia-loi": 0,
          "nhan-hoa": 0,
          "tu-hoa-sat-tinh": 0,
        },
        pillarCapped: {
          "thien-thoi": 0,
          "dia-loi": 0,
          "nhan-hoa": 0,
          "tu-hoa-sat-tinh": 0,
        },
      },
    };
  }

  const knowledge = loaded.knowledge;
  const versions = {
    contractVersion: knowledge.manifest.contractVersion,
    engineVersion: knowledge.manifest.engineVersion,
    knowledgeVersion: knowledge.manifest.knowledgeVersion,
    formulaVersion: knowledge.manifest.formulaVersion,
    calculationPolicyProfileVersion: null as string | null,
  };

  const ctx = resolveMajorFortuneV02Context(chart, options.school, knowledge, diagnostics);
  if (!ctx) {
    const pillars = Object.fromEntries(
      knowledge.formula.pillars.map((p) => [
        p.pillarId,
        {
          cap: p.cap,
          rawDelta: 0,
          cappedDelta: 0,
          status: "unavailable" as const,
          contributions: [],
          reasonCodes: diagnostics.noActiveMajorFortune.length
            ? (["no-active-major-fortune"] as const)
            : (["invalid-resolved-context"] as const),
          matchedStructuralRuleIds: [],
        },
      ]),
    ) as unknown as MajorFortuneV02Result["pillars"];

    return {
      module: "major-fortune",
      school: options.school,
      status: "unavailable",
      cycle: null,
      score: null,
      band: null,
      scoreState: "unavailable",
      pillars,
      natalResilience: {
        state: null,
        numericEffect: null,
        factIds: [],
        supportingFacts: [],
        blockingFacts: [],
      },
      versions,
      diagnostics,
      trace: {
        preClampScore: null,
        pillarRaws: {
          "thien-thoi": 0,
          "dia-loi": 0,
          "nhan-hoa": 0,
          "tu-hoa-sat-tinh": 0,
        },
        pillarCapped: {
          "thien-thoi": 0,
          "dia-loi": 0,
          "nhan-hoa": 0,
          "tu-hoa-sat-tinh": 0,
        },
      },
    };
  }

  const pillars = {} as MajorFortuneV02Result["pillars"];
  const pillarRaws = {} as Record<MajorFortuneV02PillarId, number>;
  const pillarCapped = {} as Record<MajorFortuneV02PillarId, number>;
  let executableContributionCount = 0;
  let signalMass = 0;

  for (const pillarDef of knowledge.formula.pillars) {
    const bundle = collectPillarMatches(pillarDef.pillarId, chart, ctx, knowledge, diagnostics);
    const raw = bundle.contributions.reduce((sum, c) => sum + c.rawDelta, 0);
    const { cappedDelta, clipped: _clipped } = applyPillarClip(raw, pillarDef.cap);
    void _clipped;
    if (isCappedDeltaOutOfBounds(cappedDelta, pillarDef.cap)) {
      throw new Error(`pillar ${pillarDef.pillarId} cappedDelta exceeds cap`);
    }

    executableContributionCount += bundle.contributions.length;
    signalMass += bundle.contributions.reduce((s, c) => s + Math.abs(c.rawDelta), 0);

    const blockedOnly =
      bundle.contributions.length === 0 && bundle.structuralMatches.length > 0;

    let status: MajorFortuneV02PillarResult["status"] = "available";
    if (bundle.mutexViolations.length > 0) status = "unavailable";
    else if (blockedOnly) status = "partial";

    pillars[pillarDef.pillarId] = {
      cap: pillarDef.cap,
      rawDelta: roundToDecimals(raw, knowledge.formula.scorePrecisionDecimals),
      cappedDelta: roundToDecimals(cappedDelta, knowledge.formula.scorePrecisionDecimals),
      status,
      contributions: bundle.contributions,
      reasonCodes: bundle.reasonCodes,
      matchedStructuralRuleIds: bundle.structuralMatches.map((m) => m.rule.ruleId),
    };
    pillarRaws[pillarDef.pillarId] = pillars[pillarDef.pillarId].rawDelta;
    pillarCapped[pillarDef.pillarId] = pillars[pillarDef.pillarId].cappedDelta;
  }

  const moduleStatus = resolveModuleStatusFromPillars(pillars);
  const hasPartialData = moduleStatus === "partial";
  const unavailable = moduleStatus === "unavailable";

  const netCappedDelta = PILLAR_ORDER.reduce((s, id) => s + pillarCapped[id], 0);
  const preClamp = knowledge.formula.baseScore + netCappedDelta;
  const score = unavailable
    ? null
    : roundToDecimals(clamp(preClamp, 0, 100), knowledge.formula.scorePrecisionDecimals);
  const band =
    score == null
      ? null
      : bandForScore(score, [...knowledge.bands.bands] as Array<{
          bandId: MajorFortuneV02BandId;
          minInclusive: number;
          maxInclusive: number;
        }>);

  const scoreState = classifyMajorFortuneV02ScoreState({
    matchedExecutableContributionCount: executableContributionCount,
    netCappedDelta,
    signalMass,
    hasPartialData,
    unavailable,
  });

  return {
    module: "major-fortune",
    school: options.school,
    status: moduleStatus,
    cycle: {
      cycleIndex: ctx.cycleIndex,
      startAge: ctx.startAge,
      endAge: ctx.endAge,
      activePalaceIndex: ctx.activePalaceIndex,
    },
    score,
    band,
    scoreState,
    pillars,
    natalResilience: {
      state: "unevaluated",
      numericEffect: null,
      factIds: [],
      supportingFacts: [],
      blockingFacts: [],
    },
    versions,
    diagnostics,
    trace: {
      preClampScore:
        score == null
          ? null
          : roundToDecimals(preClamp, knowledge.formula.scorePrecisionDecimals),
      pillarRaws,
      pillarCapped,
    },
  };
}
