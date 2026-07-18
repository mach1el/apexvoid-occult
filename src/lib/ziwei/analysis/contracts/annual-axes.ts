/**
 * Module: annual-axes (6 trục khí vận theo năm xem)
 *
 * V0.1 — deterministic numeric scoring, evidence trace, diagnostics.
 * Interpretation prose, predictions, UI radar, monthly scoring, Major
 * Fortune scoring and composite temporal scoring are out of scope here.
 *
 * Scope:
 * - phụ thuộc năm xem;
 * - dùng annual facts theo school profile;
 * - gồm 6 domain: sức khỏe, gia đạo, tài lộc, công việc, giao hữu, tình duyên;
 * - không tái sử dụng score 12 cung bằng phép cộng trọng số cơ học;
 * - hệ số kỹ thuật hiện tại đều `experimental`, có thể thay đổi.
 */

import type { ZiweiAnalysisModule } from "./common";
import type { AnnualAxesResult } from "../modules/annual-axes";

export const ANNUAL_AXES_MODULE: ZiweiAnalysisModule = "annual-axes";

export type AnnualAxisDomain =
  | "health"
  | "family"
  | "wealth"
  | "career"
  | "social"
  | "romance";

export type AnnualAxesContract = {
  module: "annual-axes";
  domains: readonly AnnualAxisDomain[];
  outputSchema: AnnualAxesResult;
};

export const ANNUAL_AXIS_DOMAINS: readonly AnnualAxisDomain[] = [
  "health",
  "family",
  "wealth",
  "career",
  "social",
  "romance",
] as const;
