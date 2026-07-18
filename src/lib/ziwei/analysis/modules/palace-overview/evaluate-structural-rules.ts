import type { NatalZiweiFact, ZiweiBrightness } from "../../facts";
import type { StaticFrame } from "../../frame";
import type { PalaceOverviewKnowledgeV1 } from "../../knowledge";
import type { StructuralRuleRecord } from "../../knowledge/schema";
import {
  emptyAxes,
  type PalaceEvidence,
  type PalaceEvidenceAxes,
  type PalaceOverviewDiagnostics,
} from "./types";

const DEFAULT_GOOD = ["Miếu", "Vượng", "Đắc"];

interface MajorInFrame {
  fact: NatalZiweiFact;
  name: string;
  brightness: ZiweiBrightness;
}

function majorsInFrame(
  frame: StaticFrame,
  factsByPalace: Map<number, NatalZiweiFact[]>,
): MajorInFrame[] {
  const out: MajorInFrame[] = [];
  for (const node of frame.nodes) {
    for (const fact of factsByPalace.get(node.palaceIndex) ?? []) {
      if (fact.kind !== "star" || fact.starClass !== "major") continue;
      if (!fact.canonicalStarName) continue;
      out.push({
        fact,
        name: fact.canonicalStarName,
        brightness: fact.brightness ?? "Bình",
      });
    }
  }
  return out;
}

function transformsInFrame(
  frame: StaticFrame,
  factsByPalace: Map<number, NatalZiweiFact[]>,
): NatalZiweiFact[] {
  const out: NatalZiweiFact[] = [];
  for (const node of frame.nodes) {
    for (const fact of factsByPalace.get(node.palaceIndex) ?? []) {
      if (fact.kind === "transformation") out.push(fact);
    }
  }
  return out;
}

function findParticipants(
  rule: StructuralRuleRecord,
  majors: MajorInFrame[],
): MajorInFrame[] | null {
  const found: MajorInFrame[] = [];
  for (const name of rule.participants) {
    const hit = majors.find((m) => m.name === name);
    if (!hit) return null;
    found.push(hit);
  }
  return found;
}

function evaluateTuPhu(
  rule: StructuralRuleRecord,
  participants: MajorInFrame[],
): PalaceEvidenceAxes {
  const cond = rule.conditions;
  const good = new Set(
    (cond.goodBrightness as string[] | undefined) ?? DEFAULT_GOOD,
  );
  const minGood = Number(cond.minGoodBrightness ?? 2);
  const goodCount = participants.filter((p) => good.has(p.brightness)).length;
  let axes: PalaceEvidenceAxes = { ...rule.baseAxes };
  if (goodCount < minGood) {
    axes = {
      ...axes,
      support: axes.support * Number(cond.weakSupportFactor ?? 0.5),
      stability: axes.stability * Number(cond.weakStabilityFactor ?? 0.5),
    };
  }
  return axes;
}

function evaluateCoNguyet(
  rule: StructuralRuleRecord,
  participants: MajorInFrame[],
): PalaceEvidenceAxes {
  const cond = rule.conditions;
  const hamCount = participants.filter((p) => p.brightness === "Hãm").length;
  let axes: PalaceEvidenceAxes = { ...rule.baseAxes };
  if (hamCount >= Number(cond.hamThreshold ?? 2)) {
    axes = {
      support: axes.support * Number(cond.supportFactorWhenHam ?? 0.5),
      pressure: axes.pressure + Number(cond.pressureDeltaWhenHam ?? 0),
      stability: axes.stability + Number(cond.stabilityDeltaWhenHam ?? 0),
      activation: axes.activation,
    };
  }
  return axes;
}

