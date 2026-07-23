import type { ChartData } from "@/types/chart";
import type { ZiweiSchool } from "../../../../facts";
import {
  MAJOR_FORTUNE_ORDINAL_PILLAR_IDS,
  type MajorFortuneOrdinalPillarId,
} from "../../../../knowledge/major-fortune-scoring/v0.3-ordinal";
import type {
  MajorFortuneOrdinalEvidence,
  MajorFortuneOrdinalEvaluationInput,
  MajorFortuneOrdinalPillarContext,
} from "../types";
import { evaluateMajorFortuneOrdinal } from "../evaluate";
import { resolveAdapterContext } from "./resolve-context";
import { emitThienThoi } from "./emit-thien-thoi";
import { emitDiaLoi } from "./emit-dia-loi";
import { emitNhanHoa } from "./emit-nhan-hoa";
import { emitTuHoaSatTinh } from "./emit-tu-hoa";
import { validateAdapterEvidence } from "./validate-evidence";
import type {
  MajorFortuneOrdinalAdapterAnalysisResult,
  MajorFortuneOrdinalAdapterBuildResult,
} from "./types";

function emptyPillarContexts(): Record<MajorFortuneOrdinalPillarId, MajorFortuneOrdinalPillarContext> {
  return {
    "thien-thoi": { availability: "unavailable", reasonCodes: ["no-context"] },
    "dia-loi": { availability: "unavailable", reasonCodes: ["no-context"] },
    "nhan-hoa": { availability: "unavailable", reasonCodes: ["no-context"] },
    "tu-hoa-sat-tinh": { availability: "unavailable", reasonCodes: ["no-context"] },
  };
}

/**
 * Adapt ChartData → normalized Major Fortune V0.3 ordinal evaluation input.
 * Does not invoke the ordinal evaluator.
 */
export function adaptChartToMajorFortuneOrdinalInput(
  chart: ChartData,
  options: { school: ZiweiSchool },
): MajorFortuneOrdinalAdapterBuildResult {
  const { context, diagnostics } = resolveAdapterContext(chart, options.school);

  if (!context) {
    return {
      cycle: null,
      evaluationInput: null,
      emittedEvidence: [],
      pillarContexts: emptyPillarContexts(),
      adapterDiagnostics: diagnostics,
    };
  }

  const thien = emitThienThoi(context, diagnostics);
  const dia = emitDiaLoi(context, diagnostics);
  const nhan = emitNhanHoa(context, diagnostics);
  const tu = emitTuHoaSatTinh(context, diagnostics);

  const emittedEvidence: MajorFortuneOrdinalEvidence[] = [
    ...thien.evidence,
    ...dia.evidence,
    ...nhan.evidence,
    ...tu.evidence,
  ];

  const issues = validateAdapterEvidence(emittedEvidence);
  for (const issue of issues) {
    diagnostics.evidenceValidationErrors.push(`${issue.evidenceId}:${issue.message}`);
  }

  // Fail closed: do not pass invalid evidence to the evaluator.
  const safeEvidence = issues.length === 0 ? emittedEvidence : [];
  if (issues.length > 0) {
    diagnostics.notes.push("evidence-validation-failed:evaluator-input-cleared");
  }

  const pillarContexts: Record<MajorFortuneOrdinalPillarId, MajorFortuneOrdinalPillarContext> = {
    "thien-thoi": thien.context,
    "dia-loi": dia.context,
    "nhan-hoa": nhan.context,
    "tu-hoa-sat-tinh": tu.context,
  };

  // Ensure all pillars present
  for (const id of MAJOR_FORTUNE_ORDINAL_PILLAR_IDS) {
    if (!pillarContexts[id]) {
      pillarContexts[id] = { availability: "unavailable", reasonCodes: ["missing-emitter"] };
    }
  }

  const evaluationInput: MajorFortuneOrdinalEvaluationInput = {
    school: options.school,
    evidence: safeEvidence,
    pillarContexts,
  };

  return {
    cycle: context.cycle,
    evaluationInput,
    emittedEvidence: safeEvidence,
    pillarContexts,
    adapterDiagnostics: diagnostics,
  };
}

/**
 * Research-only end-to-end analysis: ChartData → adapter → pure ordinal evaluator.
 */
export function analyzeMajorFortuneOrdinalV03(
  chart: ChartData,
  options: { school: ZiweiSchool; yearInCycle?: number },
): MajorFortuneOrdinalAdapterAnalysisResult {
  const build = adaptChartToMajorFortuneOrdinalInput(chart, { school: options.school });
  if (!build.evaluationInput) {
    return {
      module: "major-fortune",
      model: "v0.3-ordinal-adapter",
      school: options.school,
      build,
      evaluation: null,
    };
  }

  const input: MajorFortuneOrdinalEvaluationInput = {
    ...build.evaluationInput,
    yearInCycle: options.yearInCycle,
  };
  const evaluation = evaluateMajorFortuneOrdinal(input);
  return {
    module: "major-fortune",
    model: "v0.3-ordinal-adapter",
    school: options.school,
    build,
    evaluation,
  };
}
