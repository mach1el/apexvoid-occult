/**
 * Feature flag for palace-overview V1.
 * Default ON. Kill-switch via VITE_ZIWEI_PALACE_OVERVIEW_V1=false, or
 * ?ziweiPalaceOverviewV1=0 (persisted in sessionStorage) for a per-session
 * opt-out; ?ziweiPalaceOverviewV1=1 persists a per-session opt-in override.
 */
export const PALACE_OVERVIEW_FEATURE_FLAG = "ziweiPalaceOverviewV1";

function readSessionFlag(
  flag: string,
  envValue: string | undefined,
  defaultOn: boolean,
): boolean {
  if (envValue === "false") return false;
  if (envValue === "true" && typeof window === "undefined") return true;
  if (typeof window === "undefined") return defaultOn;
  try {
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(flag);
    if (queryValue === "0" || queryValue === "1") {
      window.sessionStorage.setItem(flag, queryValue);
    }
    const stored = window.sessionStorage.getItem(flag);
    if (stored === "0") return false;
    if (stored === "1") return true;
    if (envValue === "true") return true;
    if (envValue === "false") return false;
    return defaultOn;
  } catch {
    return defaultOn;
  }
}

export function isPalaceOverviewV1Enabled(): boolean {
  return readSessionFlag(
    PALACE_OVERVIEW_FEATURE_FLAG,
    import.meta.env.VITE_ZIWEI_PALACE_OVERVIEW_V1,
    true,
  );
}

/**
 * Annual Axes module visibility — default ON.
 * Kill-switch: ?ziweiAnnualAxesV03=0
 */
export const ANNUAL_AXES_V03_FEATURE_FLAG = "ziweiAnnualAxesV03";
export function isAnnualAxesV03Enabled(): boolean {
  return readSessionFlag(
    ANNUAL_AXES_V03_FEATURE_FLAG,
    import.meta.env.VITE_ZIWEI_ANNUAL_AXES_V03,
    true,
  );
}

/** @deprecated Use `ANNUAL_AXES_V03_FEATURE_FLAG` instead. */
export const ANNUAL_AXES_V02_FEATURE_FLAG = ANNUAL_AXES_V03_FEATURE_FLAG;
/** @deprecated Use `isAnnualAxesV03Enabled` instead. */
export const isAnnualAxesV02Enabled = isAnnualAxesV03Enabled;

export const HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG = "ziweiHuyenKhiPreviewV01";

export function isHuyenKhiPreviewV01Enabled(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01 === "false") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG);
    if (queryValue === "0" || queryValue === "1") {
      window.sessionStorage.setItem(HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG, queryValue);
    }
    const stored = window.sessionStorage.getItem(HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG);
    if (stored === "0") return false;
    if (stored === "1") return true;
    return import.meta.env.VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01 === "true";
  } catch {
    return false;
  }
}
