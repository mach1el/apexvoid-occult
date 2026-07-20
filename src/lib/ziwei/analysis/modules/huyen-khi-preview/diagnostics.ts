import type {
  HuyenKhiPreviewDiagnostic,
  HuyenKhiPreviewDiagnosticCode,
} from "./types";

export function makeDiagnostic(
  code: HuyenKhiPreviewDiagnosticCode,
  message: string,
  extra?: { palaceIndex?: number; factId?: string },
): HuyenKhiPreviewDiagnostic {
  return {
    code,
    message,
    ...extra,
  };
}

/** Stable sort: code, then palaceIndex, then factId, then message. */
export function sortDiagnostics(
  diagnostics: HuyenKhiPreviewDiagnostic[],
): HuyenKhiPreviewDiagnostic[] {
  return [...diagnostics].sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    const ai = a.palaceIndex ?? -1;
    const bi = b.palaceIndex ?? -1;
    if (ai !== bi) return ai - bi;
    const af = a.factId ?? "";
    const bf = b.factId ?? "";
    if (af !== bf) return af.localeCompare(bf);
    return a.message.localeCompare(b.message);
  });
}
