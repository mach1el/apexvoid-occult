/**
 * Zi Wei Analysis — Calculation Core is separate; modules interpret natal facts.
 */

export type {
  ZiweiAnalysisModule,
  ZiweiAnalysisStatus,
} from "./contracts/common";
export {
  getAnalysisStatus,
  ANALYSIS_MODULES,
} from "./contracts/common";

export type { PalaceOverviewContract } from "./contracts/palace-overview";
export { PALACE_OVERVIEW_MODULE } from "./contracts/palace-overview";

export type {
  AnnualAxesContract,
  AnnualAxisDomain,
} from "./contracts/annual-axes";
export {
  ANNUAL_AXES_MODULE,
  ANNUAL_AXIS_DOMAINS,
} from "./contracts/annual-axes";

export type {
  MajorFortuneContract,
  MajorFortuneDomain,
} from "./contracts/major-fortune";
export {
  MAJOR_FORTUNE_MODULE,
  MAJOR_FORTUNE_DOMAINS,
} from "./contracts/major-fortune";

export type { MonthlyFlowContract } from "./contracts/monthly-flow";
export { MONTHLY_FLOW_MODULE } from "./contracts/monthly-flow";

export * from "./facts";
export * from "./frame";
export * from "./knowledge";
export * from "./modules/palace-overview";
export * from "./modules/annual-axes";
export * from "./modules/major-fortune";
export {
  buildHuyenKhiPreview,
  emptyDimensionStates,
  HUYEN_KHI_DIMENSION_IDS,
  makeDiagnostic,
  sortDiagnostics,
  oppositePalaceIndex as huyenKhiOppositePalaceIndex,
  trinePalaceIndexes as huyenKhiTrinePalaceIndexes,
} from "./modules/huyen-khi-preview";
export type {
  HuyenKhiDimensionId,
  HuyenKhiDimensionStates,
  HuyenKhiPreviewDiagnostic,
  HuyenKhiPreviewDiagnosticCode,
  HuyenKhiPreviewPalace,
  HuyenKhiPreviewResult,
  HuyenKhiPreviewStar,
  HuyenKhiPreviewTransformation,
  HuyenKhiPreviewVoidMarker,
} from "./modules/huyen-khi-preview";
export {
  isPalaceOverviewV1Enabled,
  PALACE_OVERVIEW_FEATURE_FLAG,
  isAnnualAxesV04Enabled,
  ANNUAL_AXES_V04_FEATURE_FLAG,
  isAnnualAxesV03Enabled,
  ANNUAL_AXES_V03_FEATURE_FLAG,
  isAnnualAxesV02Enabled,
  ANNUAL_AXES_V02_FEATURE_FLAG,
  isHuyenKhiPreviewV01Enabled,
  HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG,
  isAnnualAxesV05Enabled,
  ANNUAL_AXES_V05_FEATURE_FLAG,
} from "./feature-flags";
