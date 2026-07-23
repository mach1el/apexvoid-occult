import type { MajorFortuneAdapterDiagnostics, MajorFortuneAdapterResolvedContext, AdapterEvidenceDraft } from "./types";
import type { MajorFortuneOrdinalPillarContext } from "../types";
import adapterPolicy from "./policy/adapter-policy.v0.3.json";

const SRC = ["SRC-MF-V03-ADAPTER-AUX"];
const CLM = ["CLM-MF-V03-ADAPTER-AUX"];

interface AuxSet {
  setId: string;
  mode: string;
  members: string[];
}

function setComplete(present: ReadonlySet<string>, set: AuxSet): boolean {
  if (set.mode === "singleton") return set.members.some((m) => present.has(m));
  return set.members.every((m) => present.has(m));
}

function setPartial(present: ReadonlySet<string>, set: AuxSet): boolean {
  if (set.mode === "singleton") return false;
  const hits = set.members.filter((m) => present.has(m)).length;
  return hits > 0 && hits < set.members.length;
}

export function emitNhanHoa(
  ctx: MajorFortuneAdapterResolvedContext,
  diagnostics: MajorFortuneAdapterDiagnostics,
): { evidence: AdapterEvidenceDraft[]; context: MajorFortuneOrdinalPillarContext } {
  const present = ctx.presentNatalStarNames;
  const evidence: AdapterEvidenceDraft[] = [];
  const cycleKey = `c${ctx.cycle.cycleIndex}-p${ctx.cycle.activePalaceIndex}`;

  const groups: Array<{ direction: "support" | "pressure"; sets: AuxSet[] }> = [
    { direction: "support", sets: adapterPolicy.auxiliarySets.support as AuxSet[] },
    { direction: "pressure", sets: adapterPolicy.auxiliarySets.pressure as AuxSet[] },
  ];

  for (const group of groups) {
    for (const set of group.sets) {
      if (setPartial(present, set)) {
        diagnostics.partialPairSets.push(`${set.setId}:${set.members.join("+")}`);
        continue;
      }
      if (!setComplete(present, set)) continue;

      const membersPresent = set.members.filter((m) => present.has(m));
      evidence.push({
        evidenceId: `mf-v03-aux-${cycleKey}-${set.setId}`,
        physicalFactId: `auxiliary-set:${ctx.cycle.activePalaceIndex}:${set.setId}:${membersPresent.join("+")}`,
        physicalFactKind: "auxiliary-set-member",
        evidenceClusterId: `cluster-aux:${cycleKey}:${set.setId}`,
        pillarId: "nhan-hoa",
        signalFamilyId: "support-pressure-auxiliary-sets",
        direction: group.direction,
        strength: "normal",
        temporalScope: "major-fortune",
        factIds: membersPresent.map((m) => `star:${m}`),
        sourceIds: SRC,
        claimIds: CLM,
        policyStatus: "research-admitted",
        schoolScope: ["nam-phai", "trung-chau"],
        reasonCode: `auxiliary-set:${set.setId}`,
      });
    }
  }

  return {
    evidence,
    context: { availability: "available" },
  };
}