function evaluateSatPhaTham(
  rule: StructuralRuleRecord,
  participants: MajorInFrame[],
  transforms: NatalZiweiFact[],
): PalaceEvidenceAxes {
  const cond = rule.conditions;
  let axes: PalaceEvidenceAxes = { ...rule.baseAxes };
  const hamCount = participants.filter((p) => p.brightness === "Hãm").length;
  if (hamCount >= Number(cond.hamThreshold ?? 2)) {
    axes = {
      ...axes,
      pressure: axes.pressure + Number(cond.pressureDeltaWhenHam ?? 0),
      stability: axes.stability + Number(cond.stabilityDeltaWhenHam ?? 0),
    };
  }

  const good = new Set(
    (cond.goodBrightness as string[] | undefined) ?? DEFAULT_GOOD,
  );
  const goodCount = participants.filter((p) => good.has(p.brightness)).length;
  const participantNames = new Set(participants.map((p) => p.name));
  const benefic = new Set(
    (cond.beneficTransforms as string[] | undefined) ?? ["Lộc", "Quyền", "Khoa"],
  );

  const hasBeneficOnParticipant = transforms.some(
    (t) =>
      t.targetStar &&
      participantNames.has(t.targetStar) &&
      t.transformation &&
      benefic.has(t.transformation),
  );
  if (
    goodCount >= Number(cond.goodThreshold ?? 2) &&
    hasBeneficOnParticipant
  ) {
    axes = {
      ...axes,
      support: axes.support + Number(cond.supportDeltaWhenGoodTransform ?? 0),
      activation:
        axes.activation + Number(cond.activationDeltaWhenGoodTransform ?? 0),
    };
  }

  const hasKyOnParticipant = transforms.some(
    (t) =>
      t.transformation === "Kỵ" &&
      t.targetStar &&
      participantNames.has(t.targetStar),
  );
  if (hasKyOnParticipant) {
    axes = {
      ...axes,
      pressure: axes.pressure + Number(cond.pressureDeltaWhenKy ?? 0),
      activation: axes.activation + Number(cond.activationDeltaWhenKy ?? 0),
    };
  }

  return axes;
}

export function evaluateStructuralRules(input: {
  frame: StaticFrame;
  factsByPalace: Map<number, NatalZiweiFact[]>;
  knowledge: PalaceOverviewKnowledgeV1;
  diagnostics: PalaceOverviewDiagnostics;
  focusPalaceName: string;
  focusPalaceBranch: string;
}): PalaceEvidence[] {
  const { frame, factsByPalace, knowledge, diagnostics } = input;
  const majors = majorsInFrame(frame, factsByPalace);
  const transforms = transformsInFrame(frame, factsByPalace);
  const focus = frame.nodes.find((n) => n.role === "focus");
  if (!focus) return [];

  const status =
    knowledge.profile.status === "approved" ? "approved" : "experimental";
  const out: PalaceEvidence[] = [];

  for (const rule of knowledge.structuralRules.rules) {
    const participants = findParticipants(rule, majors);
    if (!participants) continue;

    let axes: PalaceEvidenceAxes = emptyAxes();
    if (rule.id === "rule-tu-phu-vu-tuong") {
      axes = evaluateTuPhu(rule, participants);
    } else if (rule.id === "rule-co-nguyet-dong-luong") {
      axes = evaluateCoNguyet(rule, participants);
    } else if (rule.id === "rule-sat-pha-tham") {
      axes = evaluateSatPhaTham(rule, participants, transforms);
    } else {
      continue;
    }

    const factIds = participants.map((p) => p.fact.id);
    diagnostics.ruleHits.push({
      palaceName: input.focusPalaceName,
      ruleId: rule.id,
      factIds,
    });

    out.push({
      id: `ev:rule:${rule.id}:${focus.palaceIndex}`,
      category: "structural-rule",
      factIds,
      ruleId: rule.id,
      palaceRole: "focus",
      palaceName: focus.palaceName,
      palaceBranch: focus.palaceBranch,
      axes,
      label: rule.label,
      explanationKey: `rule.${rule.id}`,
      sourceIds: knowledge.structuralRules.sourceIds,
      knowledgeStatus: status,
      sourceKind: "rule",
    });
  }

  return out;
}
