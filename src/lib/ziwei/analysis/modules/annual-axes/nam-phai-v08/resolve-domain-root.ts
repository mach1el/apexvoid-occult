import type { ChartData } from "@/types/chart";
import type { AnnualAxisDomain } from "../../../contracts/annual-axes";
import type { AnnualAxesKnowledgeV08NamPhai } from "../../../knowledge/annual-axes/v0.8";
import { buildNamePalaceIndex } from "../nam-phai-v04/routing";

export interface V08DomainRootAnchor {
  domain: AnnualAxisDomain;
  anchorPalaceIndex: number;
  anchorPalaceName: string;
  anchorBranch: string;
  provenance: string;
}

export type ResolveDomainRootV08Result =
  | { ok: true; anchor: V08DomainRootAnchor }
  | { ok: false; reasonCodes: string[] };

/**
 * Resolve the single configured primary natal root for a domain.
 * Uses knowledge.domainRoots — never hardcodes palace-name switches.
 */
export function resolveDomainRootV08(
  chart: ChartData,
  domain: AnnualAxisDomain,
  knowledge: AnnualAxesKnowledgeV08NamPhai,
): ResolveDomainRootV08Result {
  const root = knowledge.domainRoots.roots[domain];
  if (!root?.palaceName) {
    return { ok: false, reasonCodes: ["missing-domain-root-config"] };
  }

  const matches = chart.palaces.filter((p) => p.name === root.palaceName);
  if (matches.length === 0) {
    return { ok: false, reasonCodes: ["missing-domain-anchor"] };
  }
  if (matches.length > 1) {
    return { ok: false, reasonCodes: ["ambiguous-domain-anchor"] };
  }

  const palace = matches[0]!;
  if (
    palace.index == null ||
    !palace.name ||
    !palace.branch ||
    typeof palace.index !== "number"
  ) {
    return { ok: false, reasonCodes: ["incomplete-anchor-identity"] };
  }

  // Sanity: name index map must agree (unique natal name policy).
  const nameIndex = buildNamePalaceIndex(chart).get(root.palaceName);
  if (nameIndex !== palace.index) {
    return { ok: false, reasonCodes: ["anchor-identity-unverified-v08"] };
  }

  return {
    ok: true,
    anchor: {
      domain,
      anchorPalaceIndex: palace.index,
      anchorPalaceName: palace.name,
      anchorBranch: palace.branch,
      provenance: knowledge.domainRoots.provenance,
    },
  };
}
